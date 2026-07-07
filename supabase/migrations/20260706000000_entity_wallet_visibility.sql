-- Configurable funding transparency for wallet↔entity links.
--
-- Driver: Revamp-IT dogfooding — an org funds itself in BTC on OrangeCat and
-- chooses how much of the fundraise is public. Transparency is a toggle, not
-- forced, and defaults to private.
--
-- The toggle lives on entity_wallets (the polymorphic junction linking any
-- entity — cause / project / group / research — to its receiving wallet). One
-- column serves every entity type: no per-table column sprawl. A wallet linked
-- to two entities can be public on one and private on the other, so the LINK is
-- the correct grain, not the wallet and not the entity.
--
-- Donor-level privacy is already handled per-contribution by
-- contributions.is_anonymous; this migration does not duplicate it.

-- =====================================================================
-- 1) The toggle
-- =====================================================================

ALTER TABLE entity_wallets
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('private', 'total', 'public'));

COMMENT ON COLUMN entity_wallets.visibility IS
  'Fundraising transparency for this wallet-entity link. '
  'private = only owner/members see address, total, supporters. '
  'total   = public sees the running total + goal progress (aggregate only). '
  'public  = public also sees the non-anonymous supporter list + receiving address.';

-- =====================================================================
-- 2) RLS — public may read a non-private link; the wallet owner may flip it
-- =====================================================================

-- Anyone may read a link once it is not private (needed to render the
-- address / QR on the public page). Private links stay owner-only via the
-- existing "Wallet owners can view links" policy.
DO $$ BEGIN
  CREATE POLICY "Public can view non-private wallet links" ON entity_wallets
    FOR SELECT USING (visibility <> 'private');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- The wallet owner controls the toggle. entity_wallets had no UPDATE policy;
-- ownership is keyed off the wallet (wallets.profile_id), matching how the
-- other entity_wallets policies scope access.
DO $$ BEGIN
  CREATE POLICY "Wallet owners can update links" ON entity_wallets
    FOR UPDATE
    USING (wallet_id IN (SELECT id FROM wallets WHERE profile_id = auth.uid()))
    WITH CHECK (wallet_id IN (SELECT id FROM wallets WHERE profile_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================================
-- 3) Honest public total — SECURITY DEFINER RPC
-- =====================================================================
--
-- Why an RPC and not a client-side SUM: the "Public view non-anonymous"
-- policy on contributions hides anonymous rows entirely, so a public sum would
-- UNDERCOUNT by dropping anonymous donations. We want the truthful total
-- (anonymous AMOUNTS included) without ever leaking anonymous IDENTITIES —
-- that requires SECURITY DEFINER. The number is derived from the real
-- contributions ledger, never from a cached wallet balance (which a later
-- chain refresh can overwrite, i.e. lie).
--
-- contributions is the settled ledger (rows are inserted only on confirmed
-- payment; the table carries no pending status), so no status filter is needed.

CREATE OR REPLACE FUNCTION get_entity_funding_stats(
  p_entity_type text,
  p_entity_id uuid
)
RETURNS TABLE (
  total_btc numeric,
  contributor_count bigint,
  named_supporter_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_visibility text;
BEGIN
  -- Resolve the transparency level from the primary wallet link.
  SELECT ew.visibility INTO v_visibility
  FROM entity_wallets ew
  WHERE ew.entity_type = p_entity_type
    AND ew.entity_id = p_entity_id
    AND ew.is_primary = true
  ORDER BY ew.created_at
  LIMIT 1;

  -- Private, or no primary link → expose nothing (empty result).
  IF v_visibility IS NULL OR v_visibility = 'private' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(SUM(c.amount_btc), 0)::numeric,
    COUNT(*)::bigint,
    COUNT(*) FILTER (WHERE c.is_anonymous = false)::bigint
  FROM contributions c
  WHERE c.entity_type = p_entity_type
    AND c.entity_id = p_entity_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_entity_funding_stats(text, uuid) TO anon, authenticated;

COMMENT ON FUNCTION get_entity_funding_stats(text, uuid) IS
  'Honest public funding total for an entity, gated by its primary wallet link '
  'visibility. Sums all settled contributions (anonymous amounts included) but '
  'never exposes anonymous identities. Returns no rows when the fundraise is '
  'private. Ledger-derived — not a cached wallet balance.';

-- =====================================================================
-- 4) Supporter list honors the toggle
-- =====================================================================
--
-- Previously every non-anonymous contribution was world-readable regardless of
-- any setting. Gate that public read by the entity's visibility = 'public'.
-- Owner-view and contributor-view policies are unchanged.

DROP POLICY IF EXISTS "Public view non-anonymous" ON contributions;

DO $$ BEGIN
  CREATE POLICY "Public view supporters when entity is public" ON contributions
    FOR SELECT USING (
      is_anonymous = false
      AND EXISTS (
        SELECT 1 FROM entity_wallets ew
        WHERE ew.entity_type = contributions.entity_type
          AND ew.entity_id = contributions.entity_id
          AND ew.visibility = 'public'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
