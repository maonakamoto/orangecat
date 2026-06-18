-- Reconcile the `transactions` table with the entity-based schema the app expects.
--
-- PROBLEM: the live `transactions` table is the original funding-page schema
--   (id, funding_page_id NOT NULL, amount, transaction_hash NOT NULL, status,
--    amount_btc) but the platform moved to an entity model long ago. Every current
--   reader/writer speaks an ENTITY schema that NO migration ever defined:
--     - POST /api/transactions      inserts {amount_btc, currency, from/to_entity_type,
--                                    from/to_entity_id, payment_method, status, anonymous,
--                                    message, public_visibility}
--     - domain/wallets/transferService inserts the same + {purpose, initiated_at,
--                                    confirmed_at, settled_at} and calls RPC
--                                    transfer_between_wallets(...)  ← also never defined
--     - services/timeline reads a transaction row (only needs it to EXIST)
--   So wallet-to-wallet transfers AND project contributions via these paths have been
--   100% broken (PostgREST 400: column does not exist / NOT NULL violation on the dead
--   funding_page_id), and the balance-moving RPC is missing entirely.
--
-- SAFE TO REBUILD: the table has 0 rows, no inbound foreign keys, and its legacy
--   target `funding_pages` no longer exists — so there is nothing to migrate or break.
--   We drop the zombie and recreate it with the schema the code already agrees on.

BEGIN;

DROP TABLE IF EXISTS public.transactions CASCADE;

CREATE TABLE public.transactions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amount_btc         numeric(18, 8) NOT NULL CHECK (amount_btc > 0),
  currency           text NOT NULL DEFAULT 'BTC',
  -- Polymorphic endpoints: an entity is a 'profile' or a 'project'. Intentionally NO
  -- FK — the id can reference either profiles.id or projects.id depending on _type.
  from_entity_type   text NOT NULL CHECK (from_entity_type IN ('profile', 'project')),
  from_entity_id     uuid NOT NULL,
  to_entity_type     text NOT NULL CHECK (to_entity_type IN ('profile', 'project')),
  to_entity_id       uuid NOT NULL,
  payment_method     text,                                   -- 'bitcoin' | 'lightning' | 'on-chain'
  purpose            text,                                   -- e.g. 'internal_transfer'
  message            text,
  anonymous          boolean NOT NULL DEFAULT false,
  public_visibility  boolean NOT NULL DEFAULT false,
  -- App writes 'pending'|'completed'|'failed' (STATUS.TRANSACTIONS). 'confirmed' is
  -- accepted too: the (currently dormant) sync_project_funding trigger keys on it, so
  -- keeping it valid avoids a future surprise if that trigger is ever bound.
  status             text NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'confirmed', 'completed', 'failed',
                                         'cancelled', 'refunded')),
  initiated_at       timestamptz,
  confirmed_at       timestamptz,
  settled_at         timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_from_entity ON public.transactions (from_entity_id);
CREATE INDEX idx_transactions_to_entity   ON public.transactions (to_entity_id);
CREATE INDEX idx_transactions_to_status   ON public.transactions (to_entity_type, status);
CREATE INDEX idx_transactions_created_at  ON public.transactions (created_at DESC);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- READ: public rows are world-readable; otherwise you can see transactions you sent or
-- received (as a profile = your auth uid, or via a project wallet you own).
CREATE POLICY transactions_select ON public.transactions
  FOR SELECT
  USING (
    public_visibility = true
    OR from_entity_id = (SELECT auth.uid())
    OR to_entity_id   = (SELECT auth.uid())
    OR from_entity_id IN (SELECT w.project_id FROM public.wallets w
                          WHERE w.user_id = (SELECT auth.uid()) AND w.project_id IS NOT NULL)
    OR to_entity_id   IN (SELECT w.project_id FROM public.wallets w
                          WHERE w.user_id = (SELECT auth.uid()) AND w.project_id IS NOT NULL)
  );

-- INSERT: the sender must be the authenticated user — either acting as their own
-- profile (from_entity_id = auth.uid()) or from a project wallet they own. This covers
-- both writers (the /api/transactions route uses the profile case; transferService uses
-- either) WITHOUT needing the project-ownership table, since wallet.user_id proves it.
CREATE POLICY transactions_insert ON public.transactions
  FOR INSERT TO authenticated
  WITH CHECK (
    from_entity_id = (SELECT auth.uid())
    OR from_entity_id IN (SELECT w.project_id FROM public.wallets w
                          WHERE w.user_id = (SELECT auth.uid()) AND w.project_id IS NOT NULL)
  );

-- UPDATE: only the sender can mutate (e.g. a payment callback flipping pending→completed).
CREATE POLICY transactions_update ON public.transactions
  FOR UPDATE TO authenticated
  USING (
    from_entity_id = (SELECT auth.uid())
    OR from_entity_id IN (SELECT w.project_id FROM public.wallets w
                          WHERE w.user_id = (SELECT auth.uid()) AND w.project_id IS NOT NULL)
  );

-- Atomic balance move between two wallets. transferService already verifies wallet
-- ownership + sufficient balance in app code; this is the DB-level critical section:
-- lock both rows, re-check balance, then move. SECURITY DEFINER so the user's client can
-- update wallet balances it can't write directly. search_path pinned (see the 0618 fns).
CREATE OR REPLACE FUNCTION public.transfer_between_wallets(
  p_from_wallet_id uuid,
  p_to_wallet_id   uuid,
  p_amount_btc     numeric,
  p_transaction_id uuid
) RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_from_balance numeric;
BEGIN
  IF p_amount_btc IS NULL OR p_amount_btc <= 0 THEN
    RAISE EXCEPTION 'Transfer amount must be positive';
  END IF;
  IF p_from_wallet_id = p_to_wallet_id THEN
    RAISE EXCEPTION 'Cannot transfer to the same wallet';
  END IF;

  -- Lock source then destination (ordered by id elsewhere isn't needed for 2 rows here,
  -- but lock source first and re-check before touching anything).
  SELECT balance_btc INTO v_from_balance
    FROM public.wallets WHERE id = p_from_wallet_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source wallet not found';
  END IF;
  IF v_from_balance < p_amount_btc THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  PERFORM 1 FROM public.wallets WHERE id = p_to_wallet_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Destination wallet not found';
  END IF;

  UPDATE public.wallets
     SET balance_btc = balance_btc - p_amount_btc,
         balance_updated_at = now(), updated_at = now()
   WHERE id = p_from_wallet_id;

  UPDATE public.wallets
     SET balance_btc = balance_btc + p_amount_btc,
         balance_updated_at = now(), updated_at = now()
   WHERE id = p_to_wallet_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.transfer_between_wallets(uuid, uuid, numeric, uuid)
  TO authenticated, service_role;

COMMIT;
