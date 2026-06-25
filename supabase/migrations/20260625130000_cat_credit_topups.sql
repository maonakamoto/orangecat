-- ============================================================================
-- Cat Credits Phase 2: pending Lightning top-ups (cat_credit_topups)
-- ============================================================================
-- Maps a platform-issued Lightning invoice → the user who should be credited
-- when it settles. Without this map, a settled payment_hash couldn't be tied
-- back to the right buyer (and a poller could try to claim someone else's
-- payment). On settlement the server posts a `topup` entry to the
-- cat_credit_entries ledger (idempotent via unique(kind, ref=payment_hash)).
--
-- Receiving backend is a platform NWC wallet (PLATFORM_NWC_URI) — abstracted,
-- so it can later point at self-hosted LNbits/BTCPay with no code change.
-- See docs/architecture/CAT_CREDITS.md.
-- ============================================================================

create table if not exists public.cat_credit_topups (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  -- BTC is the canonical unit platform-wide (NUMERIC(18,8) = 1-sat precision).
  -- Sats appear ONLY at the Lightning protocol boundary (the makeInvoice call).
  amount_btc    numeric(18, 8) not null check (amount_btc > 0),
  payment_hash  text not null unique,         -- the invoice's payment hash
  bolt11        text not null,                -- the invoice to pay
  status        text not null default 'pending' check (status in ('pending', 'paid', 'expired')),
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null,
  paid_at       timestamptz
);

create index if not exists cat_credit_topups_user_created
  on public.cat_credit_topups (user_id, created_at desc);

-- RLS: a user can read their own top-ups (to poll status). Writes are
-- server-only (service role) — the invoice is created and settled by trusted
-- server code, so there are no client insert/update policies.
alter table public.cat_credit_topups enable row level security;

drop policy if exists cat_credit_topups_select_own on public.cat_credit_topups;
create policy cat_credit_topups_select_own on public.cat_credit_topups
  for select using (user_id = auth.uid());
