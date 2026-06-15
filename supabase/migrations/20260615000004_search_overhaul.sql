-- ============================================================================
-- Search overhaul: real relevance, typo tolerance, accent-insensitive,
-- weighted full-text + trigram, across the main entity types.
-- ============================================================================
--
-- WHY: the app calls search_profiles_fts / search_projects_fts, but those RPCs
-- were never deployed to the self-host (only the storage `search` fn exists),
-- so production search silently fell back to unindexed ILIKE — no ranking, no
-- typo tolerance. This deploys proper search and upgrades it to best practice:
--   * weighted full-text (title > description/bio) via setweight + ts_rank
--   * websearch_to_tsquery — supports "quoted phrases", OR, and -exclusion
--   * accent-insensitive via an IMMUTABLE f_unaccent() wrapper
--   * typo tolerance + short/partial queries via pg_trgm similarity + prefix
--   * GIN indexes (FTS expression + trigram) so it stays fast
--   * a unified global_search() for the ⌘K command palette (ranked, mixed type)
--
-- Idempotent. Extensions live in the `extensions` schema (Supabase convention),
-- so trigram/unaccent are schema-qualified and functions set search_path.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm  WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

-- IMMUTABLE unaccent wrapper (2-arg dict form) so it's usable in expression indexes
CREATE OR REPLACE FUNCTION public.f_unaccent(text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
  AS $fn$ SELECT extensions.unaccent('extensions.unaccent'::regdictionary, $1) $fn$;

-- Trigram score of a query "needle" against a document, using word_similarity
-- (matches the needle against the best-matching word/extent of doc) so a
-- single-word typo scores high even against a long multi-word title.
CREATE OR REPLACE FUNCTION public.f_score(doc text, needle text) RETURNS real
  LANGUAGE sql IMMUTABLE PARALLEL SAFE
  AS $fn$ SELECT extensions.word_similarity(needle, doc) $fn$;

-- ---------------------------------------------------------------------------
-- Indexes: FTS expression (for @@ filtering) + trigram (for typo/prefix)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_fts2 ON profiles USING gin
  (to_tsvector('english', public.f_unaccent(coalesce(username,'')||' '||coalesce(name,'')||' '||coalesce(bio,''))));
CREATE INDEX IF NOT EXISTS idx_profiles_trgm ON profiles USING gin
  (public.f_unaccent(coalesce(username,'')||' '||coalesce(name,'')) extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_projects_fts2 ON projects USING gin
  (to_tsvector('english', public.f_unaccent(coalesce(title,'')||' '||coalesce(description,''))));
CREATE INDEX IF NOT EXISTS idx_projects_trgm ON projects USING gin
  (public.f_unaccent(coalesce(title,'')) extensions.gin_trgm_ops);

DO $idx$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['user_products','user_services','user_causes','loans','events'] LOOP
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON %I USING gin (to_tsvector(''english'', public.f_unaccent(coalesce(title,'''')||'' ''||coalesce(description,''''))))',
      'idx_'||t||'_fts2', t);
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON %I USING gin (public.f_unaccent(coalesce(title,'''')) extensions.gin_trgm_ops)',
      'idx_'||t||'_trgm', t);
  END LOOP;
END $idx$;

-- ---------------------------------------------------------------------------
-- search_profiles_fts (drop-in: same signature & columns the app maps)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.search_profiles_fts(text,int,int);
CREATE OR REPLACE FUNCTION public.search_profiles_fts(
  p_query text, p_limit int DEFAULT 20, p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid, username text, name text, bio text, avatar_url text,
  created_at timestamptz, location_country text, location_city text,
  location_zip text, latitude double precision, longitude double precision
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  uq text := public.f_unaccent(coalesce(p_query,''));
  q  tsquery := websearch_to_tsquery('english', uq);
  pat text := '%'||uq||'%';
BEGIN
  IF length(trim(uq)) = 0 THEN RETURN; END IF;
  RETURN QUERY
  SELECT p.id, p.username, p.name, p.bio, p.avatar_url, p.created_at,
         p.location_country, p.location_city, p.location_zip, p.latitude, p.longitude
  FROM profiles p
  WHERE to_tsvector('english', public.f_unaccent(coalesce(p.username,'')||' '||coalesce(p.name,'')||' '||coalesce(p.bio,''))) @@ q
     OR public.f_unaccent(coalesce(p.username,'')||' '||coalesce(p.name,'')) ILIKE pat
     OR public.f_score(public.f_unaccent(coalesce(p.username,'')||' '||coalesce(p.name,'')), uq) > 0.4
  ORDER BY
    ts_rank(
      setweight(to_tsvector('english', public.f_unaccent(coalesce(p.username,'')||' '||coalesce(p.name,''))), 'A') ||
      setweight(to_tsvector('english', public.f_unaccent(coalesce(p.bio,''))), 'C'), q
    )
    + 0.4 * public.f_score(public.f_unaccent(coalesce(p.username,'')||' '||coalesce(p.name,'')), uq) DESC,
    p.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END $$;

-- ---------------------------------------------------------------------------
-- search_projects_fts (drop-in: same signature & columns the app maps)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.search_projects_fts(text,int,int);
CREATE OR REPLACE FUNCTION public.search_projects_fts(
  p_query text, p_limit int DEFAULT 20, p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid, user_id uuid, title text, description text, bitcoin_address text,
  created_at timestamptz, updated_at timestamptz, category text, status text,
  goal_amount numeric, currency text, raised_amount numeric, cover_image_url text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  uq text := public.f_unaccent(coalesce(p_query,''));
  q  tsquery := websearch_to_tsquery('english', uq);
  pat text := '%'||uq||'%';
BEGIN
  IF length(trim(uq)) = 0 THEN RETURN; END IF;
  RETURN QUERY
  SELECT pr.id, pr.user_id, pr.title, pr.description, pr.bitcoin_address,
         pr.created_at, pr.updated_at, pr.category, pr.status, pr.goal_amount,
         pr.currency, pr.raised_amount, pr.cover_image_url
  FROM projects pr
  WHERE to_tsvector('english', public.f_unaccent(coalesce(pr.title,'')||' '||coalesce(pr.description,''))) @@ q
     OR public.f_unaccent(coalesce(pr.title,'')||' '||coalesce(pr.description,'')) ILIKE pat
     OR public.f_score(public.f_unaccent(coalesce(pr.title,'')), uq) > 0.4
  ORDER BY
    ts_rank(
      setweight(to_tsvector('english', public.f_unaccent(coalesce(pr.title,''))), 'A') ||
      setweight(to_tsvector('english', public.f_unaccent(coalesce(pr.description,''))), 'B'), q
    )
    + 0.4 * public.f_score(public.f_unaccent(coalesce(pr.title,'')), uq) DESC,
    pr.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END $$;

-- ---------------------------------------------------------------------------
-- global_search: one ranked list across the main entity types (⌘K palette)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.global_search(text,int);
CREATE OR REPLACE FUNCTION public.global_search(
  p_query text, p_limit int DEFAULT 20
)
RETURNS TABLE (
  entity_type text, id uuid, title text, subtitle text, image_url text, rank real
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
#variable_conflict use_column
DECLARE
  uq  text := public.f_unaccent(coalesce(p_query,''));
  q   tsquery := websearch_to_tsquery('english', uq);
  pat text := '%'||uq||'%';
BEGIN
  IF length(trim(uq)) = 0 THEN RETURN; END IF;
  RETURN QUERY
  WITH hits AS (
    -- projects
    SELECT 'project'::text et, pr.id, pr.title,
           left(coalesce(pr.description,''),140) sub, pr.cover_image_url img,
           (ts_rank(to_tsvector('english', public.f_unaccent(coalesce(pr.title,'')||' '||coalesce(pr.description,''))), q)
            + 0.4*public.f_score(public.f_unaccent(coalesce(pr.title,'')), uq))::real rk, pr.created_at
    FROM projects pr
    WHERE pr.status IN ('active','paused') AND (
      to_tsvector('english', public.f_unaccent(coalesce(pr.title,'')||' '||coalesce(pr.description,''))) @@ q
      OR public.f_unaccent(coalesce(pr.title,'')) ILIKE pat
      OR public.f_score(public.f_unaccent(coalesce(pr.title,'')), uq) > 0.4)
    UNION ALL
    -- profiles
    SELECT 'profile', p.id, coalesce(nullif(p.name,''), p.username),
           '@'||coalesce(p.username,''), p.avatar_url,
           (ts_rank(to_tsvector('english', public.f_unaccent(coalesce(p.username,'')||' '||coalesce(p.name,'')||' '||coalesce(p.bio,''))), q)
            + 0.4*public.f_score(public.f_unaccent(coalesce(p.username,'')||' '||coalesce(p.name,'')), uq))::real, p.created_at
    FROM profiles p
    WHERE to_tsvector('english', public.f_unaccent(coalesce(p.username,'')||' '||coalesce(p.name,'')||' '||coalesce(p.bio,''))) @@ q
      OR public.f_unaccent(coalesce(p.username,'')||' '||coalesce(p.name,'')) ILIKE pat
      OR public.f_score(public.f_unaccent(coalesce(p.username,'')||' '||coalesce(p.name,'')), uq) > 0.4
  ),
  more AS (
    -- products / services / causes / loans / events (title+description)
    SELECT et, id, title, sub, NULL::text img, rk, created_at FROM (
      SELECT 'product'::text et, x.id, x.title, left(coalesce(x.description,''),140) sub,
             (ts_rank(to_tsvector('english', public.f_unaccent(coalesce(x.title,'')||' '||coalesce(x.description,''))), q)
              + 0.4*public.f_score(public.f_unaccent(coalesce(x.title,'')), uq))::real rk, x.created_at
      FROM user_products x WHERE x.status='active' AND (
        to_tsvector('english', public.f_unaccent(coalesce(x.title,'')||' '||coalesce(x.description,''))) @@ q
        OR public.f_unaccent(coalesce(x.title,'')) ILIKE pat OR public.f_score(public.f_unaccent(coalesce(x.title,'')), uq) > 0.4)
      UNION ALL
      SELECT 'service', x.id, x.title, left(coalesce(x.description,''),140),
             (ts_rank(to_tsvector('english', public.f_unaccent(coalesce(x.title,'')||' '||coalesce(x.description,''))), q)
              + 0.4*public.f_score(public.f_unaccent(coalesce(x.title,'')), uq))::real, x.created_at
      FROM user_services x WHERE x.status='active' AND (
        to_tsvector('english', public.f_unaccent(coalesce(x.title,'')||' '||coalesce(x.description,''))) @@ q
        OR public.f_unaccent(coalesce(x.title,'')) ILIKE pat OR public.f_score(public.f_unaccent(coalesce(x.title,'')), uq) > 0.4)
      UNION ALL
      SELECT 'cause', x.id, x.title, left(coalesce(x.description,''),140),
             (ts_rank(to_tsvector('english', public.f_unaccent(coalesce(x.title,'')||' '||coalesce(x.description,''))), q)
              + 0.4*public.f_score(public.f_unaccent(coalesce(x.title,'')), uq))::real, x.created_at
      FROM user_causes x WHERE x.status='active' AND (
        to_tsvector('english', public.f_unaccent(coalesce(x.title,'')||' '||coalesce(x.description,''))) @@ q
        OR public.f_unaccent(coalesce(x.title,'')) ILIKE pat OR public.f_score(public.f_unaccent(coalesce(x.title,'')), uq) > 0.4)
      UNION ALL
      SELECT 'loan', x.id, x.title, left(coalesce(x.description,''),140),
             (ts_rank(to_tsvector('english', public.f_unaccent(coalesce(x.title,'')||' '||coalesce(x.description,''))), q)
              + 0.4*public.f_score(public.f_unaccent(coalesce(x.title,'')), uq))::real, x.created_at
      FROM loans x WHERE x.is_public AND x.status='active' AND (
        to_tsvector('english', public.f_unaccent(coalesce(x.title,'')||' '||coalesce(x.description,''))) @@ q
        OR public.f_unaccent(coalesce(x.title,'')) ILIKE pat OR public.f_score(public.f_unaccent(coalesce(x.title,'')), uq) > 0.4)
      UNION ALL
      SELECT 'event', x.id, x.title, left(coalesce(x.description,''),140),
             (ts_rank(to_tsvector('english', public.f_unaccent(coalesce(x.title,'')||' '||coalesce(x.description,''))), q)
              + 0.4*public.f_score(public.f_unaccent(coalesce(x.title,'')), uq))::real, x.created_at
      FROM events x WHERE x.status='active' AND (
        to_tsvector('english', public.f_unaccent(coalesce(x.title,'')||' '||coalesce(x.description,''))) @@ q
        OR public.f_unaccent(coalesce(x.title,'')) ILIKE pat OR public.f_score(public.f_unaccent(coalesce(x.title,'')), uq) > 0.4)
    ) s
  )
  SELECT et, id, title, sub, img, rk
  FROM (SELECT et, id, title, sub, img, rk, created_at FROM hits
        UNION ALL SELECT et, id, title, sub, img, rk, created_at FROM more) u
  ORDER BY rk DESC, created_at DESC
  LIMIT p_limit;
END $$;

GRANT EXECUTE ON FUNCTION public.search_profiles_fts(text,int,int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_projects_fts(text,int,int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.global_search(text,int)           TO anon, authenticated;
