-- ============================================================================
-- Multi-key fallback: give user_api_keys an explicit fallback order.
-- ============================================================================
-- The Cat resolver walks the chain top-to-bottom, trying the next key on
-- rate-limit/error. Users can add as many keys as they want; sort_order
-- defines the order they're tried. Lower = tried earlier.
--
-- Idempotent. Additive (default 0). Backfills existing keys: primary first,
-- then by creation time.
-- ============================================================================

ALTER TABLE public.user_api_keys
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- Backfill a sensible initial order per user (primary first, then oldest→newest)
WITH ranked AS (
  SELECT id,
         row_number() OVER (PARTITION BY user_id ORDER BY is_primary DESC, created_at ASC) AS rn
  FROM public.user_api_keys
)
UPDATE public.user_api_keys k
   SET sort_order = r.rn
  FROM ranked r
 WHERE k.id = r.id
   AND k.sort_order = 0;

CREATE INDEX IF NOT EXISTS user_api_keys_order_idx
  ON public.user_api_keys (user_id, sort_order);
