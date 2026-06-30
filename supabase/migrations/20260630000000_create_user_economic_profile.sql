-- User Economic Profile
--
-- The keystone of the economic agent (see docs/specs/cat-economic-interviewer.md).
-- A structured, queryable home for a user's LATENT economic value — the things Cat
-- learns by interviewing them. Today that value only ever lands as free-text bio or
-- cat_memories; this gives it typed fields so gap-detection, pricing, and future
-- matchmaking can QUERY it (not just parse prose), and so the offer engine reasons
-- over a real model of the person.
--
-- Design notes:
-- - One row per user. Keyed on user_id -> auth.users (personal, not group-scoped),
--   matching how Cat fetches context (by userId) and the cat_* table convention.
-- - JSONB arrays for the multi-valued dimensions (flexible as the interview evolves,
--   GIN-indexable for "users with skill X"); plain text for the scalars.
-- - RLS: a user sees and edits only their own economic profile.

CREATE TABLE IF NOT EXISTS user_economic_profile (
  user_id      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- [{ "name": "Translation", "level": "expert", "years": 8 }]
  skills       JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- [{ "name": "Workshop space", "type": "space" }]
  assets       JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- [{ "text": "Fund a repair café", "kind": "fund" }]  kind: earn|fund|learn|connect|build
  goals        JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- ["only evenings", "no upfront capital"]
  constraints  JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- The single richest signal: what people come to this person for. ["fixing bikes"]
  asked_for    JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Why they're here: earn / community / meaning / learn / unsure
  motivation   TEXT,
  -- Where they are: exploring / has-offers / scaling
  stage        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Find people by skill (matchmaking / "no one offers X yet") — future, but cheap now.
CREATE INDEX IF NOT EXISTS idx_user_economic_profile_skills
  ON user_economic_profile USING GIN (skills);

ALTER TABLE user_economic_profile ENABLE ROW LEVEL SECURITY;

-- DROP+CREATE so the migration is idempotent: Postgres has no
-- CREATE POLICY IF NOT EXISTS, and the deploy pipeline re-applies migrations.
DROP POLICY IF EXISTS "user_economic_profile_select" ON user_economic_profile;
CREATE POLICY "user_economic_profile_select" ON user_economic_profile
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "user_economic_profile_insert" ON user_economic_profile;
CREATE POLICY "user_economic_profile_insert" ON user_economic_profile
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "user_economic_profile_update" ON user_economic_profile;
CREATE POLICY "user_economic_profile_update" ON user_economic_profile
  FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "user_economic_profile_delete" ON user_economic_profile;
CREATE POLICY "user_economic_profile_delete" ON user_economic_profile
  FOR DELETE USING (auth.uid() = user_id);
