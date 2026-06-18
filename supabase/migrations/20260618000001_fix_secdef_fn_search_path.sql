-- Systemic fix: a security-hardening pass set `SET search_path = ''` on many
-- SECURITY DEFINER functions but left their table references UNQUALIFIED. With an
-- empty search_path those names resolve to nothing, so every call fails with
-- `relation "<table>" does not exist`. These functions back RLS policies and core
-- features, so the breakage was platform-wide and silent (errors swallowed by
-- callers). Confirmed broken at runtime: get_total_unread_count →
-- "conversation_participants does not exist", check_cat_permission →
-- "cat_permissions does not exist".
--
-- Affected: the entire messaging/conversations system, Cat action permissions +
-- usage, AI-creator withdrawals, and user AI preferences.
--
-- Fix: pin `search_path = public`. This satisfies the "function search path
-- mutable" advisor (search_path is explicitly set, not inherited) and resolves the
-- unqualified table names to public.*. It is safe for SECURITY DEFINER here because
-- on this Supabase instance the anon/authenticated roles cannot CREATE objects in
-- public, so public cannot be shadowed. (The group helper functions were fixed
-- separately with the stricter empty-search_path + fully-qualified refs; both are
-- valid hardened configurations.)

ALTER FUNCTION public.cancel_ai_withdrawal(p_withdrawal_id uuid) SET search_path = public;
ALTER FUNCTION public.check_cat_permission(p_user_id uuid, p_action_id text) SET search_path = public;
ALTER FUNCTION public.complete_ai_withdrawal(p_withdrawal_id uuid) SET search_path = public;
ALTER FUNCTION public.create_direct_conversation(participant1_id uuid, participant2_id uuid) SET search_path = public;
ALTER FUNCTION public.create_group_conversation(p_created_by uuid, p_participant_ids uuid[], p_title text) SET search_path = public;
ALTER FUNCTION public.fail_ai_withdrawal(p_withdrawal_id uuid, p_reason text) SET search_path = public;
ALTER FUNCTION public.get_cat_action_daily_usage(p_user_id uuid, p_action_id text) SET search_path = public;
ALTER FUNCTION public.get_or_create_user_ai_preferences(p_user_id uuid) SET search_path = public;
ALTER FUNCTION public.get_total_unread_count(p_user_id uuid) SET search_path = public;
ALTER FUNCTION public.get_unread_counts(p_user_id uuid) SET search_path = public;
ALTER FUNCTION public.get_user_conversations(p_user_id uuid) SET search_path = public;
ALTER FUNCTION public.mark_conversation_read(p_conversation_id uuid, p_user_id uuid) SET search_path = public;
ALTER FUNCTION public.send_message(p_conversation_id uuid, p_sender_id uuid, p_content text, p_message_type text, p_metadata jsonb) SET search_path = public;
ALTER FUNCTION public.user_is_participant(p_conversation_id uuid, p_user_id uuid) SET search_path = public;

-- check_cat_permission also had column drift: it filtered `cat_permissions` on
-- `is_enabled`, but the table's column is `granted`. (Latent — not called via rpc()
-- in app code today — but fixed for correctness.) Recreated with the right column,
-- keeping the now-correct search_path = public.
CREATE OR REPLACE FUNCTION public.check_cat_permission(p_user_id uuid, p_action_id text)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE perm RECORD;
BEGIN
  SELECT * INTO perm FROM public.cat_permissions
  WHERE user_id = p_user_id AND (action_id = p_action_id OR action_id = '*') AND granted = true
  LIMIT 1;
  IF NOT FOUND THEN RETURN false; END IF;
  RETURN true;
END;
$function$;
