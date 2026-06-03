/**
 * Idempotency-Key dedup service.
 *
 * Contract (docs/api/CONVENTIONS.md §4):
 *   - Same (user, key, path) + same body within 24h → return cached response.
 *   - Same (user, key, path) + DIFFERENT body → `idempotency_violation`.
 *   - 5xx responses are NEVER cached.
 *
 * Lifecycle: server-managed, admin-client only (RLS denies user access).
 * The application layer is the only writer; the table itself is plumbing.
 *
 * Created: 2026-06-03
 */

import { createHash } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/utils/logger';
import { DATABASE_TABLES } from '@/config/database-tables';

export interface IdempotencyHit {
  responseStatus: number;
  responseBody: unknown;
  bodyHash: string;
}

export type IdempotencyLookup =
  | { kind: 'miss' }
  | { kind: 'hit'; hit: IdempotencyHit }
  | { kind: 'body_mismatch' };

/**
 * Optimistic-claim outcome:
 *   'won'              — we inserted the pending row, proceed with processing
 *                        then call completeIdempotencyResult.
 *   'replay'           — another request already won AND completed; return its
 *                        cached response.
 *   'wait'             — another request is currently processing this key
 *                        (status='pending'). Caller should poll with
 *                        waitForIdempotencyResult.
 *   'body_mismatch'    — same key but different body → 422-ish error to client.
 */
export type IdempotencyClaim =
  | { kind: 'won' }
  | { kind: 'replay'; hit: IdempotencyHit }
  | { kind: 'wait' }
  | { kind: 'body_mismatch' };

const TABLE = DATABASE_TABLES.IDEMPOTENCY_RESULTS;

/** Stable, order-insensitive hash of a JSON body. Object key order varies
 * between clients; canonicalising here means functionally identical
 * payloads dedupe regardless of how the consumer serialised them. */
export function hashRequestBody(body: unknown): string {
  return createHash('sha256').update(canonicalJson(body)).digest('hex');
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }
  const keys = Object.keys(value as Record<string, unknown>).sort();
  const parts = keys.map(
    k => `${JSON.stringify(k)}:${canonicalJson((value as Record<string, unknown>)[k])}`
  );
  return `{${parts.join(',')}}`;
}

export async function lookupIdempotencyResult(params: {
  userId: string;
  key: string;
  path: string;
  bodyHash: string;
}): Promise<IdempotencyLookup> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from(TABLE)
    .select('body_hash, response_status, response_body, expires_at')
    .eq('user_id', params.userId)
    .eq('key', params.key)
    .eq('path', params.path)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (error) {
    logger.warn('idempotency lookup failed (treating as miss)', {
      error,
      userId: params.userId,
      path: params.path,
    });
    return { kind: 'miss' };
  }
  if (!data) {
    return { kind: 'miss' };
  }
  const row = data as {
    body_hash: string;
    response_status: number;
    response_body: unknown;
    expires_at: string;
  };
  if (row.body_hash !== params.bodyHash) {
    return { kind: 'body_mismatch' };
  }
  return {
    kind: 'hit',
    hit: {
      responseStatus: row.response_status,
      responseBody: row.response_body,
      bodyHash: row.body_hash,
    },
  };
}

/**
 * Atomic claim: try to insert a 'pending' row for this idempotency key.
 *
 *   - If we win the insert (no conflict), we own the request and the
 *     caller proceeds with processing, then calls
 *     completeIdempotencyResult to publish the response.
 *   - If we lose (unique violation), inspect the existing row:
 *       * status='complete' with matching body_hash → 'replay' the cached response
 *       * status='complete' with mismatched body_hash → 'body_mismatch' (the
 *         catalogued 422-ish error to the client)
 *       * status='pending' → 'wait' (another request is processing; caller
 *         polls until it completes)
 *
 * This serializes parallel retries on the (user_id, key, path) unique
 * index, so two concurrent requests with the same Idempotency-Key
 * cannot both execute the entity-create — fixing the race the
 * 2026-06-03 audit flagged.
 */
export async function claimIdempotencyKey(params: {
  userId: string;
  key: string;
  method: string;
  path: string;
  bodyHash: string;
}): Promise<IdempotencyClaim> {
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: insertError } = await (admin.from(TABLE) as any).insert({
    user_id: params.userId,
    key: params.key,
    method: params.method,
    path: params.path,
    body_hash: params.bodyHash,
    status: 'pending',
    response_status: null,
    response_body: null,
  });

  if (!insertError) {
    return { kind: 'won' };
  }

  // 23505 = unique_violation. Anything else is unhealthy and we fall
  // back to 'won' (i.e. proceed without caching) so the request still
  // serves the user.
  if (insertError.code !== '23505') {
    logger.warn('idempotency claim insert failed (treating as miss)', {
      error: insertError,
      userId: params.userId,
      path: params.path,
    });
    return { kind: 'won' };
  }

  // Someone beat us. Look up the existing row and branch.
  const existing = await lookupRow(params);
  if (!existing) {
    // Race-of-races: the conflicting row was deleted between insert and
    // lookup. Treat as a fresh win.
    return { kind: 'won' };
  }
  if (existing.body_hash !== params.bodyHash) {
    return { kind: 'body_mismatch' };
  }
  if (existing.status === 'complete' && existing.response_status !== null) {
    return {
      kind: 'replay',
      hit: {
        responseStatus: existing.response_status,
        responseBody: existing.response_body,
        bodyHash: existing.body_hash,
      },
    };
  }
  return { kind: 'wait' };
}

interface IdempotencyRow {
  body_hash: string;
  status: string;
  response_status: number | null;
  response_body: unknown;
  expires_at: string;
}

async function lookupRow(params: {
  userId: string;
  key: string;
  path: string;
}): Promise<IdempotencyRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from(TABLE)
    .select('body_hash, status, response_status, response_body, expires_at')
    .eq('user_id', params.userId)
    .eq('key', params.key)
    .eq('path', params.path)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (error || !data) {
    return null;
  }
  return data as IdempotencyRow;
}

/**
 * Poll for the winning request to finish. Backs off from 50ms → 500ms.
 * Returns the cached response, or null if the timeout fires first (in
 * which case the caller should treat as transient and 503 the client —
 * a retry will likely see the completed row).
 */
export async function waitForIdempotencyResult(params: {
  userId: string;
  key: string;
  path: string;
  timeoutMs?: number;
}): Promise<IdempotencyHit | null> {
  const deadline = Date.now() + (params.timeoutMs ?? 8_000);
  let delay = 50;
  while (Date.now() < deadline) {
    const row = await lookupRow(params);
    if (row && row.status === 'complete' && row.response_status !== null) {
      return {
        responseStatus: row.response_status,
        responseBody: row.response_body,
        bodyHash: row.body_hash,
      };
    }
    await new Promise(resolve => setTimeout(resolve, delay));
    delay = Math.min(delay * 1.5, 500);
  }
  return null;
}

/**
 * Release a row we claimed but couldn't complete (5xx outcome we don't
 * want to cache, or an exception thrown mid-request). Deletes the row
 * so the next retry with the same key wins a fresh claim instead of
 * polling a permanently-pending row.
 *
 * Scoped to status='pending' so we never accidentally drop a sibling
 * request's completed cache.
 */
export async function releaseIdempotencyClaim(params: {
  userId: string;
  key: string;
  path: string;
}): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from(TABLE)
    .delete()
    .eq('user_id', params.userId)
    .eq('key', params.key)
    .eq('path', params.path)
    .eq('status', 'pending');

  if (error) {
    logger.warn('idempotency release failed (non-fatal)', {
      error,
      userId: params.userId,
      path: params.path,
    });
  }
}

/**
 * Mark the row we claimed as complete with the actual response. Idempotent —
 * if someone already set the row (shouldn't happen given the claim
 * pattern, but defensive), the UPDATE is a no-op.
 */
export async function completeIdempotencyResult(params: {
  userId: string;
  key: string;
  path: string;
  responseStatus: number;
  responseBody: unknown;
}): Promise<void> {
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from(TABLE) as any)
    .update({
      status: 'complete',
      response_status: params.responseStatus,
      response_body: params.responseBody,
    })
    .eq('user_id', params.userId)
    .eq('key', params.key)
    .eq('path', params.path)
    .eq('status', 'pending');

  if (error) {
    logger.warn('idempotency complete failed (non-fatal)', {
      error,
      userId: params.userId,
      path: params.path,
    });
  }
}

/** 5xx responses must not be cached — the server may recover on retry. */
export function shouldCacheStatus(status: number): boolean {
  return status >= 200 && status < 500;
}
