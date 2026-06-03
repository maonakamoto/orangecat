/**
 * Webhook delivery service — enqueue + retry-schedule + outcome capture.
 *
 * The firing path is:
 *   1. /api/v1 entity POST succeeds → entityPostHandler calls
 *      enqueueWebhookEvent (fire-and-forget, never blocks user response).
 *   2. enqueueWebhookEvent fans out across active endpoints for the
 *      bound actor, inserting one webhook_deliveries row per endpoint
 *      with status='pending' and next_attempt_at=now.
 *   3. /api/cron/webhook-worker polls due rows every minute, POSTs
 *      with the X-OrangeCat-Signature header, records the outcome.
 *   4. Failed deliveries reschedule with exponential backoff (capped
 *      attempt count); succeeded ones flip to status='delivered'.
 *
 * The receiving integration is expected to be idempotent on event_id —
 * we surface it in the payload + the X-OrangeCat-Event-Id header so
 * worker retries do not double-affect downstream state.
 *
 * Created: 2026-06-03
 */

import { randomUUID } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/utils/logger';
import { DATABASE_TABLES } from '@/config/database-tables';
import { listActiveEndpointsForActor } from './webhookEndpointsService';

export interface DeliveryRow {
  id: string;
  endpoint_id: string;
  event_type: string;
  event_id: string;
  payload: unknown;
  status: 'pending' | 'delivered' | 'failed';
  response_status: number | null;
  response_body: string | null;
  attempt_count: number;
  last_attempt_at: string | null;
  next_attempt_at: string | null;
  created_at: string;
}

/** Cap response body storage so misbehaving receivers can't bloat the table. */
const MAX_RESPONSE_BODY_BYTES = 4 * 1024;

/**
 * Exponential backoff schedule (minutes from the failing attempt):
 *   attempt 1 → 1m, 2 → 5m, 3 → 25m, 4 → 2h, 5 → 12h, 6 → 24h, then fail.
 * After MAX_ATTEMPTS the delivery flips to status='failed' and stops.
 */
const MAX_ATTEMPTS = 6;
const BACKOFF_MINUTES = [1, 5, 25, 120, 720, 1440];

export function computeNextAttempt(
  attemptCount: number,
  now: Date = new Date()
): { nextAttemptAt: Date | null; shouldFail: boolean } {
  if (attemptCount >= MAX_ATTEMPTS) {
    return { nextAttemptAt: null, shouldFail: true };
  }
  const minutes = BACKOFF_MINUTES[attemptCount - 1] ?? BACKOFF_MINUTES[BACKOFF_MINUTES.length - 1];
  return {
    nextAttemptAt: new Date(now.getTime() + minutes * 60_000),
    shouldFail: false,
  };
}

export function truncateResponseBody(body: string | null | undefined): string | null {
  if (body === null || body === undefined) {
    return null;
  }
  if (body.length <= MAX_RESPONSE_BODY_BYTES) {
    return body;
  }
  return body.slice(0, MAX_RESPONSE_BODY_BYTES) + '\n…[truncated]';
}

/**
 * Enqueue a webhook event for fan-out to every active endpoint bound to
 * the actor. Fire-and-forget from the API handler: callers MUST not
 * await this from the user response path — wrap in `void enqueue...`
 * or `.catch(...)`. We swallow errors here too as a belt-and-braces.
 *
 * Returns the number of delivery rows inserted (one per active endpoint).
 */
export async function enqueueWebhookEvent(params: {
  actorId: string;
  eventType: string;
  payload: unknown;
}): Promise<number> {
  try {
    const endpoints = await listActiveEndpointsForActor(params.actorId);
    if (endpoints.length === 0) {
      return 0;
    }

    const eventId = randomUUID();
    const filtered = endpoints.filter(
      ep =>
        !ep.event_types || ep.event_types.length === 0 || ep.event_types.includes(params.eventType)
    );
    if (filtered.length === 0) {
      return 0;
    }

    const rows = filtered.map(ep => ({
      endpoint_id: ep.id,
      event_type: params.eventType,
      event_id: eventId,
      payload: params.payload,
      status: 'pending' as const,
      next_attempt_at: new Date().toISOString(),
    }));

    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin.from(DATABASE_TABLES.WEBHOOK_DELIVERIES) as any).insert(rows);
    if (error) {
      logger.error('enqueueWebhookEvent: insert failed', { error, eventType: params.eventType });
      return 0;
    }
    return rows.length;
  } catch (error) {
    logger.error('enqueueWebhookEvent: unhandled', {
      error: error instanceof Error ? error.message : error,
    });
    return 0;
  }
}

/**
 * List the most recent deliveries for a single endpoint. Powers the
 * /settings/integrations deliveries drawer. Caller MUST have already
 * verified the endpoint belongs to the requesting user (route does this
 * with a join through webhook_endpoints.user_id).
 */
export async function listRecentDeliveriesForEndpoint(
  endpointId: string,
  limit: number = 50
): Promise<DeliveryRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from(DATABASE_TABLES.WEBHOOK_DELIVERIES)
    .select('*')
    .eq('endpoint_id', endpointId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    logger.error('listRecentDeliveriesForEndpoint: query failed', { error, endpointId });
    return [];
  }
  return (data ?? []) as DeliveryRow[];
}

/**
 * Pick up to `limit` deliveries that are due now. The worker calls this
 * once per cron invocation; rows are returned newest-first so a slow
 * receiver can't starve fresher events.
 */
export async function pickDueDeliveries(
  limit: number,
  now: Date = new Date()
): Promise<DeliveryRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from(DATABASE_TABLES.WEBHOOK_DELIVERIES)
    .select('*')
    .eq('status', 'pending')
    .lte('next_attempt_at', now.toISOString())
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    logger.error('pickDueDeliveries: query failed', { error });
    return [];
  }
  return (data ?? []) as DeliveryRow[];
}

/** Atomic claim: flip pending → in-flight by bumping attempt_count + last_attempt_at.
 *  Returns true if we won the row (no other worker already claimed it).
 *  We don't change status here — only attempt_count is the claim signal,
 *  so a failed POST can still resume with a richer backoff schedule.
 */
export async function claimDelivery(deliveryId: string, expectedAttempt: number): Promise<boolean> {
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin.from(DATABASE_TABLES.WEBHOOK_DELIVERIES) as any)
    .update({ attempt_count: expectedAttempt + 1, last_attempt_at: new Date().toISOString() })
    .eq('id', deliveryId)
    .eq('attempt_count', expectedAttempt)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();

  if (error) {
    logger.warn('claimDelivery: update failed', { error, deliveryId });
    return false;
  }
  return !!data;
}

export async function markDelivered(
  deliveryId: string,
  responseStatus: number,
  responseBody: string | null
): Promise<void> {
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from(DATABASE_TABLES.WEBHOOK_DELIVERIES) as any)
    .update({
      status: 'delivered',
      response_status: responseStatus,
      response_body: truncateResponseBody(responseBody),
      next_attempt_at: null,
    })
    .eq('id', deliveryId);
  if (error) {
    logger.warn('markDelivered failed (non-fatal)', { error, deliveryId });
  }
}

export async function markFailedOrRetry(
  delivery: DeliveryRow,
  responseStatus: number | null,
  responseBody: string | null
): Promise<void> {
  const admin = createAdminClient();
  // delivery.attempt_count was already bumped by claimDelivery, so it
  // reflects "how many attempts have happened including this one".
  const { nextAttemptAt, shouldFail } = computeNextAttempt(delivery.attempt_count);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from(DATABASE_TABLES.WEBHOOK_DELIVERIES) as any)
    .update({
      status: shouldFail ? 'failed' : 'pending',
      response_status: responseStatus,
      response_body: truncateResponseBody(responseBody),
      next_attempt_at: nextAttemptAt ? nextAttemptAt.toISOString() : null,
    })
    .eq('id', delivery.id);
  if (error) {
    logger.warn('markFailedOrRetry failed (non-fatal)', { error, deliveryId: delivery.id });
  }
}
