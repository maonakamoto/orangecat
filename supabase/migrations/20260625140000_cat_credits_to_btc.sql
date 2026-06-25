-- ============================================================================
-- Cat Credits: convert ledger from sats to BTC (canonical-unit fix)
-- ============================================================================
-- 20260625120000 introduced cat_credit_entries in sats (amount_sats /
-- balance_after bigint), violating the platform rule that BTC is the canonical
-- unit (NUMERIC(18,8); "sats" don't exist as a product concept — they're a
-- Lightning protocol detail only). This converts the ledger + its functions to
-- BTC. Safe: no rows exist yet (every balance is 0).
--
-- NUMERIC(18,8) gives 1-sat precision, ample for metering inference. Sats now
-- appear ONLY at the Lightning protocol boundary (the makeInvoice call).
-- ============================================================================

-- Idempotent: the column rename only happens if the old column still exists, so
-- this is safe to re-run (the deploy pipeline auto-applies migrations, and the
-- conversion may already have been applied directly). Renames first, then the
-- type widening (which is a no-op if already numeric(18,8)).
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'cat_credit_entries'
      and column_name = 'amount_sats'
  ) then
    alter table public.cat_credit_entries rename column amount_sats to amount_btc;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'cat_credit_entries'
      and column_name = 'balance_after'
  ) then
    alter table public.cat_credit_entries rename column balance_after to balance_after_btc;
  end if;
end $$;

alter table public.cat_credit_entries
  alter column amount_btc type numeric(18, 8) using amount_btc::numeric;
alter table public.cat_credit_entries
  alter column balance_after_btc type numeric(18, 8) using balance_after_btc::numeric;

-- Functions returned/took bigint; recreate them in BTC. Drop first (return-type
-- and arg-type changes require it).
drop function if exists public.cat_credit_balance(uuid);
drop function if exists public.cat_credit_append(uuid, text, bigint, text, jsonb);

create or replace function public.cat_credit_balance(p_user_id uuid)
returns numeric
language sql
stable
set search_path = public
as $$
  select coalesce(
    (select balance_after_btc
       from public.cat_credit_entries
      where user_id = p_user_id
      order by seq desc
      limit 1),
    0
  );
$$;

create or replace function public.cat_credit_append(
  p_user_id uuid,
  p_kind text,
  p_amount_btc numeric,
  p_ref text default null,
  p_metadata jsonb default null
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current numeric;
  v_new numeric;
begin
  perform pg_advisory_xact_lock(hashtext(p_user_id::text));

  v_current := public.cat_credit_balance(p_user_id);
  v_new := v_current + p_amount_btc;

  if v_new < 0 then
    raise exception 'insufficient_credits' using errcode = 'check_violation';
  end if;

  insert into public.cat_credit_entries (user_id, kind, amount_btc, balance_after_btc, ref, metadata)
  values (p_user_id, p_kind, p_amount_btc, v_new, p_ref, p_metadata);

  return v_new;
end;
$$;

revoke all on function public.cat_credit_append(uuid, text, numeric, text, jsonb) from public, anon, authenticated;
