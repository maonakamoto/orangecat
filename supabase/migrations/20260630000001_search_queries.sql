-- Search queries — aggregate demand signal
--
-- What people actually search for on OrangeCat: the richest demand signal there is,
-- and the one piece demand-grounded growth was missing (see demand-signals.ts and
-- the growth nudge). Logged only on a COMMITTED search (the ⌘K "Search Discover for X"
-- Enter handler), so it's real intent, not keystroke noise.
--
-- Privacy by construction: we store the query TEXT and an optional result count —
-- NO user id, NO IP, nothing that ties a search to a person. It's a pure aggregate of
-- "what is wanted here". A search that returns few/no results is the gold signal:
-- explicit, unmet demand.
--
-- RLS is enabled with NO policies: normal clients can neither read nor write it; only
-- the server (service-role admin client) logs to it and reads it for nudges/offers.

CREATE TABLE IF NOT EXISTS search_queries (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  query        TEXT NOT NULL,              -- normalized: lowercased, trimmed
  result_count INTEGER,                    -- how many results it returned (null if unknown)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_queries_created_at ON search_queries (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_queries_query ON search_queries (query);

ALTER TABLE search_queries ENABLE ROW LEVEL SECURITY;
-- Intentionally no policies → server-only (service-role bypasses RLS).
