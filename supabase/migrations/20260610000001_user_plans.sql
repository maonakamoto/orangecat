-- user_plans: one row per authenticated user describing their current Cat
-- tier (free / pro), the resolved daily message cap, and the optional Pro
-- expiry timestamp. Reads from this table replace the hardcoded
-- `v_daily_limit INTEGER := 10` block that lived inside check_platform_limit
-- and increment_platform_usage. The runtime defaults to free + 10/day when
-- a user has no row, so the migration is safe to apply before any UI or
-- billing code is plumbed.
--
-- Inserts/updates happen only via the service role:
--   - default 'free' row inserted by the on-auth.users trigger below
--   - 'pro' upgrades and renewals will be inserted by the future billing
--     webhook (server-side) once Lightning checkout exists
-- Users can SELECT their own row (RLS); they cannot mutate it directly.
--
-- This migration is additive: no existing column is dropped, no existing
-- row is touched outside of the backfill (which only inserts for users who
-- don't already have a plan).

-- =====================================================================
-- 1. user_plans table
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.user_plans (
  user_id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tier            TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro')),
  daily_limit     INTEGER NOT NULL DEFAULT 10 CHECK (daily_limit > 0),
  expires_at      TIMESTAMPTZ,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payment_method  TEXT CHECK (payment_method IS NULL OR payment_method IN ('lightning', 'onchain', 'manual')),
  last_invoice_id TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.user_plans IS
  'Cat tier per user. Free is the default; Pro requires a paid Lightning invoice and tracks expiry.';
COMMENT ON COLUMN public.user_plans.daily_limit IS
  'Resolved daily message cap. Free=10, Pro=200 (target). Read by check_platform_limit.';
COMMENT ON COLUMN public.user_plans.expires_at IS
  'NULL on Free. On Pro, the renewal deadline; the RPC treats expired Pro as Free.';

-- Index lets us cheaply find plans about to expire (renewal reminders) and
-- skip the partial index when filtering active Pro users.
CREATE INDEX IF NOT EXISTS idx_user_plans_expires_at
  ON public.user_plans (expires_at)
  WHERE expires_at IS NOT NULL;

-- =====================================================================
-- 2. RLS — read own row, no client-side writes
-- =====================================================================

ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own plan" ON public.user_plans;
CREATE POLICY "Users read own plan"
  ON public.user_plans
  FOR SELECT
  USING (user_id = auth.uid());

-- =====================================================================
-- 3. Backfill: every existing auth.users gets a free plan
-- =====================================================================

INSERT INTO public.user_plans (user_id, tier, daily_limit, started_at)
SELECT u.id, 'free', 10, COALESCE(u.created_at, NOW())
FROM auth.users u
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================================
-- 4. Trigger: new signups get a free plan row automatically
-- =====================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_plans (user_id, tier, daily_limit)
  VALUES (NEW.id, 'free', 10)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_plan ON auth.users;
CREATE TRIGGER on_auth_user_created_plan
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_plan();

-- =====================================================================
-- 5. Replace check_platform_limit — read daily_limit from user_plans
-- =====================================================================
-- Same return shape as the original (daily_requests, daily_limit,
-- requests_remaining, can_use_platform) so existing callers
-- (ApiKeyService.checkPlatformUsage) stay binary-compatible.

CREATE OR REPLACE FUNCTION public.check_platform_limit(p_user_id UUID)
RETURNS TABLE(
  daily_requests     INTEGER,
  daily_limit        INTEGER,
  requests_remaining INTEGER,
  can_use_platform   BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_daily_limit      INTEGER := 10;
  v_current_requests INTEGER := 0;
  v_expires_at       TIMESTAMPTZ;
BEGIN
  SELECT
    COALESCE(up.daily_limit, 10),
    up.expires_at
  INTO v_daily_limit, v_expires_at
  FROM public.user_plans up
  WHERE up.user_id = p_user_id;

  -- Expired Pro drops to the free-tier limit until renewal lands
  IF v_expires_at IS NOT NULL AND v_expires_at < NOW() THEN
    v_daily_limit := 10;
  END IF;

  IF v_daily_limit IS NULL THEN
    v_daily_limit := 10;
  END IF;

  SELECT COALESCE(request_count, 0) INTO v_current_requests
  FROM public.platform_api_usage
  WHERE user_id = p_user_id AND usage_date = CURRENT_DATE;

  RETURN QUERY SELECT
    v_current_requests,
    v_daily_limit,
    GREATEST(0, v_daily_limit - v_current_requests),
    v_current_requests < v_daily_limit;
END;
$$;

-- =====================================================================
-- 6. Replace increment_platform_usage — same tier-aware limit
-- =====================================================================

CREATE OR REPLACE FUNCTION public.increment_platform_usage(
  p_user_id       UUID,
  p_request_count INTEGER DEFAULT 1,
  p_token_count   BIGINT  DEFAULT 0
)
RETURNS TABLE(
  daily_requests INTEGER,
  daily_tokens   BIGINT,
  limit_reached  BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_daily_limit      INTEGER := 10;
  v_current_requests INTEGER;
  v_expires_at       TIMESTAMPTZ;
BEGIN
  SELECT
    COALESCE(up.daily_limit, 10),
    up.expires_at
  INTO v_daily_limit, v_expires_at
  FROM public.user_plans up
  WHERE up.user_id = p_user_id;

  IF v_expires_at IS NOT NULL AND v_expires_at < NOW() THEN
    v_daily_limit := 10;
  END IF;

  IF v_daily_limit IS NULL THEN
    v_daily_limit := 10;
  END IF;

  INSERT INTO public.platform_api_usage (user_id, usage_date, request_count, token_count)
  VALUES (p_user_id, CURRENT_DATE, p_request_count, p_token_count)
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET
    request_count = public.platform_api_usage.request_count + p_request_count,
    token_count   = public.platform_api_usage.token_count   + p_token_count,
    updated_at    = NOW();

  SELECT request_count INTO v_current_requests
  FROM public.platform_api_usage
  WHERE user_id = p_user_id AND usage_date = CURRENT_DATE;

  RETURN QUERY SELECT
    v_current_requests,
    (SELECT token_count FROM public.platform_api_usage WHERE user_id = p_user_id AND usage_date = CURRENT_DATE),
    v_current_requests >= v_daily_limit;
END;
$$;
