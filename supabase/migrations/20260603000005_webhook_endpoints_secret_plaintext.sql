-- ============================================================================
-- webhook_endpoints — swap secret_hash → secret_plaintext
-- ============================================================================
-- 211188a3 stored signing secrets as sha256 hashes, but the firing worker
-- needs the plaintext to compute X-OrangeCat-Signature on every delivery.
-- This migration drops the hash column and adds a plaintext column.
--
-- PHASE-2 DEBT: encrypt at rest with a master KMS key (AES-256-GCM with
-- WEBHOOK_SECRET_KEY from env). Tracked at docs/api/CONVENTIONS.md §6.
--
-- Zero rows exist when this lands (table created hours earlier in
-- 20260603000004), so dropping the column without preserving data is
-- risk-free.
--
-- Created: 2026-06-03
-- ============================================================================

ALTER TABLE webhook_endpoints DROP COLUMN secret_hash;
ALTER TABLE webhook_endpoints ADD COLUMN secret_plaintext TEXT NOT NULL;
ALTER TABLE webhook_endpoints ADD CONSTRAINT webhook_endpoints_secret_not_blank
  CHECK (length(trim(secret_plaintext)) > 0);

COMMENT ON COLUMN webhook_endpoints.secret_plaintext IS
  'Webhook signing secret in plaintext. PHASE-2 DEBT: encrypt at rest with a master KMS key.';
