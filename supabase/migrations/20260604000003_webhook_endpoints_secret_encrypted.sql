-- ============================================================================
-- Phase 1 of 2: webhook_endpoints.secret_encrypted (encrypt-at-rest)
-- ============================================================================
-- The PHASE-2 debt I documented when 20260603000005 swapped secret_hash for
-- secret_plaintext: webhook signing secrets need encryption-at-rest with a
-- master KMS key. This migration adds the encrypted column alongside the
-- existing plaintext column. Service dual-writes on mint; reads still come
-- from secret_plaintext so the worker keeps signing deliveries identically.
--
-- Commit 2 will:
--   1. Backfill secret_encrypted from secret_plaintext (no-op today since
--      no prod rows exist yet).
--   2. Flip getEndpointSigningContext to decrypt secret_encrypted.
--   3. Drop the secret_plaintext column.
--
-- Encryption: AES-256-GCM with WEBHOOK_SECRET_KEY env var (32-byte key).
-- Ciphertext blob layout: IV(12B) || GCM tag(16B) || ciphertext.
--
-- Created: 2026-06-04
-- ============================================================================

ALTER TABLE webhook_endpoints ADD COLUMN secret_encrypted BYTEA;

COMMENT ON COLUMN webhook_endpoints.secret_encrypted IS
  'AES-256-GCM ciphertext of the signing secret. Layout: IV(12B)||tag(16B)||ciphertext. Decrypted with WEBHOOK_SECRET_KEY env var. Phase 1: dual-write with secret_plaintext. Phase 2 will drop secret_plaintext.';
