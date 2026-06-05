/**
 * ONBOARDING CONFIGURATION — SSOT for onboarding-shared constants.
 *
 * After the 2026-06-05 onboarding cleanup, the system has a single
 * surface (IntelligentOnboarding). The legacy ONBOARDING_CATEGORIES /
 * CATEGORY_LABELS / EXPLORE_OPTIONS only fed the deleted OnboardingFlow
 * steps and are gone with them.
 *
 * `onboarding_method` is still a column on profiles; if it stays
 * write-only-with-one-value (all rows = 'intelligent'), the column +
 * this constant should both go in a followup migration.
 */

/**
 * Onboarding completion methods. Persisted to profiles.onboarding_method
 * via a CHECK constraint in supabase/migrations/20260128000000_*.
 */
export const ONBOARDING_METHOD = {
  STANDARD: 'standard',
  INTELLIGENT: 'intelligent',
  SKIPPED: 'skipped',
} as const;

export type OnboardingMethod = (typeof ONBOARDING_METHOD)[keyof typeof ONBOARDING_METHOD];
