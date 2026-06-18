-- Two leftover public-endpoint 500s from the GET sweep:
--
-- 1) /api/jobs (+ all group-proposal listings) 500'd with PGRST200: the queries embed
--    proposer:profiles!group_proposals_proposer_id_fkey, but that FK references
--    auth.users(id), not profiles — so PostgREST can't resolve the embed to profiles.
--    Re-point the FK to profiles(id) (same uuid; profiles.id already FKs auth.users with
--    cascade, so the delete chain is preserved). 0 rows in group_proposals → zero risk.
--    Keep the SAME constraint name so the `!group_proposals_proposer_id_fkey` embed hint
--    in the 3 proposal queries keeps resolving.
--
-- 2) /api/profiles/[id]/entities/{research,wishlist} 500'd: the route filters every entity
--    by show_on_profile, but 20260106000000 added that column to 8 tables and missed
--    research_entities + wishlists. Add it to those two (idempotent), matching the rest.

BEGIN;

ALTER TABLE public.group_proposals DROP CONSTRAINT IF EXISTS group_proposals_proposer_id_fkey;
ALTER TABLE public.group_proposals
  ADD CONSTRAINT group_proposals_proposer_id_fkey
  FOREIGN KEY (proposer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.research_entities ADD COLUMN IF NOT EXISTS show_on_profile BOOLEAN DEFAULT true;
ALTER TABLE public.wishlists        ADD COLUMN IF NOT EXISTS show_on_profile BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_research_entities_show_on_profile
  ON public.research_entities(user_id, show_on_profile) WHERE show_on_profile = true;
CREATE INDEX IF NOT EXISTS idx_wishlists_show_on_profile
  ON public.wishlists(actor_id, show_on_profile) WHERE show_on_profile = true;

COMMIT;

-- PostgREST caches FKs + columns; reload so the embed + new columns are visible now.
NOTIFY pgrst, 'reload schema';
