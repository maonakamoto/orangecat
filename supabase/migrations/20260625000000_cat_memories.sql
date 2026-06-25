-- ============================================================================
-- Cat persistent memory: cat_memories + match_cat_memories RPC (pgvector)
-- ============================================================================
-- One row per durable fact the Cat has learned about a user ("Prefers
-- Lightning over on-chain", "Building FleetCrown, a life-OS for builders").
-- Facts are extracted from chat (and explicit "remember that…" asks),
-- embedded, and recalled by MEANING on later turns — so Cat carries context
-- across sessions instead of re-deriving everything from a budget-capped pack.
--
-- Unlike public.content_embeddings (public, search-facing), this is PRIVATE
-- per-user data → row-level security, scoped to the owner.
--
-- Schema note: pgvector lives in the `printcraft` schema on this self-host box
-- (see 20260616000001_content_embeddings.sql), so we schema-qualify
-- `printcraft.vector`. Dimension 1536 = OpenAI text-embedding-3-small (default
-- embeddings provider; swappable via env — a model with a different dimension
-- needs a new migration recreating the column + index).
-- ============================================================================

create table if not exists public.cat_memories (
  id                     uuid primary key default uuid_generate_v4(),
  user_id                uuid not null references auth.users(id) on delete cascade,
  content                text not null,                          -- the fact, third person
  embedding              printcraft.vector(1536),                -- meaning vector (null if embeddings disabled)
  source                 text not null default 'chat',           -- 'chat' | 'explicit'
  source_conversation_id uuid references public.cat_conversations(id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- HNSW cosine index for fast nearest-neighbour recall (scales with the corpus).
create index if not exists cat_memories_hnsw
  on public.cat_memories using hnsw (embedding printcraft.vector_cosine_ops);

-- Listing / pruning by recency, per user.
create index if not exists cat_memories_user_created
  on public.cat_memories (user_id, created_at desc);

-- Row-level security: a user can only ever see or touch their own memories.
alter table public.cat_memories enable row level security;

drop policy if exists cat_memories_select_own on public.cat_memories;
create policy cat_memories_select_own on public.cat_memories
  for select using (user_id = auth.uid());

drop policy if exists cat_memories_insert_own on public.cat_memories;
create policy cat_memories_insert_own on public.cat_memories
  for insert with check (user_id = auth.uid());

drop policy if exists cat_memories_update_own on public.cat_memories;
create policy cat_memories_update_own on public.cat_memories
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists cat_memories_delete_own on public.cat_memories;
create policy cat_memories_delete_own on public.cat_memories
  for delete using (user_id = auth.uid());

-- Nearest memories for one user by cosine similarity, gated on a relevance floor.
-- SECURITY INVOKER (default) so the caller's RLS still applies — the explicit
-- user_id filter is belt-and-suspenders and lets a service client scope too.
-- search_path includes printcraft so the `<=>` distance operator resolves.
create or replace function public.match_cat_memories(
  p_user_id uuid,
  query_embedding printcraft.vector(1536),
  match_count int default 6,
  min_similarity float default 0.3
)
returns table (
  id uuid,
  content text,
  similarity float,
  created_at timestamptz
)
language sql
stable
set search_path = public, printcraft
as $$
  select
    cm.id,
    cm.content,
    1 - (cm.embedding <=> query_embedding) as similarity,
    cm.created_at
  from public.cat_memories cm
  where cm.user_id = p_user_id
    and cm.embedding is not null
    and 1 - (cm.embedding <=> query_embedding) >= min_similarity
  order by cm.embedding <=> query_embedding
  limit match_count;
$$;
