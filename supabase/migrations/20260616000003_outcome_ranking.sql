-- ============================================================================
-- Outcome-based ranking: blend a real-signal quality_score into semantic search.
-- ============================================================================
-- Pure cosine similarity ranks by "how related is this to the query". This adds
-- a quality_score (0–1, computed from REAL signals: recency/last-active, follower
-- count, verification, funding traction) and blends it in — but at a LOW weight
-- so relevance always dominates (a popular-but-irrelevant result never outranks a
-- genuinely relevant one). As real outcomes accumulate (follows, funding, later
-- orders/messages) the same pipeline makes discovery compound.
-- ============================================================================

alter table public.content_embeddings
  add column if not exists quality_score real not null default 0;

-- match_content now: gate by relevance (min_similarity), then order by a blended
-- score = similarity + 0.15 * quality_score.
create or replace function public.match_content(
  query_embedding printcraft.vector(1536),
  match_count int default 8,
  filter_type text default null,
  min_similarity float default 0.35
)
returns table (
  entity_type text,
  entity_id uuid,
  title text,
  url text,
  text_preview text,
  similarity float,
  quality_score float,
  score float
)
language sql
stable
set search_path = public, printcraft
as $$
  select
    ce.entity_type,
    ce.entity_id,
    ce.title,
    ce.url,
    ce.text_preview,
    1 - (ce.embedding <=> query_embedding) as similarity,
    ce.quality_score,
    (1 - (ce.embedding <=> query_embedding)) + 0.15 * coalesce(ce.quality_score, 0) as score
  from public.content_embeddings ce
  where ce.embedding is not null
    and (filter_type is null or ce.entity_type = filter_type)
    and (1 - (ce.embedding <=> query_embedding)) >= min_similarity
  order by score desc
  limit match_count;
$$;
