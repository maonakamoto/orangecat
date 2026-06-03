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

export async function storeIdempotencyResult(params: {
  userId: string;
  key: string;
  method: string;
  path: string;
  bodyHash: string;
  responseStatus: number;
  responseBody: unknown;
}): Promise<void> {
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from(TABLE) as any).insert({
    user_id: params.userId,
    key: params.key,
    method: params.method,
    path: params.path,
    body_hash: params.bodyHash,
    response_status: params.responseStatus,
    response_body: params.responseBody,
  });
  if (error && error.code !== '23505') {
    // 23505 = unique violation. Means another request finished first with
    // the same key — that's fine, the existing row IS the canonical
    // response and the next retry will hit it.
    logger.warn('idempotency store failed (non-fatal)', {
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
