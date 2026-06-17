-- ============================================================================
-- Async publish bus — external clients (FleetCrown) → OrangeCat wall.
--
-- FleetCrown keeps its own private build-event spine and ASYNC-publishes the
-- publish-worthy ones onto a project's OrangeCat wall (timeline_events) via
-- POST /api/v1/timeline/publish (OIDC bearer, scope timeline.write). The publish
-- must be idempotent + reconcilable: FleetCrown may retry the same event, and a
-- later edit of the same source event must UPDATE the OC row, never duplicate it.
--
-- The dedup key is the (source, external_id) pair carried in metadata:
--   metadata->>'source'      e.g. "fleetcrown"
--   metadata->>'external_id' the stable id from the source's event spine
-- This partial unique index is the DB-level race backstop behind the
-- select-then-insert/update in services/timeline/externalPublish.ts (a concurrent
-- double-publish loses the INSERT race with 23505 and falls back to UPDATE).
--
-- Scoped to rows that actually carry an external_id, so ordinary user posts
-- (no external_id) are unaffected.
-- ============================================================================

create unique index if not exists timeline_events_external_publish_uidx
  on public.timeline_events ((metadata ->> 'source'), (metadata ->> 'external_id'))
  where (metadata ? 'external_id');
