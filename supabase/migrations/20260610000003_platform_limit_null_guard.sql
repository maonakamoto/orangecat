-- Patches a pre-existing PL/pgSQL bug in check_platform_limit and
-- increment_platform_usage: `SELECT INTO` with no matching row sets the
-- target variable to NULL even when DECLARE specified an initial value.
-- For first-message-of-day users that meant
-- {daily_requests: NULL, requests_remaining: 0, can_use_platform: NULL}
-- which the application code then treated as "capped". Guard each
-- SELECT INTO with COALESCE on the variable after the assignment so the
-- DECLARE defaults survive a no-match read.
--
-- Applied to remote via Supabase MCP on 2026-06-10.

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

  v_daily_limit := COALESCE(v_daily_limit, 10);

  IF v_expires_at IS NOT NULL AND v_expires_at < NOW() THEN
    v_daily_limit := 10;
  END IF;

  SELECT request_count INTO v_current_requests
  FROM public.platform_api_usage
  WHERE user_id = p_user_id AND usage_date = CURRENT_DATE;

  v_current_requests := COALESCE(v_current_requests, 0);

  RETURN QUERY SELECT
    v_current_requests,
    v_daily_limit,
    GREATEST(0, v_daily_limit - v_current_requests),
    v_current_requests < v_daily_limit;
END;
$$;

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
  v_current_requests INTEGER := 0;
  v_current_tokens   BIGINT  := 0;
  v_expires_at       TIMESTAMPTZ;
BEGIN
  SELECT
    COALESCE(up.daily_limit, 10),
    up.expires_at
  INTO v_daily_limit, v_expires_at
  FROM public.user_plans up
  WHERE up.user_id = p_user_id;

  v_daily_limit := COALESCE(v_daily_limit, 10);

  IF v_expires_at IS NOT NULL AND v_expires_at < NOW() THEN
    v_daily_limit := 10;
  END IF;

  INSERT INTO public.platform_api_usage (user_id, usage_date, request_count, token_count)
  VALUES (p_user_id, CURRENT_DATE, p_request_count, p_token_count)
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET
    request_count = public.platform_api_usage.request_count + p_request_count,
    token_count   = public.platform_api_usage.token_count   + p_token_count,
    updated_at    = NOW();

  SELECT request_count, token_count
  INTO v_current_requests, v_current_tokens
  FROM public.platform_api_usage
  WHERE user_id = p_user_id AND usage_date = CURRENT_DATE;

  v_current_requests := COALESCE(v_current_requests, 0);
  v_current_tokens   := COALESCE(v_current_tokens, 0);

  RETURN QUERY SELECT
    v_current_requests,
    v_current_tokens,
    v_current_requests >= v_daily_limit;
END;
$$;
