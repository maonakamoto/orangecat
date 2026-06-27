-- Remediate self-host drift for research sub-tables + project_support money columns.
--
-- These tables/columns were referenced by app code but missing/sats-only on the box
-- (surfaced by the deploy schema-drift gate, 2026-06-27). The original create
-- migrations couldn't replay on the drifted box (20250107000000 references
-- research_entities.funding_goal_sats, since renamed to _btc), and the Phase B
-- sats→btc migration (20260404000006) never covered project_support/research_*.
-- This migration is idempotent and fresh-box-safe.

-- ── Research sub-tables (research_entities already exists) ───────────────────
CREATE TABLE IF NOT EXISTS research_progress_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  research_entity_id UUID NOT NULL REFERENCES research_entities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  milestone_achieved BOOLEAN DEFAULT false,
  funding_released BIGINT DEFAULT 0 CHECK (funding_released >= 0),
  attachments TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  votes_up INTEGER DEFAULT 0,
  votes_down INTEGER DEFAULT 0,
  total_votes INTEGER GENERATED ALWAYS AS (votes_up + votes_down) STORED
);

CREATE TABLE IF NOT EXISTS research_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  research_entity_id UUID NOT NULL REFERENCES research_entities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('direction', 'priority', 'impact', 'continuation')),
  choice TEXT NOT NULL,
  weight DECIMAL(5,2) DEFAULT 1.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (research_entity_id, user_id, vote_type)
);

CREATE TABLE IF NOT EXISTS research_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  research_entity_id UUID NOT NULL REFERENCES research_entities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  amount_btc NUMERIC(18,8) NOT NULL CHECK (amount_btc > 0),
  funding_model TEXT NOT NULL CHECK (funding_model IN ('donation', 'subscription', 'milestone', 'royalty')),
  message TEXT,
  anonymous BOOLEAN DEFAULT false,
  lightning_invoice TEXT,
  onchain_tx TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  confirmed_at TIMESTAMP WITH TIME ZONE
);

-- Fresh-box reconcile: if the original migration created research_contributions
-- with a legacy amount_sats, convert it to amount_btc.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='research_contributions'
               AND column_name='amount_sats') THEN
    ALTER TABLE research_contributions
      ALTER COLUMN amount_sats TYPE NUMERIC(18,8) USING COALESCE(amount_sats,0)::numeric / 100000000.0;
    ALTER TABLE research_contributions RENAME COLUMN amount_sats TO amount_btc;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_research_progress_entity_id ON research_progress_updates(research_entity_id);
CREATE INDEX IF NOT EXISTS idx_research_progress_created_at ON research_progress_updates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_research_votes_entity_id ON research_votes(research_entity_id);
CREATE INDEX IF NOT EXISTS idx_research_votes_user_id ON research_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_research_contributions_entity_id ON research_contributions(research_entity_id);
CREATE INDEX IF NOT EXISTS idx_research_contributions_user_id ON research_contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_research_contributions_status ON research_contributions(status);

ALTER TABLE research_progress_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_contributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "research_progress public read" ON research_progress_updates;
CREATE POLICY "research_progress public read" ON research_progress_updates FOR SELECT
  USING (EXISTS (SELECT 1 FROM research_entities WHERE id = research_entity_id AND is_public = true)
         OR EXISTS (SELECT 1 FROM research_entities WHERE id = research_entity_id AND user_id = auth.uid()));
DROP POLICY IF EXISTS "research_progress owner write" ON research_progress_updates;
CREATE POLICY "research_progress owner write" ON research_progress_updates FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM research_entities WHERE id = research_entity_id AND user_id = auth.uid()));

DROP POLICY IF EXISTS "research_votes public read" ON research_votes;
CREATE POLICY "research_votes public read" ON research_votes FOR SELECT
  USING (EXISTS (SELECT 1 FROM research_entities WHERE id = research_entity_id AND is_public = true));
DROP POLICY IF EXISTS "research_votes auth insert" ON research_votes;
CREATE POLICY "research_votes auth insert" ON research_votes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL
              AND EXISTS (SELECT 1 FROM research_entities WHERE id = research_entity_id AND is_public = true));
DROP POLICY IF EXISTS "research_votes own update" ON research_votes;
CREATE POLICY "research_votes own update" ON research_votes FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "research_contrib read" ON research_contributions;
CREATE POLICY "research_contrib read" ON research_contributions FOR SELECT
  USING (auth.uid() = user_id
         OR EXISTS (SELECT 1 FROM research_entities WHERE id = research_entity_id AND user_id = auth.uid()));
DROP POLICY IF EXISTS "research_contrib insert" ON research_contributions;
CREATE POLICY "research_contrib insert" ON research_contributions FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM research_entities WHERE id = research_entity_id AND is_public = true));
DROP POLICY IF EXISTS "research_contrib own update" ON research_contributions;
CREATE POLICY "research_contrib own update" ON research_contributions FOR UPDATE USING (auth.uid() = user_id);

-- ── project_support / project_support_stats: sats → btc (Phase B missed these) ─
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='project_support' AND column_name='amount_sats') THEN
    ALTER TABLE project_support
      ALTER COLUMN amount_sats TYPE NUMERIC(18,8) USING COALESCE(amount_sats,0)::numeric / 100000000.0;
    ALTER TABLE project_support RENAME COLUMN amount_sats TO amount_btc;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='project_support_stats' AND column_name='total_bitcoin_sats') THEN
    ALTER TABLE project_support_stats
      ALTER COLUMN total_bitcoin_sats TYPE NUMERIC(18,8) USING COALESCE(total_bitcoin_sats,0)::numeric / 100000000.0;
    ALTER TABLE project_support_stats RENAME COLUMN total_bitcoin_sats TO total_bitcoin_btc;
  END IF;
END $$;
