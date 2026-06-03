-- ============================================================================
-- Sandbox mode: is_test flag on integration_keys + every public-API
-- entity table.
-- ============================================================================
-- Customers want to test integration-key calls (auth, request shapes,
-- response parsing) without affecting production data. This migration
-- lands the persistence foundation; the matching service + handler
-- changes ship in the same commit so sandbox keys are immediately
-- functional via curl — no half-baked "sandbox key, real data"
-- intermediate state.
--
-- Mechanics:
--   - integration_keys.is_test  → which keys are sandbox keys
--   - <entity>.is_test          → which rows were created via a sandbox key
--   - entityPostHandler stamps it from auth.isTest at insert time
--   - entityListHandler filters by it on integration-key reads
--
-- Default false on every row, so existing data + existing keys remain
-- "live" without backfill. Plaintext key format changes too: sandbox
-- keys mint as `ock_test_<hex>` (application layer only — the DB just
-- stores the boolean + the prefix in key_prefix).
--
-- Public-API entity tables that gain is_test (one per PUBLIC_API_ENTITY_TYPES):
--   user_products, user_services, projects, user_causes, events,
--   loans, investments, assets, wishlists
--
-- Mint-UI checkbox follows in commit 2.
--
-- Created: 2026-06-04
-- ============================================================================

ALTER TABLE integration_keys ADD COLUMN is_test BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE user_products    ADD COLUMN is_test BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE user_services    ADD COLUMN is_test BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE projects         ADD COLUMN is_test BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE user_causes      ADD COLUMN is_test BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE events           ADD COLUMN is_test BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE loans            ADD COLUMN is_test BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE investments      ADD COLUMN is_test BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE assets           ADD COLUMN is_test BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE wishlists        ADD COLUMN is_test BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN integration_keys.is_test IS
  'Sandbox keys. Plaintext format ock_test_<hex>. Only sees/writes is_test=true entities; live keys only see/write is_test=false.';
