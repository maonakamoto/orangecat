/**
 * getUserPlan — SSOT for "what tier is this user on?"
 *
 * Reads a row from public.user_plans (created by migration 20260610000001).
 * Falls back to free defaults when no row exists OR the read errors, so the
 * runtime is safe even if the table is missing or RLS denies access. The
 * helper does NOT mutate the database; the auth.users trigger
 * handle_new_user_plan inserts the row on signup.
 *
 * The returned `tier` reflects the *paid* tier only — BYOK detection lives
 * separately in api-key-service.hasValidKey. Combine them via
 * resolveTier({ hasGroqByok, hasOpenRouterByok, paidTier }) when computing
 * the user-facing tier for the QuotaMeter.
 */

import type { AnySupabaseClient } from '@/lib/supabase/types';
import { DATABASE_TABLES } from '@/config/database-tables';
import { CAT_FREE_DAILY_LIMIT } from '@/config/cat-plans';
import { logger } from '@/utils/logger';

export type PaidTier = 'free' | 'pro';

export interface UserPlan {
  tier: PaidTier;
  /** Resolved daily message cap. Free uses CAT_FREE_DAILY_LIMIT; Pro sets its own. */
  dailyLimit: number;
  /** ISO timestamp of Pro renewal deadline; null on Free. */
  expiresAt: string | null;
  /** True when expiresAt is in the past — caller should treat as Free. */
  isExpired: boolean;
}

const FREE_PLAN: UserPlan = {
  tier: 'free',
  dailyLimit: CAT_FREE_DAILY_LIMIT,
  expiresAt: null,
  isExpired: false,
};

/**
 * Read the user's plan row. Returns FREE_PLAN on any error or missing row.
 *
 * @param supabase server-side Supabase client (RLS-aware)
 * @param userId   auth.users.id
 */
export async function getUserPlan(supabase: AnySupabaseClient, userId: string): Promise<UserPlan> {
  const { data, error } = await supabase
    .from(DATABASE_TABLES.USER_PLANS)
    .select('tier, daily_limit, expires_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    logger.warn('getUserPlan: read failed, falling back to free', { error, userId }, 'billing');
    return FREE_PLAN;
  }

  if (!data) {
    return FREE_PLAN;
  }

  const expiresAt = (data.expires_at as string | null) ?? null;
  const isExpired = expiresAt !== null && new Date(expiresAt).getTime() < Date.now();
  const tier = (data.tier as PaidTier | null) ?? 'free';

  // Expired Pro collapses to Free both visually and for the cap
  if (isExpired || tier === 'free') {
    return { ...FREE_PLAN, expiresAt, isExpired };
  }

  return {
    tier,
    dailyLimit: (data.daily_limit as number | null) ?? CAT_FREE_DAILY_LIMIT,
    expiresAt,
    isExpired,
  };
}
