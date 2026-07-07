# Spec — Configurable wallet/funding visibility (step 4) + sats→BTC cleanup status

**Status:** Draft for review · **Author:** OrangeCat agent · **Date:** 2026-07-06
**Driver:** Revamp-IT dogfooding — BTC funding on OrangeCat with a transparency
toggle (public/private), reusing existing primitives.

---

## TL;DR

- **Step 4 (the real work):** add ONE polymorphic transparency toggle on the
  `entity_wallets` junction + two `SECURITY DEFINER` read RPCs. Works uniformly
  for `cause` / `project` / `group` / `research`. ~1 migration + 1 read helper +
  1 owner-settings control. No entity-registry change.
- **sats→BTC cleanup:** the **funding rail is already BTC and already applied to
  the box** (migration `20260404000006` + follow-ups; live-schema.json confirms
  `amount_btc`/`current_balance_btc`, zero `_sats`). Nothing blocks Revamp-IT.
  Residual = legacy/dead tables + a type regen + a regression guard. Separate,
  non-blocking.

---

## Part A — Step 4: configurable funding visibility

### A0. Design decision (why the toggle lives on `entity_wallets`)

`entity_wallets` is already the polymorphic SSOT link
`{ wallet_id, entity_type, entity_id, is_primary }` joining _any_ entity to its
receiving wallet(s). Transparency of "the money" is a property of that link:

- **DRY / SSOT:** one column serves every entity type — no per-table column
  sprawl across `projects` / `user_causes` / `groups` / `research_entities`.
  Passes the "2 files, not 5" test.
- **Correct grain:** a wallet can be attached to two entities and be public on
  one, private on the other — the _link_ is the right place, not the wallet and
  not the entity.
- Donor-level privacy is **already** handled per-contribution by
  `contributions.is_anonymous` — we do not duplicate it.

### A1. Schema — `entity_wallets.visibility`

```sql
-- supabase/migrations/20260706000000_entity_wallet_visibility.sql
ALTER TABLE entity_wallets
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('private', 'total', 'public'));

COMMENT ON COLUMN entity_wallets.visibility IS
  'Fundraising transparency for this wallet↔entity link. '
  'private = only owner/members see address, total, supporters. '
  'total   = public sees running total + goal progress (aggregate only). '
  'public  = public also sees the non-anonymous supporter list + receiving address.';
```

Three levels (progressive disclosure of transparency), defaulting to **private** —
matching George's "not fully public by default." Collapsible to a boolean later
if the middle tier proves unused (YAGNI escape hatch), but he explicitly
distinguished _balances_ from _donations_, so two independent reveals = 3 levels
is the right granularity now.

**Note on the raw address:** funding does not require the address to be publicly
listed — `payment_intents` generates a per-payment invoice
(`nwc` / `lightning_address` / `onchain`) at pay time. So `private`/`total` can
hide the standing address and funding still works. `public` additionally reveals
the standing receiving address for those who want to verify on-chain.

### A2. RLS

`entity_wallets` today: owners view/create/delete; link creators view. Add:

```sql
-- Public may read a link only when it is not private (needed to render address/QR).
CREATE POLICY "Public can view non-private wallet links" ON entity_wallets
  FOR SELECT USING (visibility <> 'private');

-- Wallet owner can flip the toggle (no UPDATE policy exists today).
CREATE POLICY "Wallet owners can update links" ON entity_wallets
  FOR UPDATE USING (wallet_id IN (SELECT id FROM wallets WHERE profile_id = auth.uid()))
  WITH CHECK   (wallet_id IN (SELECT id FROM wallets WHERE profile_id = auth.uid()));
```

**Ownership nuance to confirm with George:** the toggle is controlled by the
**wallet** owner (`wallets.profile_id`), not the entity's actor. For Revamp-IT,
George owns both, so it's moot. If we later want the _entity_ owner (e.g. a group
admin who isn't the wallet holder) to control it, the UPDATE policy widens to an
actor/group-membership check. Flagging, not deciding.

### A3. Honest public total — `get_entity_funding_stats` RPC

Why an RPC and not a client `SUM`: the existing `contributions` "public view
non-anonymous" policy hides anonymous rows **entirely**, so a client-side public
sum would **undercount** (drop anonymous donations). We want the truthful total
(including anonymous _amounts_) without leaking anonymous _identities_. That
requires `SECURITY DEFINER`. This is also the "**ledger sum, not cached wallet
balance**" honesty rule from the earlier reply — the total is derived from the
real `contributions` ledger, never from a snapshot balance field that a later
chain refresh can overwrite.

```sql
CREATE OR REPLACE FUNCTION get_entity_funding_stats(p_entity_type text, p_entity_id uuid)
RETURNS TABLE (total_btc numeric, contributor_count bigint, named_supporter_count bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_visibility text;
BEGIN
  SELECT visibility INTO v_visibility
  FROM entity_wallets
  WHERE entity_type = p_entity_type AND entity_id = p_entity_id AND is_primary = true
  ORDER BY created_at LIMIT 1;

  IF v_visibility IS NULL OR v_visibility = 'private' THEN
    RETURN;                       -- expose nothing
  END IF;

  RETURN QUERY
  SELECT COALESCE(SUM(c.amount_btc), 0)::numeric,
         COUNT(*)::bigint,
         COUNT(*) FILTER (WHERE c.is_anonymous = false)::bigint
  FROM contributions c
  WHERE c.entity_type = p_entity_type AND c.entity_id = p_entity_id;
END; $$;

GRANT EXECUTE ON FUNCTION get_entity_funding_stats(text, uuid) TO anon, authenticated;
```

`contributions` is the _settled_ ledger (rows inserted only on confirmed payment;
no pending status), so no status filter is needed. Progress bar = `total_btc` vs
the entity's goal (`projects.goal_amount` / `user_causes.goal_amount`).

### A4. Supporter list honors the toggle

Today `contributions` has a blanket **"Public view non-anonymous"** policy — every
non-anonymous contribution is world-readable regardless of any setting. To make it
configurable, gate it by the entity's visibility:

```sql
DROP POLICY IF EXISTS "Public view non-anonymous" ON contributions;
CREATE POLICY "Public view supporters when entity is public" ON contributions
  FOR SELECT USING (
    is_anonymous = false
    AND EXISTS (
      SELECT 1 FROM entity_wallets ew
      WHERE ew.entity_type = contributions.entity_type
        AND ew.entity_id  = contributions.entity_id
        AND ew.visibility = 'public'
    )
  );
```

Owner-view and contributor-view policies are unchanged. Low risk: 0 payments in
prod to date, so tightening this blanket policy breaks nothing live. (If we'd
rather not touch the hot table's RLS, the alternative is a `get_entity_supporters`
RPC that checks `visibility='public'` and returns non-anonymous
`{ display_name, amount_btc, message, created_at }`. Either is fine; the RLS
tighten is more SSOT-correct.)

### A5. App wiring

| Layer | Change                                                                                                                                                                                       |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Read  | `src/services/wallets/funding-stats.ts` → calls `get_entity_funding_stats`; returns `null` for private. Rendered on the public entity page (total + progress; supporter list when `public`). |
| Write | Owner settings: a 3-option control (`private` / `total` / `public`) on the wallet-attach / entity-funding settings screen → updates `entity_wallets.visibility`.                             |
| Types | Regenerate DB types so `entity_wallets.visibility` is typed.                                                                                                                                 |
| Guard | `npm run audit:schema` picks up the new column via live-schema refresh.                                                                                                                      |

### A6. Files touched (blast radius)

1. `supabase/migrations/20260706000000_entity_wallet_visibility.sql` — column +
   RLS + RPC.
2. `src/services/wallets/funding-stats.ts` + the public entity page read + the
   owner toggle control.
3. DB type regen.

No `entity-registry.ts` change (polymorphic). Passes the 2-files/blast-radius
tests.

---

## Part B — sats→BTC cleanup: status & residual

### B1. Already done (verified against migrations + live-schema.json)

Migration `20260404000006_sats_to_btc.sql` (26 columns / 16 tables) + follow-ups
(`20260508000001`, `20260625140000`, `20260627000000/1`) converted the entire
funding rail to `NUMERIC(18,8)` `*_btc`, **and it's live on the box**
(`scripts/db/live-schema.json` shows `amount_btc` ×14, `current_balance_btc`,
zero `_sats`). Application code reads/writes `amount_btc` throughout
(`domain/payments/*`, `services/groups/mutations/treasury.ts`, wishlists, assets,
cat-credits). **Zero funding-rail `_sats` DB-field references remain in `src/`.**

**⇒ The sats→BTC cleanup does not block Revamp-IT funding.** The primitives it
uses (`cause` + `entity_wallets` + `contributions` + `payment_intents`) are 100%
BTC-clean.

### B2. Keep as-is (correct protocol/display usage — NOT storage)

`bitcoinToSats` / `satsToBitcoin` in `conversion.ts`, invoice generation
(`invoiceGenerationService.ts` — bolt11 is denominated in sats/msats), mempool /
NWC live-balance fetch, and `formatSats` display helpers. Sats is a legitimate
Lightning **protocol** and display unit; the rule forbids _storing_ amounts as
sats, not converting to sats at the protocol boundary. The ~60 `_sats`
identifiers in `src/` are all in this legitimate set.

### B3. Residual debt (non-blocking, separate cleanup)

Legacy/dead tables still holding raw sats, none written by active payment code:

- `ai_user_credits` (`balance_sats`, `total_deposited_sats`, `total_spent_sats`)
- `ai_credit_transactions.amount_sats`
- `organizations.total_balance_sats`, `organization_wallets.*_sats`
- `user_assets.*_sats` (superseded by the live `assets` table's `_btc` columns)
- `loans.amount_sats` (redundant beside `original_amount`/`remaining_balance` + `currency`)

Recommended handling (own PR, after confirming each is dead):

1. Grep for live writers; if dead → `DROP COLUMN` / drop table in a migration.
   If used → convert `/1e8` + rename, same pattern as `20260404000006`.
2. **Regenerate `src/types/database.ts`** — it still carries the `_sats` shapes
   for `user_assets` / `ai_user_credits` / `ai_credit_transactions`
   (`:2006/2871/2901`) and `database-tables.ts:94-95`.
3. **Regression guard:** extend `audit:schema` (or a lint rule) to fail CI if a
   NEW `*_sats` _storage_ column or `.*_sats` DB-field access appears — allow-list
   the protocol/display set from B2. Prevents drift from creeping back.

---

## Open decisions for George

1. **3 levels vs boolean** for `visibility` (recommend 3: `private/total/public`).
2. **Who controls the toggle** — wallet owner (default, simplest) vs entity/group
   owner (needs a wider UPDATE policy). Moot for Revamp-IT (George owns both).
3. **Do the B3 dead-table cleanup now or defer?** It's independent of Revamp-IT
   funding — recommend defer to its own PR so step 4 ships unblocked.
