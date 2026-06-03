-- ============================================================================
-- Optimistic-claim status for Idempotency-Key dedup
-- ============================================================================
-- Fixes the race the 2026-06-03 audit flagged as P0: two concurrent
-- requests with the same Idempotency-Key both miss the cache (because
-- the row hasn't been written yet), both execute, both call the entity
-- create, and only the SECOND store hits the unique-violation guard —
-- by which time TWO entity rows already exist.
--
-- Fix: claim the row optimistically at the start of processing.
--
--   'pending'  → row inserted by Request A, work in flight, response_*
--                columns NULL
--   'complete' → response_status + response_body populated, can be replayed
--
-- Request B's insert collides on UNIQUE (user_id, key, path), sees the
-- existing row is 'pending', polls until 'complete', returns the
-- winner's response. Net: no duplicate entity creation under parallel
-- retries, no double rate-limit charge, no DB drift.
--
-- Created: 2026-06-03
-- ============================================================================

ALTER TABLE idempotency_results
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';

-- Existing rows are by definition complete — they have response data.
UPDATE idempotency_results
SET status = 'complete'
WHERE status = 'pending' AND response_status IS NOT NULL;

-- Make response columns nullable so a 'pending' row can exist before
-- the work is done.
ALTER TABLE idempotency_results
  ALTER COLUMN response_status DROP NOT NULL;

ALTER TABLE idempotency_results
  ALTER COLUMN response_body DROP NOT NULL;

ALTER TABLE idempotency_results
  ADD CONSTRAINT idempotency_results_status_check
  CHECK (status IN ('pending', 'complete'));

COMMENT ON COLUMN idempotency_results.status IS
  'pending = row claimed but work in flight; complete = response populated. Race-safe: parallel retries with the same key collide on the unique (user_id, key, path) index and the loser polls until the winner sets complete.';
