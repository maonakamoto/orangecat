-- ============================================================================
-- Integration Keys (outbound: external services → OrangeCat)
-- ============================================================================
-- Lets sibling products (FleetCrown, hirn.li, third-party integrations)
-- authenticate to OrangeCat's platform API on behalf of an actor.
--
-- A key is minted by a user and bound to a specific actor. The minting user
-- must already be authorised to act as that actor at creation time (server
-- enforces); once minted, every request authenticated by the key acts as
-- that bound actor — no per-request actor switching, no membership recheck.
--
-- Plaintext format: ock_<32-hex>          (e.g. ock_a1b2c3...)
-- Stored: SHA-256 hash + first 11 chars for display (ock_a1b2c3d).
--
-- Created: 2026-06-03
-- ============================================================================

-- ==================== MAIN TABLE ====================

CREATE TABLE IF NOT EXISTS integration_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who minted the key (audit + revocation authority).
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Which actor the key acts as. Entities created via this key are owned
  -- by this actor — same shape as actor_id everywhere else in the schema.
  actor_id UUID NOT NULL REFERENCES actors(id) ON DELETE CASCADE,

  -- Human-readable label ("FleetCrown production", "Local dev key", ...).
  name TEXT NOT NULL,

  -- SHA-256 of the plaintext key. We never store the plaintext.
  key_hash TEXT NOT NULL UNIQUE,

  -- First 11 chars of plaintext for UI display ("ock_a1b2c3d").
  key_prefix TEXT NOT NULL,

  -- Lifecycle timestamps.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,

  CONSTRAINT integration_keys_name_not_blank CHECK (length(trim(name)) > 0)
);

-- ==================== INDEXES ====================

CREATE INDEX IF NOT EXISTS integration_keys_user_id_idx
  ON integration_keys (user_id);

CREATE INDEX IF NOT EXISTS integration_keys_actor_id_idx
  ON integration_keys (actor_id);

-- Hash lookup is the hot path (one query per authenticated request).
-- Only live keys need to match — revoked ones are excluded by the partial
-- index condition, which keeps the index small.
CREATE INDEX IF NOT EXISTS integration_keys_active_hash_idx
  ON integration_keys (key_hash)
  WHERE revoked_at IS NULL;

-- ==================== RLS POLICIES ====================

ALTER TABLE integration_keys ENABLE ROW LEVEL SECURITY;

-- A user can see / create / revoke only their own keys. Revocation = UPDATE
-- (set revoked_at), not DELETE — we keep the audit trail.
CREATE POLICY "Users view own integration keys"
  ON integration_keys FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users create own integration keys"
  ON integration_keys FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users revoke own integration keys"
  ON integration_keys FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ==================== COMMENTS ====================

COMMENT ON TABLE integration_keys IS
  'Outbound platform API keys — let external services (FleetCrown, hirn.li, third-party integrations) authenticate to OrangeCat as a specific actor.';
COMMENT ON COLUMN integration_keys.actor_id IS
  'Actor the key acts as. Validated at mint time (user must be a privileged member if the actor belongs to a group).';
COMMENT ON COLUMN integration_keys.key_hash IS
  'SHA-256 of the plaintext key. Plaintext is shown once at creation and never stored.';
COMMENT ON COLUMN integration_keys.key_prefix IS
  'First 11 chars of the plaintext key for UI display (e.g. "ock_a1b2c3d").';
