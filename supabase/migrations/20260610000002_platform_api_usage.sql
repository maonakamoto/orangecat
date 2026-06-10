-- Backfills the platform_api_usage table the January user_api_keys
-- migration was supposed to create but never landed on remote. Without it,
-- the daily-cap RPCs (check_platform_limit, increment_platform_usage)
-- silently errored and the application code fell back to a "10 remaining"
-- default — the cap was purely decorative. Adding the table here finally
-- lets the cap enforce.
--
-- Applied to remote via Supabase MCP on 2026-06-10. This file exists so
-- `npx supabase db push` and local seeders pick up the same schema.

CREATE TABLE IF NOT EXISTS public.platform_api_usage (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  request_count INTEGER NOT NULL DEFAULT 0,
  token_count   BIGINT  NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_platform_api_usage_user_date
  ON public.platform_api_usage (user_id, usage_date);
CREATE INDEX IF NOT EXISTS idx_platform_api_usage_date
  ON public.platform_api_usage (usage_date);

ALTER TABLE public.platform_api_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own platform usage" ON public.platform_api_usage;
CREATE POLICY "Users can view own platform usage"
  ON public.platform_api_usage FOR SELECT
  USING (user_id = auth.uid());

COMMENT ON TABLE public.platform_api_usage IS
  'Daily counter of free-tier Cat requests per user. Read+upserted by check_platform_limit and increment_platform_usage. RLS lets users see only their own row; writes happen via the SECURITY DEFINER RPCs.';
