-- ============================================================================
-- Semantic search foundation: content_embeddings + match_content RPC (pgvector)
-- ============================================================================
-- One row per searchable item (profiles + active entities) holding a meaning
-- vector. The Cat embeds a search query and finds nearest items by cosine
-- distance — matching by MEANING, not just shared keywords.
--
-- NOTE on schema: pgvector 0.8.0 is already installed on this self-host box, in
-- the `printcraft` schema (another app on the shared box installed it there; an
-- extension is database-wide but its type lives in one schema, and relocating it
-- would risk breaking that app). So we schema-qualify `printcraft.vector`. If the
-- box is ever rebuilt with pgvector elsewhere, only this file changes.
--
-- Dimension 1536 = OpenAI text-embedding-3-small (default provider; swappable via
-- env). Table holds only PUBLIC content (public profiles, active entities) so it
-- needs no row-level privacy.
-- ============================================================================

create table if not exists public.content_embeddings (
  entity_type  text not null,                 -- 'profile' | 'product' | 'service' | 'cause' | ...
  entity_id    uuid not null,
  title        text,                           -- display title (denormalized for one-call search)
  url          text,                           -- where the item lives
  text_preview text,                           -- the text that was embedded (debug/preview)
  embedding    printcraft.vector(1536),
  updated_at   timestamptz not null default now(),
  primary key (entity_type, entity_id)
);

-- HNSW cosine index — fast nearest-neighbour search; fine at small scale, scales up.
create index if not exists content_embeddings_hnsw
  on public.content_embeddings using hnsw (embedding printcraft.vector_cosine_ops);

-- Nearest matches by cosine similarity, optional type filter. Returns only
-- denormalized public display fields. search_path includes printcraft so the
-- `<=>` distance operator resolves.
create or replace function public.match_content(
  query_embedding printcraft.vector(1536),
  match_count int default 8,
  filter_type text default null
)
returns table (
  entity_type text,
  entity_id uuid,
  title text,
  url text,
  text_preview text,
  similarity float
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
    1 - (ce.embedding <=> query_embedding) as similarity
  from public.content_embeddings ce
  where ce.embedding is not null
    and (filter_type is null or ce.entity_type = filter_type)
  order by ce.embedding <=> query_embedding
  limit match_count;
$$;
