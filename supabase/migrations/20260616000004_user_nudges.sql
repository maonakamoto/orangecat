-- ============================================================================
-- Proactive nudges: the Cat works for you in the background, surfacing specific,
-- grounded, actionable suggestions ("you're a hairdresser — publish a service",
-- "you should meet X"). Cached here so display is instant; regenerated when the
-- user's context changes or the cache goes stale.
-- ============================================================================

create table if not exists public.user_nudges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  nudge_type text not null,                  -- activation | connection | completion | opportunity
  title text not null,
  body text not null,
  cta_label text,
  cta_url text,
  -- stable key for dedupe + so a dismissed nudge doesn't reappear
  dedupe_key text not null,
  score real not null default 0,
  status text not null default 'active',     -- active | dismissed | done
  generated_at timestamptz not null default now(),
  dismissed_at timestamptz,
  unique (user_id, dedupe_key)
);

create index if not exists user_nudges_user_status_idx
  on public.user_nudges (user_id, status);
