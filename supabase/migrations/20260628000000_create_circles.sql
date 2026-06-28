-- Circles: lightweight community structures (lighter than groups — no shared
-- wallet or governance, just a discoverable community owned by its creator's actor).
-- Idempotent / fresh-box-safe.

CREATE TABLE IF NOT EXISTS circles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES actors(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'unlisted', 'private')),
  cover_image_url text,
  tags text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  member_count integer NOT NULL DEFAULT 0,
  is_test boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_circles_actor ON circles(actor_id);
CREATE INDEX IF NOT EXISTS idx_circles_visibility ON circles(visibility) WHERE visibility = 'public';
CREATE INDEX IF NOT EXISTS idx_circles_category ON circles(category);

ALTER TABLE circles ENABLE ROW LEVEL SECURITY;

-- Public circles are world-readable; an owner sees all of their own.
DROP POLICY IF EXISTS "circles public or owner read" ON circles;
CREATE POLICY "circles public or owner read" ON circles FOR SELECT
  USING (
    visibility = 'public'
    OR actor_id IN (SELECT id FROM actors WHERE user_id = auth.uid())
  );

-- Owners (the actor's user) create / update / delete their own circles.
DROP POLICY IF EXISTS "circles owner insert" ON circles;
CREATE POLICY "circles owner insert" ON circles FOR INSERT
  WITH CHECK (actor_id IN (SELECT id FROM actors WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "circles owner update" ON circles;
CREATE POLICY "circles owner update" ON circles FOR UPDATE
  USING (actor_id IN (SELECT id FROM actors WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "circles owner delete" ON circles;
CREATE POLICY "circles owner delete" ON circles FOR DELETE
  USING (actor_id IN (SELECT id FROM actors WHERE user_id = auth.uid()));

DROP TRIGGER IF EXISTS trg_circles_updated_at ON circles;
CREATE TRIGGER trg_circles_updated_at BEFORE UPDATE ON circles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
