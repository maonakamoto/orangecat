-- Create 4 feature tables the app code references but that had NO create migration
-- anywhere (surfaced by the deploy schema-drift gate, 2026-06-27). Schemas are derived
-- from each table's actual insert/select in the code; RLS is a conservative default
-- (append-only / owner-scoped) following the codebase's established patterns.
-- Idempotent (CREATE TABLE IF NOT EXISTS + DROP POLICY IF EXISTS).

-- ── channel_waitlist ── (src/app/api/waitlist/route.ts) ──────────────────────
-- Public waitlist signups; may be anonymous (user_id nullable). Email is PII →
-- append-only, no public read.
CREATE TABLE IF NOT EXISTS channel_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  source text DEFAULT 'channel_page',
  referrer text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (email)
);
CREATE INDEX IF NOT EXISTS idx_channel_waitlist_created_at ON channel_waitlist(created_at DESC);
ALTER TABLE channel_waitlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anyone can join the waitlist" ON channel_waitlist;
CREATE POLICY "anyone can join the waitlist" ON channel_waitlist FOR INSERT WITH CHECK (true);
-- No SELECT policy → rows readable only via the service role (protects emails).

-- ── loan_collateral ── (src/app/api/loan-collateral/route.ts) ────────────────
-- Links an asset pledged as collateral to a loan; owner-scoped. loan_id/asset_id
-- left without FKs (their owning tables are resolved via the entity registry and
-- ownership is validated in the route, not the schema).
CREATE TABLE IF NOT EXISTS loan_collateral (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid NOT NULL,
  asset_id uuid NOT NULL,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pledged_value numeric,
  currency text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'released', 'liquidated')),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_loan_collateral_loan ON loan_collateral(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_collateral_asset ON loan_collateral(asset_id);
CREATE INDEX IF NOT EXISTS idx_loan_collateral_owner ON loan_collateral(owner_id);
ALTER TABLE loan_collateral ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner reads own collateral" ON loan_collateral;
CREATE POLICY "owner reads own collateral" ON loan_collateral FOR SELECT USING (owner_id = auth.uid());
DROP POLICY IF EXISTS "owner pledges own collateral" ON loan_collateral;
CREATE POLICY "owner pledges own collateral" ON loan_collateral FOR INSERT WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS "owner updates own collateral" ON loan_collateral;
CREATE POLICY "owner updates own collateral" ON loan_collateral FOR UPDATE USING (owner_id = auth.uid());

-- ── project_updates ── (src/app/api/projects/[id]/updates/route.ts) ──────────
-- Activity/updates posted against a project. The read route already gates by
-- project status, so public read is fine; writes require an authenticated user.
CREATE TABLE IF NOT EXISTS project_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type text,
  title text,
  content text,
  amount_btc numeric(18,8),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_project_updates_project ON project_updates(project_id, created_at DESC);
ALTER TABLE project_updates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project updates public read" ON project_updates;
CREATE POLICY "project updates public read" ON project_updates FOR SELECT USING (true);
DROP POLICY IF EXISTS "authenticated can post updates" ON project_updates;
CREATE POLICY "authenticated can post updates" ON project_updates FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ── audit_logs ── (src/lib/api/auditLog.ts) ─────────────────────────────────
-- Append-only security/audit trail. entity_id is text (callers pass ids of mixed
-- shapes). Sensitive → insert allowed, but NO read policy (service-role only).
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type text,
  entity_id text,
  metadata jsonb DEFAULT '{}',
  ip_address text,
  user_agent text,
  success boolean DEFAULT true,
  error_message text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "append audit rows" ON audit_logs;
CREATE POLICY "append audit rows" ON audit_logs FOR INSERT WITH CHECK (true);
-- No SELECT/UPDATE/DELETE policy → the trail is append-only and readable only via
-- the service role.
