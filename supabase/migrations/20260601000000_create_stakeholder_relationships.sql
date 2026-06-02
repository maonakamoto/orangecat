-- =============================================
-- STAKEHOLDER RELATIONSHIPS
--
-- Typed edges between projects and the eight stakeholder categories
-- every project has around it: competitors, collaborators, investors,
-- customers, employees, acquirers, acquisition targets, in-house dev
-- projects.
--
-- This is the foundational substrate for the cross-product
-- stakeholder graph documented in the Thoughts essay "Where
-- Stakeholders Live". OrangeCat stores the graph, FleetCrown (and other
-- surfaces) read it through the identity bridge.
--
-- All eight categories are edges between entities OrangeCat already
-- has (projects + actors). The "to" side can also point at an
-- external URL — a competitor on the open web that has not yet
-- registered as an OrangeCat project. That external pointer is
-- intentionally loose so the graph can be populated faster than the
-- world it represents.
-- =============================================

CREATE TABLE IF NOT EXISTS stakeholder_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The actor who tracks this relationship. RLS keys off this column.
  owner_actor_id uuid NOT NULL REFERENCES actors(id) ON DELETE CASCADE,

  -- The "from" side — the project this relationship is about. Always
  -- a project; the eight categories are all relationships ABOUT a
  -- project, not about an actor in isolation.
  from_project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- The "to" side — one of three forms. Exactly one is set.
  -- - to_actor_id    : a person or group already in OrangeCat
  -- - to_project_id  : another project already in OrangeCat
  -- - to_external_*  : a target on the open web that has not been
  --                    registered as an OrangeCat entity yet
  to_actor_id      uuid REFERENCES actors(id) ON DELETE CASCADE,
  to_project_id    uuid REFERENCES projects(id) ON DELETE CASCADE,
  to_external_url  text,
  to_external_name text,

  -- Relationship kind. The eight named categories cover the
  -- stakeholder map the user is being asked to think about for every
  -- project. New kinds added later expand this list.
  kind text NOT NULL CHECK (kind IN (
    'competitor',
    'collaborator',
    'investor',
    'customer',
    'employee',
    'acquirer',
    'acquisition_target',
    'in_house_dev'
  )),

  -- Pipeline stage — semantics vary by kind. Examples:
  --   investor:  identified, intro, pitched, follow_up, committed, declined
  --   customer:  prospect, demo, trial, paying, churned
  --   competitor: monitoring, direct, indirect, legacy
  -- Kept as free text so the UI can evolve without migrations.
  status text,

  -- 0..100 confidence in the relationship. Used by the agent to
  -- weight actions — a competitor with 90 confidence outranks one at
  -- 30 when the Watch picks a focus.
  confidence smallint CHECK (confidence BETWEEN 0 AND 100),

  -- Owner notes. Free text.
  notes text,

  -- Structured side-channel data the agent can populate without a
  -- schema change. Use cases:
  --   - last RSS check timestamp for a competitor
  --   - last deck-open event for an investor
  --   - last interaction date for a potential employee
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Exactly one "to" target must be set.
  CONSTRAINT stakeholder_relationships_to_target_set CHECK (
    ((to_actor_id IS NOT NULL)::int
   + (to_project_id IS NOT NULL)::int
   + (to_external_url IS NOT NULL)::int) = 1
  )
);

-- Indexes for the common reads.
CREATE INDEX IF NOT EXISTS idx_stakeholder_relationships_owner
  ON stakeholder_relationships(owner_actor_id);
CREATE INDEX IF NOT EXISTS idx_stakeholder_relationships_from_project
  ON stakeholder_relationships(from_project_id);
CREATE INDEX IF NOT EXISTS idx_stakeholder_relationships_kind
  ON stakeholder_relationships(kind);
CREATE INDEX IF NOT EXISTS idx_stakeholder_relationships_to_actor
  ON stakeholder_relationships(to_actor_id) WHERE to_actor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stakeholder_relationships_to_project
  ON stakeholder_relationships(to_project_id) WHERE to_project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stakeholder_relationships_updated
  ON stakeholder_relationships(updated_at DESC);

-- updated_at trigger.
CREATE OR REPLACE FUNCTION set_updated_at_stakeholder_relationships()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_stakeholder_relationships_updated
  ON stakeholder_relationships;
CREATE TRIGGER trg_stakeholder_relationships_updated
  BEFORE UPDATE ON stakeholder_relationships
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_stakeholder_relationships();

-- Row-Level Security.
ALTER TABLE stakeholder_relationships ENABLE ROW LEVEL SECURITY;

-- Owners can read their own relationships. "Own" is determined by
-- the actor that owns the row.
CREATE POLICY stakeholder_relationships_owner_select
  ON stakeholder_relationships
  FOR SELECT
  USING (
    owner_actor_id IN (
      SELECT id FROM actors WHERE user_id = (SELECT auth.uid())
    )
  );

-- Owners can insert relationships for actors they own.
CREATE POLICY stakeholder_relationships_owner_insert
  ON stakeholder_relationships
  FOR INSERT
  WITH CHECK (
    owner_actor_id IN (
      SELECT id FROM actors WHERE user_id = (SELECT auth.uid())
    )
  );

-- Owners can update their own relationships.
CREATE POLICY stakeholder_relationships_owner_update
  ON stakeholder_relationships
  FOR UPDATE
  USING (
    owner_actor_id IN (
      SELECT id FROM actors WHERE user_id = (SELECT auth.uid())
    )
  );

-- Owners can delete their own relationships.
CREATE POLICY stakeholder_relationships_owner_delete
  ON stakeholder_relationships
  FOR DELETE
  USING (
    owner_actor_id IN (
      SELECT id FROM actors WHERE user_id = (SELECT auth.uid())
    )
  );

-- Comments for future readers / supabase schema viewer.
COMMENT ON TABLE stakeholder_relationships IS
  'Typed edges between a project and its stakeholders (competitors, collaborators, investors, customers, employees, acquirers, acquisition targets, in-house dev projects). Read from FleetCrown via the identity bridge.';
COMMENT ON COLUMN stakeholder_relationships.kind IS
  'One of eight stakeholder categories. Extend this CHECK constraint to add new categories.';
COMMENT ON COLUMN stakeholder_relationships.metadata IS
  'JSONB side-channel for agent-populated signals (last RSS check, deck-open events, etc.) without schema migrations.';
