/**
 * Notification preferences domain logic (server-only).
 *
 * Read-or-create (with first-time defaults + race handling) and validated
 * partial update for a user's notification preferences. Kept out of the API
 * route so it stays a thin validate → delegate → respond wrapper. Each function
 * returns a discriminated result the route maps to an HTTP response (no HTTP
 * concerns in this layer).
 */

import type { AnySupabaseClient } from '@/lib/supabase/types';
import { logger } from '@/utils/logger';
import { DATABASE_TABLES } from '@/config/database-tables';
import {
  createDefaultPreferences,
  type NotificationPreferences,
  type NotificationPreferencesUpdate,
  type DigestFrequency,
} from '@/types/notification-preferences';

const TABLE = DATABASE_TABLES.NOTIFICATION_PREFERENCES;
const LOG_SOURCE = 'NotificationPrefs';
const VALID_DIGEST_FREQUENCIES: DigestFrequency[] = ['daily', 'weekly', 'never'];
const CATEGORY_TOGGLE_KEYS = [
  'economic_emails',
  'social_emails',
  'group_emails',
  'progress_emails',
  'reengagement_emails',
] as const;

/** Outcome codes the route maps to apiBadRequest. */
export type PreferencesErrorCode = 'invalid';

export type PreferencesResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: PreferencesErrorCode; message: string }
  | { ok: false; dbError: unknown };

/** Fetch a user's preferences, creating category-default preferences on first access. */
export async function getPreferences(
  admin: AnySupabaseClient,
  userId: string
): Promise<PreferencesResult<NotificationPreferences>> {
  const { data, error } = await admin.from(TABLE).select('*').eq('user_id', userId).maybeSingle();
  if (error) {
    logger.error('Failed to fetch notification preferences', { error, userId }, LOG_SOURCE);
    return { ok: false, dbError: error };
  }
  if (data) {
    return { ok: true, data: data as NotificationPreferences };
  }

  // First time: create default preferences
  const defaults = createDefaultPreferences(userId);
  const { data: created, error: insertError } = await admin
    .from(TABLE)
    .insert(defaults)
    .select()
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      // Race condition: another request created the row concurrently
      const { data: existing } = await admin.from(TABLE).select('*').eq('user_id', userId).single();
      return { ok: true, data: (existing ?? defaults) as NotificationPreferences };
    }
    logger.error(
      'Failed to create default notification preferences',
      { error: insertError, userId },
      LOG_SOURCE
    );
    return { ok: false, dbError: insertError };
  }

  return { ok: true, data: created as NotificationPreferences };
}

/** Validate a partial update body, then upsert the user's preferences. */
export async function updatePreferences(
  admin: AnySupabaseClient,
  userId: string,
  body: NotificationPreferencesUpdate
): Promise<PreferencesResult<NotificationPreferences>> {
  const updateData: Record<string, unknown> = {};

  for (const key of CATEGORY_TOGGLE_KEYS) {
    if (key in body) {
      if (typeof body[key] !== 'boolean') {
        return { ok: false, code: 'invalid', message: `${key} must be a boolean` };
      }
      updateData[key] = body[key];
    }
  }

  if ('digest_frequency' in body) {
    if (!VALID_DIGEST_FREQUENCIES.includes(body.digest_frequency as DigestFrequency)) {
      return {
        ok: false,
        code: 'invalid',
        message: `digest_frequency must be one of: ${VALID_DIGEST_FREQUENCIES.join(', ')}`,
      };
    }
    updateData.digest_frequency = body.digest_frequency;
  }

  if ('type_overrides' in body) {
    const overrides = body.type_overrides;
    if (typeof overrides !== 'object' || overrides === null || Array.isArray(overrides)) {
      return {
        ok: false,
        code: 'invalid',
        message: 'type_overrides must be an object mapping type names to booleans',
      };
    }
    for (const [key, value] of Object.entries(overrides)) {
      if (typeof value !== 'boolean') {
        return {
          ok: false,
          code: 'invalid',
          message: `type_overrides values must be booleans, got non-boolean for "${key}"`,
        };
      }
    }
    updateData.type_overrides = overrides;
  }

  if (Object.keys(updateData).length === 0) {
    return { ok: false, code: 'invalid', message: 'No valid fields provided to update' };
  }
  updateData.updated_at = new Date().toISOString();

  const upsertData = { ...createDefaultPreferences(userId), ...updateData, user_id: userId };
  const { data, error } = await admin
    .from(TABLE)
    .upsert(upsertData, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) {
    logger.error('Failed to update notification preferences', { error, userId }, LOG_SOURCE);
    return { ok: false, dbError: error };
  }

  return { ok: true, data: data as NotificationPreferences };
}
