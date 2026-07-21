-- Index the DEMAND side of the market and enable two-sided introductions.
--
-- Until now content_embeddings held only supply (product/service/cause). This
-- lets a "need" (a public, active wishlist) live in the same vector space so it
-- can be matched to the supply that would meet it, and adds the plumbing for a
-- push introduction between the two people. Fully idempotent.

-- 1. Reconcile wishlist writes into content_embeddings (same webhook trigger the
--    supply tables already use; entity type passed as the trigger argument).
--    Wishlists key on visibility/is_active, so the UPDATE gate watches those.
DROP TRIGGER IF EXISTS trg_embed_wishlist_ins ON public.wishlists;
CREATE TRIGGER trg_embed_wishlist_ins
  AFTER INSERT OR DELETE ON public.wishlists
  FOR EACH ROW EXECUTE FUNCTION public.notify_embedding_reindex('wishlist');

DROP TRIGGER IF EXISTS trg_embed_wishlist_upd ON public.wishlists;
CREATE TRIGGER trg_embed_wishlist_upd
  AFTER UPDATE ON public.wishlists
  FOR EACH ROW
  WHEN (
    old.title IS DISTINCT FROM new.title
    OR old.description IS DISTINCT FROM new.description
    OR old.is_active IS DISTINCT FROM new.is_active
    OR old.visibility IS DISTINCT FROM new.visibility
  )
  EXECUTE FUNCTION public.notify_embedding_reindex('wishlist');

-- 2. Idempotency ledger for introductions: each (supply, demand) pair is
--    introduced at most once, no matter how many times either side re-indexes.
CREATE TABLE IF NOT EXISTS public.match_introductions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supply_type  text NOT NULL,
  supply_id    uuid NOT NULL,
  demand_type  text NOT NULL,
  demand_id    uuid NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT match_introductions_pair_unique
    UNIQUE (supply_type, supply_id, demand_type, demand_id)
);
-- Service-role-only (the reindex path writes it); RLS on, no policies.
ALTER TABLE public.match_introductions ENABLE ROW LEVEL SECURITY;

-- 3. Allow the 'match' notification type so both parties can be told.
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (
  type = ANY (ARRAY[
    'follow','payment','project_funded','message','comment','like','mention',
    'system','task_attention','task_request','task_completed','task_broadcast',
    'match'
  ]::text[])
);
