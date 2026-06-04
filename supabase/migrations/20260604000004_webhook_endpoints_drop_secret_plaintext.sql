-- ============================================================================
-- Phase 2 of 2: drop webhook_endpoints.secret_plaintext
-- ============================================================================
-- 20260604000003 added secret_encrypted alongside secret_plaintext and the
-- service started dual-writing. This migration finishes the encryption swap:
--
--   1. (Backfill) UPDATE — no-op today (verified zero rows in prod), kept
--      as documentation in this SQL for any future deploy of the same
--      migration against a populated table.
--   2. Drop the CHECK constraint that targeted secret_plaintext.
--   3. Enforce NOT NULL on secret_encrypted (now load-bearing).
--   4. Drop the secret_plaintext column.
--
-- The matching service commit:
--   - createWebhookEndpoint: writes only secret_encrypted, no longer
--     selects secret_plaintext.
--   - getEndpointSigningContext: reads secret_encrypted and decrypts via
--     decryptWebhookSecret before returning to the worker.
--
-- Operational note: rotating WEBHOOK_SECRET_KEY now requires
-- re-encrypting every row. See INTEGRATION_DEPLOY_CHECKLIST step 9.
--
-- Created: 2026-06-04
-- ============================================================================

-- Drop the constraint that targeted the column we're about to drop.
ALTER TABLE webhook_endpoints DROP CONSTRAINT webhook_endpoints_secret_not_blank;

-- Enforce non-null on the column that's now load-bearing.
ALTER TABLE webhook_endpoints ALTER COLUMN secret_encrypted SET NOT NULL;

-- Drop the plaintext column. The service no longer reads or writes it.
ALTER TABLE webhook_endpoints DROP COLUMN secret_plaintext;
