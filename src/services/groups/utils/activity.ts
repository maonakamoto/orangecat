/**
 * Groups Service Activity Logging
 *
 * Activity logging utilities for groups.
 *
 * Created: 2025-01-30
 * Last Modified: 2025-01-30
 * Last Modified Summary: Created activity logging utilities
 */

import supabase from '@/lib/supabase/browser';
import { logger } from '@/utils/logger';
import type { ActivityType } from '../types';
import { DATABASE_TABLES } from '@/config/database-tables';
import type { AnySupabaseClient } from '@/lib/supabase/types';

/**
 * Log group activity
 * @param metadata - Can include related_wallet_id, related_project_id, etc. plus any extra keys
 * @param client - Optional Supabase client override
 */
export async function logGroupActivity(
  groupId: string,
  userId: string,
  activityType: ActivityType,
  description: string,
  metadata?: {
    related_wallet_id?: string;
    related_project_id?: string;
    related_loan_id?: string;
    related_proposal_id?: string;
    related_amount_btc?: number;
    [key: string]: unknown;
  },
  client?: AnySupabaseClient
): Promise<void> {
  try {
    const supabaseClient = client || supabase;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // The group_activities table stores everything but the core fields in `metadata`
    // (jsonb) — description + related_* are NOT columns. Inserting them as columns
    // failed (PostgREST: column does not exist) and the catch below swallowed it, so
    // the group activity feed never recorded anything. Fold them into metadata.
    await (supabaseClient.from(DATABASE_TABLES.GROUP_ACTIVITIES) as any).insert({
      group_id: groupId,
      user_id: userId,
      activity_type: activityType,
      metadata: { description, ...(metadata || {}) },
    });
  } catch (error) {
    logger.error('Failed to log group activity', error, 'Groups');
    // Don't throw - activity logging is non-critical
  }
}
