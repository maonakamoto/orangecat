-- ============================================================================
-- Restore auth.users → profile/actor/plan bootstrap on the self-host
-- (DRAFT — review, then apply box-side as the postgres/supabase_admin role)
-- ============================================================================
--
-- WHY THIS EXISTS
-- Verified live against supabase.orangecat.ch (2026-06-15): a fresh
-- /auth/v1/signup succeeds and returns a session, but with the SERVICE ROLE
-- (RLS bypassed) the new user has:
--     profiles    → 0 rows
--     user_plans  → 0 rows
--     actors      → 0 rows
-- i.e. registration produces an auth account with no application identity.
--
-- ROOT CAUSE
-- The managed cloud (retired 2026-06) created the `on auth.users` profile
-- trigger by hand in the dashboard — it exists in NO migration, so the
-- self-host never got it. The plan trigger (20260610000001) and the lazy
-- actor path exist, but the new DB is not bootstrapping new signups.
--
-- The 39 profiles / 35 actors already present were imported from the cloud
-- dump; they predate the self-host and masked this gap.
--
-- WHAT THIS DOES (all idempotent — safe to run repeatedly)
--   1. profiles: (re)assert handle_new_user() + its trigger on auth.users
--   2. actors:   create the user's actor when the profile is inserted
--                (profiles stays the SSOT; actor is the derived cache, matching
--                 the existing AFTER-UPDATE sync trigger)
--   3. plans:    (re)assert handle_new_user_plan() + its trigger
--   4. backfill: heal any existing auth.users missing a profile/actor/plan
--
-- NOTE: triggers on auth.users must be created by a role that owns/!manages
-- the auth schema (postgres / supabase_admin). If your migration runner uses a
-- lower-privileged role, apply this file as postgres. That privilege gap is the
-- most likely reason the plan trigger never took on the self-host.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. PROFILE bootstrap
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, name, email, status, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(split_part(NEW.email, '@', 1), 'user_' || left(NEW.id::text, 8)),
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1),
      'User'
    ),
    NEW.email,
    'active',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 2. ACTOR bootstrap (on profile insert — mirrors the lazy getOrCreateUserActor
--    shape: actor_type='user', plus display fields the UPDATE sync keeps fresh)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_profile_actor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.actors WHERE user_id = NEW.id AND actor_type = 'user'
  ) THEN
    INSERT INTO public.actors (actor_type, user_id, display_name, avatar_url, slug)
    VALUES (
      'user',
      NEW.id,
      COALESCE(NEW.name, NEW.username, 'User'),
      NEW.avatar_url,
      NEW.username
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_actor ON public.profiles;
CREATE TRIGGER on_profile_created_actor
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_profile_actor();

-- ---------------------------------------------------------------------------
-- 3. PLAN bootstrap (re-assert 20260610000001 — idempotent)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 4. BACKFILL — heal any auth.users already missing identity rows
--    (e.g. anyone who registered after the cutover with triggers absent)
-- ---------------------------------------------------------------------------

-- 4a. profiles
INSERT INTO public.profiles (id, username, name, email, status, created_at, updated_at)
SELECT
  u.id,
  COALESCE(split_part(u.email, '@', 1), 'user_' || left(u.id::text, 8)),
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    split_part(u.email, '@', 1),
    'User'
  ),
  u.email,
  'active',
  COALESCE(u.created_at, NOW()),
  NOW()
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- 4b. actors (for users whose profile now exists but actor doesn't)
INSERT INTO public.actors (actor_type, user_id, display_name, avatar_url, slug)
SELECT 'user', p.id, COALESCE(p.name, p.username, 'User'), p.avatar_url, p.username
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.actors a WHERE a.user_id = p.id AND a.actor_type = 'user'
);

-- 4c. plans
INSERT INTO public.user_plans (user_id, tier, daily_limit, started_at)
SELECT u.id, 'free', 10, COALESCE(u.created_at, NOW())
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_plans up WHERE up.user_id = u.id)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- POST-APPLY VERIFICATION (run manually; all three should return 0)
--   SELECT count(*) FROM auth.users u
--     WHERE NOT EXISTS (SELECT 1 FROM public.profiles  p  WHERE p.id = u.id);
--   SELECT count(*) FROM auth.users u
--     WHERE NOT EXISTS (SELECT 1 FROM public.actors    a  WHERE a.user_id = u.id AND a.actor_type='user');
--   SELECT count(*) FROM auth.users u
--     WHERE NOT EXISTS (SELECT 1 FROM public.user_plans up WHERE up.user_id = u.id);
-- Then re-run the signup probe: a new user must get a profile + actor + plan.
-- ============================================================================
