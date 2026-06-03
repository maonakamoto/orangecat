-- ============================================================================
-- Idempotency results — Idempotency-Key dedup on mutating endpoints
-- ============================================================================
-- Implements the contract documented in docs/api/CONVENTIONS.md §4 and the
-- header the SDK already sends on every mutating call.
--
-- Semantics:
--   - Same (user, key, path) + same body within the TTL → return cached
--     response. Network blip retries are safe.
--   - Same (user, key, path) + DIFFERENT body → 422 idempotency_violation.
--     Catches reused keys (a real bug on the client side).
--   - 5xx responses are NEVER cached — the server might recover on retry.
--
-- TTL: 24h. Old rows are pruned by an out-of-band job (not yet scheduled);
-- the expires_at column is the lookup gate either way.
--
-- Created: 2026-06-03
-- ============================================================================

CREATE TABLE IF NOT EXISTS idempotency_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who issued the request. user_id from the session OR from the
  -- integration key — both paths converge to a single user.
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Client-supplied Idempotency-Key header value. Trusted opaquely.
  key TEXT NOT NULL,

  -- HTTP method + path scope the key applies to. Reusing a key across
  -- endpoints is treated as a different cache entry — clients aren't
  -- expected to share keys across endpoints.
  method TEXT NOT NULL,
  path TEXT NOT NULL,

  -- SHA-256 of the canonical JSON request body. Drives the
  -- "same key + different body = 422" rule.
  body_hash TEXT NOT NULL,

  -- The cached response.
  response_status INTEGER NOT NULL,
  response_body JSONB NOT NULL,

  -- Lifecycle.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

-- A given user reusing the same key + same endpoint is the matched cache
-- entry. Unique so concurrent retries can't double-insert.
CREATE UNIQUE INDEX IF NOT EXISTS idempotency_results_user_key_path_idx
  ON idempotency_results (user_id, key, path);

-- For the eventual cleanup job + ad-hoc dashboards.
CREATE INDEX IF NOT EXISTS idempotency_results_expires_at_idx
  ON idempotency_results (expires_at);

-- ============================================================================
-- RLS
-- ============================================================================
-- The application accesses this table via the admin client (this is
-- infrastructure, not user data). RLS is enabled with a deny-by-default
-- policy so any future direct exposure stays safe.

ALTER TABLE idempotency_results ENABLE ROW LEVEL SECURITY;

-- Users can never SELECT/INSERT/UPDATE/DELETE their own rows directly —
-- the cache is server-managed only. No policies = deny-by-default.

COMMENT ON TABLE idempotency_results IS
  'Server-managed Idempotency-Key dedup cache. 24h TTL. Server reads/writes via the admin client; users have no direct access.';
