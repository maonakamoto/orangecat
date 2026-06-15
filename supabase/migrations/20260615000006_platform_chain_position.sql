-- ============================================================================
-- Make the platform default a repositionable entry in the Cat fallback chain.
-- ============================================================================
-- user_api_keys.sort_order already orders the user's keys. This adds the
-- platform default's position in that same ordered list, so the user can drag
-- it anywhere (including first = primary). Default 0 = platform tried first
-- (matches "the default one is the platform one").
--
-- Idempotent, additive.
-- ============================================================================

ALTER TABLE public.user_ai_preferences
  ADD COLUMN IF NOT EXISTS platform_chain_position integer NOT NULL DEFAULT 0;
