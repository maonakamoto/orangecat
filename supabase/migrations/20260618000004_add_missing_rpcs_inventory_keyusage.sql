-- Two RPCs the app calls that don't exist on the self-host (migration-drift class —
-- same root cause as the missing transfer_between_wallets). Found by diffing every
-- code `.rpc('name')` against pg_proc on the live box.
--
--   update_key_usage   — defined in 20260108000001_create_user_api_keys.sql but never
--                        applied to the box (the user_api_keys TABLE made it, the
--                        FUNCTION didn't — partial application). Caller ignores the
--                        error, so BYOK usage stats (last_used_at / request + token
--                        counts) have silently never been recorded.
--   decrement_inventory — never had a migration at all. The checkout flow
--                        (paymentFlowService) calls it to atomically reduce stock after
--                        a purchase; with it missing the call no-ops (non-fatal), so
--                        product inventory is NEVER decremented → overselling, the exact
--                        thing the call comments say it prevents.
--
-- (Two more missing RPCs — search_profiles_nearby / search_projects_nearby — need the
--  PostGIS extension, which isn't installed on this box. Their callers fall back to
--  FTS/regular search on error, so radius search degrades gracefully rather than
--  breaking. Installing PostGIS + geography columns + GiST indexes is a separate infra
--  decision and is intentionally NOT done here.)

-- search_path pinned to public (satisfies the search-path-mutable advisor; see
-- 20260618000001 for the full rationale).

CREATE OR REPLACE FUNCTION public.update_key_usage(
  p_key_id      uuid,
  p_tokens_used bigint DEFAULT 0
) RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  UPDATE public.user_api_keys
     SET total_requests    = total_requests + 1,
         total_tokens_used = total_tokens_used + p_tokens_used,
         last_used_at      = now(),
         updated_at        = now()
   WHERE id = p_key_id;
END;
$$;

-- Atomically decrement stock for an inventoried entity after a confirmed purchase.
-- Only products carry inventory (column inventory_count); other entity types are a
-- no-op. NULL inventory_count = "untracked / unlimited" and is left alone. The buyer
-- is not the product owner, so SECURITY DEFINER is required to write the seller's row;
-- the guard (decrement only when count > 0) makes that safe.
CREATE OR REPLACE FUNCTION public.decrement_inventory(
  p_entity_type text,
  p_entity_id   uuid
) RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  IF p_entity_type = 'product' THEN
    UPDATE public.user_products
       SET inventory_count = inventory_count - 1,
           updated_at = now()
     WHERE id = p_entity_id
       AND inventory_count IS NOT NULL
       AND inventory_count > 0;
  END IF;
  -- other entity types: no inventory concept, intentionally no-op
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_key_usage(uuid, bigint)   TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.decrement_inventory(text, uuid)  TO authenticated, service_role;
