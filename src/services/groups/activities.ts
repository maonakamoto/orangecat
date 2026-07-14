/**
 * Group activity recording — fire-and-forget helper.
 * Never throws; failures are logged but do not surface to callers.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { DATABASE_TABLES } from '@/config/database-tables';
import { logger } from '@/utils/logger';
import type { ActivityType } from './types';

type AnyClient = any;

interface ActivityParams {
  group_id: string;
  user_id: string;
  activity_type: ActivityType;
  metadata?: Record<string, unknown>;
}

export async function recordGroupActivity(
  supabase: SupabaseClient | AnyClient,
  params: ActivityParams
): Promise<void> {
  const { error } = await (supabase.from(DATABASE_TABLES.GROUP_ACTIVITIES) as AnyClient).insert({
    group_id: params.group_id,
    user_id: params.user_id,
    activity_type: params.activity_type,
    metadata: params.metadata ?? {},
  });

  if (error) {
    logger.error('Failed to record group activity', { error, ...params }, 'GroupActivities');
  }
}
