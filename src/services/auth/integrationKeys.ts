/**
 * Integration keys — outbound platform API key service.
 *
 * Sibling products (FleetCrown, hirn.li) and third-party integrations
 * authenticate to OrangeCat's platform API with one of these keys. A key
 * is bound to a single actor at mint time; every request the key
 * authenticates acts as that actor.
 *
 * - createIntegrationKey: mints a new key, returns plaintext ONCE.
 * - verifyIntegrationKey: resolves a plaintext key to {userId, actorId}
 *   or returns null. Touches last_used_at on success.
 * - listIntegrationKeys: lists a user's keys (no plaintext, ever).
 * - revokeIntegrationKey: marks a key revoked (audit trail kept).
 *
 * Created: 2026-06-03
 * Last Modified: 2026-06-03
 * Last Modified Summary: Initial implementation — first auth path that doesn't require a Supabase session.
 */

import { createHash, randomBytes } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/utils/logger';
import { DATABASE_TABLES } from '@/config/database-tables';
import {
  resolveCreationActor,
  ActorNotPermittedError,
} from '@/services/actors/resolveCreationActor';

const KEY_PREFIX = 'ock_' as const;
const KEY_RANDOM_BYTES = 24; // 48 hex chars → ~192 bits of entropy
const DISPLAY_PREFIX_LENGTH = 11; // "ock_a1b2c3d"

export interface IntegrationKey {
  id: string;
  user_id: string;
  actor_id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
}

export interface MintedIntegrationKey {
  /** Stored record (no plaintext). */
  key: IntegrationKey;
  /** Plaintext key — show to user ONCE and never again. */
  plaintext: string;
}

function generatePlaintext(): string {
  return `${KEY_PREFIX}${randomBytes(KEY_RANDOM_BYTES).toString('hex')}`;
}

function hashKey(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex');
}

/**
 * Mint a new integration key. The caller (the authenticated user) must be
 * authorised to act as the requested actor — same gate as the actor
 * switcher in entity wizards.
 *
 * @throws ActorNotPermittedError when the user can't act as `actorId`.
 */
export async function createIntegrationKey(params: {
  userId: string;
  actorId: string;
  name: string;
  expiresAt?: Date | null;
}): Promise<MintedIntegrationKey> {
  const { userId, actorId, name, expiresAt } = params;

  // Reuse the actor-resolution gate so mint authority matches create authority.
  await resolveCreationActor(userId, actorId);

  const plaintext = generatePlaintext();
  const keyHash = hashKey(plaintext);
  const keyPrefix = plaintext.slice(0, DISPLAY_PREFIX_LENGTH);

  const admin = createAdminClient();
  const { data, error } = await (
    admin.from(DATABASE_TABLES.INTEGRATION_KEYS) as ReturnType<
      typeof admin.from
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    > as any
  )
    .insert({
      user_id: userId,
      actor_id: actorId,
      name: name.trim(),
      key_hash: keyHash,
      key_prefix: keyPrefix,
      expires_at: expiresAt ? expiresAt.toISOString() : null,
    })
    .select(
      'id, user_id, actor_id, name, key_prefix, created_at, last_used_at, expires_at, revoked_at'
    )
    .single();

  if (error || !data) {
    logger.error('createIntegrationKey: insert failed', { error, userId, actorId });
    throw error ?? new Error('Failed to create integration key');
  }

  return { key: data as IntegrationKey, plaintext };
}

/**
 * Resolve a plaintext key to its bound user + actor. Returns null for any
 * malformed / unknown / revoked / expired key — callers should not branch
 * on the failure reason (avoid leaking detail to attackers).
 *
 * Touches last_used_at on success so the UI shows fresh activity.
 */
export async function verifyIntegrationKey(plaintext: string): Promise<{
  userId: string;
  actorId: string;
  keyId: string;
} | null> {
  if (!plaintext || !plaintext.startsWith(KEY_PREFIX)) {
    return null;
  }

  const keyHash = hashKey(plaintext);
  const admin = createAdminClient();

  const { data, error } = await admin
    .from(DATABASE_TABLES.INTEGRATION_KEYS)
    .select('id, user_id, actor_id, expires_at, revoked_at')
    .eq('key_hash', keyHash)
    .is('revoked_at', null)
    .maybeSingle();

  if (error) {
    logger.error('verifyIntegrationKey: lookup failed', { error });
    return null;
  }

  if (!data) {
    return null;
  }

  const row = data as {
    id: string;
    user_id: string;
    actor_id: string;
    expires_at: string | null;
    revoked_at: string | null;
  };

  if (row.expires_at && new Date(row.expires_at) <= new Date()) {
    return null;
  }

  // Best-effort: don't fail the request if the touch fails.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (admin.from(DATABASE_TABLES.INTEGRATION_KEYS) as any)
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', row.id)
    .then((result: { error: unknown }) => {
      if (result.error) {
        logger.warn('verifyIntegrationKey: failed to touch last_used_at', { error: result.error });
      }
    });

  return { userId: row.user_id, actorId: row.actor_id, keyId: row.id };
}

/** List the user's keys — never returns plaintext or the hash. */
export async function listIntegrationKeys(userId: string): Promise<IntegrationKey[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from(DATABASE_TABLES.INTEGRATION_KEYS)
    .select(
      'id, user_id, actor_id, name, key_prefix, created_at, last_used_at, expires_at, revoked_at'
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('listIntegrationKeys: query failed', { error, userId });
    throw error;
  }

  return (data ?? []) as IntegrationKey[];
}

/**
 * Soft-revoke (sets revoked_at). The active-hash index excludes revoked
 * rows, so subsequent verify calls return null immediately.
 *
 * @returns true when the key was found and revoked; false if it didn't
 *          belong to the user (or was already revoked).
 */
export async function revokeIntegrationKey(keyId: string, userId: string): Promise<boolean> {
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin.from(DATABASE_TABLES.INTEGRATION_KEYS) as any)
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', keyId)
    .eq('user_id', userId)
    .is('revoked_at', null)
    .select('id')
    .maybeSingle();

  if (error) {
    logger.error('revokeIntegrationKey: update failed', { error, userId, keyId });
    throw error;
  }

  return !!data;
}

// Re-export so API handlers can catch the actor-permission error without
// reaching into the actor resolver.
export { ActorNotPermittedError };
