-- ============================================================================
-- Cat Credits: append-only sats ledger (cat_credit_entries) + atomic append RPC
-- ============================================================================
-- Bitcoin-paid access to frontier models. Users top up a sats balance over
-- Lightning; frontier inference is metered against it. See
-- docs/architecture/CAT_CREDITS.md.
--
-- The LEDGER is the single source of truth (Ground Truth #2 — no floating
-- balance kept in two places). Balance = balance_after of the latest row,
-- with SUM(amount_sats) as the reconciliation check. Credits are prepaid,
-- single-purpose, non-withdrawable service credit (never a wallet).
--
-- Phase 1 of the build: table + read + atomic write primitive. Top-up
-- (Lightning) and usage metering land in later phases and call cat_credit_append.
-- ============================================================================

create table if not exists public.cat_credit_entries (
  id            uuid primary key default uuid_generate_v4(),
  -- Monotonic insertion order. created_at is NOT reliable for "latest entry"
  -- (now() is transaction-stable, so entries posted in one txn/tick tie, and a
  -- random-uuid tiebreaker picks the wrong row). seq orders the ledger exactly.
  seq           bigint generated always as identity,
  user_id       uuid not null references auth.users(id) on delete cascade,
  kind          text not null check (kind in ('topup', 'usage', 'grant', 'refund', 'adjustment')),
  amount_sats   bigint not null,            -- signed: + topup/grant/refund, − usage
  balance_after bigint not null,            -- running balance, set atomically on insert
  ref           text,                       -- lightning payment hash (topup) | cat_messages.id (usage)
  metadata      jsonb,                      -- { model, inputTokens, outputTokens, costBtc, rateSats }
  created_at    timestamptz not null default now()
);

-- Idempotency: a given payment hash / message can only ever post once per kind.
create unique index if not exists cat_credit_entries_kind_ref
  on public.cat_credit_entries (kind, ref) where ref is not null;

-- Per-user history / latest-balance lookup (ordered by the monotonic seq).
create index if not exists cat_credit_entries_user_seq
  on public.cat_credit_entries (user_id, seq desc);

-- Row-level security: a user can READ their own ledger (for the history view).
-- Writes go only through cat_credit_append (SECURITY DEFINER) — there is no
-- user insert/update/delete policy, so the ledger is append-only and
-- tamper-proof from the client even though it's user-readable.
alter table public.cat_credit_entries enable row level security;

drop policy if exists cat_credit_entries_select_own on public.cat_credit_entries;
create policy cat_credit_entries_select_own on public.cat_credit_entries
  for select using (user_id = auth.uid());

-- Current balance for a user (0 if no entries). RLS-respecting.
create or replace function public.cat_credit_balance(p_user_id uuid)
returns bigint
language sql
stable
set search_path = public
as $$
  select coalesce(
    (select balance_after
       from public.cat_credit_entries
      where user_id = p_user_id
      order by seq desc
      limit 1),
    0
  );
$$;

-- Atomic ledger append. Serializes per-user with an advisory lock, computes the
-- new running balance, refuses to let a usage debit go negative, and inserts.
-- SECURITY DEFINER so the server can post entries that RLS would otherwise block
-- — callers must be trusted server code (service-role / server route). Returns
-- the new balance.
create or replace function public.cat_credit_append(
  p_user_id uuid,
  p_kind text,
  p_amount_sats bigint,
  p_ref text default null,
  p_metadata jsonb default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current bigint;
  v_new bigint;
begin
  -- Serialize concurrent appends for this user so balance_after is consistent.
  perform pg_advisory_xact_lock(hashtext(p_user_id::text));

  v_current := public.cat_credit_balance(p_user_id);
  v_new := v_current + p_amount_sats;

  if v_new < 0 then
    raise exception 'insufficient_credits' using errcode = 'check_violation';
  end if;

  insert into public.cat_credit_entries (user_id, kind, amount_sats, balance_after, ref, metadata)
  values (p_user_id, p_kind, p_amount_sats, v_new, p_ref, p_metadata);

  return v_new;
end;
$$;

-- Lock the append function down: only the service role may call it (server-side
-- top-up / metering). Clients read via RLS-selected rows + cat_credit_balance.
revoke all on function public.cat_credit_append(uuid, text, bigint, text, jsonb) from public, anon, authenticated;
