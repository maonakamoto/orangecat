-- ============================================================================
-- integration_keys.scopes — least-privilege per-key authority
-- ============================================================================
-- Today every key has full authority over its bound actor's entities. A
-- leaked product-only key can still fund-grab. This migration adds a
-- per-key scope allowlist.
--
-- Default '{*}' = wildcard, preserves today's behaviour for existing keys.
-- New keys can be minted with a narrower list like '{products.write,
-- services.read}'. The format is "<entity>.<read|write>" tokens, plus
-- the special "*" meaning all.
--
-- Enforcement lands in the same commit (service + resolveRequestAuth +
-- entityPostHandler + entityListHandler). UI for picking scopes at mint
-- time is a follow-up.
--
-- Created: 2026-06-04
-- ============================================================================

ALTER TABLE integration_keys
  ADD COLUMN scopes TEXT[] NOT NULL DEFAULT ARRAY['*']::TEXT[];

COMMENT ON COLUMN integration_keys.scopes IS
  'Allowed operations. "*" is wildcard. Otherwise an array of "<entity>.<read|write>" tokens (e.g. "products.write").';
