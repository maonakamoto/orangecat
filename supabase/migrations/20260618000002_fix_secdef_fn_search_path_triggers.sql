-- Continuation of 20260618000001: the same empty-search_path-with-unqualified-refs
-- bug also affects trigger functions and a few more helpers. A broken TRIGGER fails
-- the whole insert/update on its table, so this silently broke core writes.
-- Confirmed by inspecting bodies:
--   sync_project_funding (trigger on confirmed contributions) does
--     `UPDATE projects SET raised_amount = ...` unqualified → fails → project funding
--     totals never update (or the contribution aborts). The funding flow was broken.
--   set_wallet_user_id (trigger on wallet insert) does `FROM projects` unqualified →
--     project-owned wallet creation fails.
--   reset_task_on_completion (task update), update_cat_conversation_timestamp (Cat
--     message), plus AI-revenue / AI-withdrawal / cat-pending-action helpers.
--
-- Fix: pin search_path = public (see 20260618000001 for the full rationale — safe
-- here, satisfies the search-path-mutable advisor).

ALTER FUNCTION public.expire_cat_pending_actions() SET search_path = public;
ALTER FUNCTION public.increment_ai_revenue(p_assistant_id uuid, p_creator_id uuid, p_amount numeric) SET search_path = public;
ALTER FUNCTION public.request_ai_withdrawal(p_creator_id uuid, p_amount numeric, p_destination text) SET search_path = public;
ALTER FUNCTION public.reset_task_on_completion() SET search_path = public;
ALTER FUNCTION public.set_wallet_user_id() SET search_path = public;
ALTER FUNCTION public.sync_project_funding() SET search_path = public;
ALTER FUNCTION public.update_cat_conversation_timestamp() SET search_path = public;
