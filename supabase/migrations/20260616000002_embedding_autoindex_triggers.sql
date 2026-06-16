-- ============================================================================
-- Near-instant auto-indexing: DB triggers ping the reindex endpoint (pg_net,
-- async — does NOT block the write) for just the changed row on any write to a
-- searchable table. Captures EVERY write path (UI, the Cat, admin) with zero
-- application coupling. The every-2-min cron stays as a safety net.
-- ============================================================================
-- pg_net (net.http_post) is already installed on the box. The reindex secret is
-- read from a private config table (set separately at apply time, not in this
-- file) so it isn't committed. Triggers only fire on text-relevant changes.
-- ============================================================================

create schema if not exists private;

-- Holds the reindex secret. In `private` (not exposed by PostgREST), no grants
-- to anon/authenticated. Value inserted at apply time from the app env.
create table if not exists private.reindex_config (
  id int primary key default 1,
  secret text,
  constraint reindex_config_singleton check (id = 1)
);

create or replace function public.notify_embedding_reindex()
returns trigger
language plpgsql
security definer
as $$
declare
  v_secret text;
  v_id uuid;
begin
  select secret into v_secret from private.reindex_config limit 1;
  if v_secret is null or v_secret = '' then
    return coalesce(new, old);
  end if;
  v_id := coalesce(new.id, old.id);
  perform net.http_post(
    url := 'https://orangecat.ch/api/admin/reindex-embeddings',
    body := jsonb_build_object('entity_type', tg_argv[0], 'entity_id', v_id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-reindex-secret', v_secret)
  );
  return coalesce(new, old);
end;
$$;

-- profiles: insert/delete always; update only when text-relevant fields change.
drop trigger if exists trg_embed_profiles_ins on public.profiles;
create trigger trg_embed_profiles_ins
  after insert or delete on public.profiles
  for each row execute function public.notify_embedding_reindex('profile');
drop trigger if exists trg_embed_profiles_upd on public.profiles;
create trigger trg_embed_profiles_upd
  after update on public.profiles
  for each row
  when (
    old.name is distinct from new.name
    or old.bio is distinct from new.bio
    or old.location_city is distinct from new.location_city
  )
  execute function public.notify_embedding_reindex('profile');

-- entities: insert/delete always; update only on title/description/status change.
do $$
declare
  t record;
begin
  for t in
    select unnest(array['user_products','user_services','user_causes']) as tbl,
           unnest(array['product','service','cause']) as etype
  loop
    execute format('drop trigger if exists trg_embed_%s_ins on public.%I', t.etype, t.tbl);
    execute format(
      'create trigger trg_embed_%s_ins after insert or delete on public.%I
       for each row execute function public.notify_embedding_reindex(%L)',
      t.etype, t.tbl, t.etype
    );
    execute format('drop trigger if exists trg_embed_%s_upd on public.%I', t.etype, t.tbl);
    execute format(
      'create trigger trg_embed_%s_upd after update on public.%I
       for each row when (old.title is distinct from new.title
         or old.description is distinct from new.description
         or old.status is distinct from new.status)
       execute function public.notify_embedding_reindex(%L)',
      t.etype, t.tbl, t.etype
    );
  end loop;
end $$;
