-- Add group_proposals.execution_result — referenced (read + written) by
-- src/services/groups/execution/index.ts since proposal execution shipped, but
-- never migrated onto the schema. The write is `.update({ executed_at,
-- execution_result })`; with the column missing, PostgREST rejects the whole
-- update, so executed_at never persists and a proposal can re-run. Stores the
-- handler outcome: { ok: boolean, action?: string, error?: string }.
--
-- This drift was invisible until the schema-drift guard learned to see the
-- shared fromTable() helper (2026-07-14). Idempotent — safe if a box already
-- has the column.

ALTER TABLE public.group_proposals
  ADD COLUMN IF NOT EXISTS execution_result JSONB;
