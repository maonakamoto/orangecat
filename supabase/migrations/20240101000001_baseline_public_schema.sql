-- ============================================================================
-- BASELINE — complete OrangeCat `public` schema (squash of pre-2026-07 history)
--
-- Generated from the live production DB (supabase.orangecat.ch) on 2026-07-07 via
--   pg_dump --schema-only --schema=public --no-owner
-- It REPLACES the earlier per-feature migrations. Those were backfilled onto the
-- box (which was seeded from a cloud dump) and never actually executed, so they
-- could not rebuild the schema from an empty database — DR / new-box provisioning
-- was broken and the migration-replay CI check failed on them. This baseline is
-- the authoritative, replayable starting point; future migrations stack on top.
--
-- The box records this file as already-applied (public.schema_migrations), so it
-- never re-runs there — it only executes on a fresh DB (CI replay, DR rebuild).
--
-- Extensions live outside `public` (so --schema=public omitted their CREATE
-- EXTENSION), and the old migrations that installed them are squashed away —
-- declare them idempotently here so a fresh DB resolves the referenced types.
-- NOTE: pgvector sits in the `printcraft` schema on the shared box; replicated
-- here to match production 1:1. TODO: relocate to `extensions` on a dedicated box.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE SCHEMA IF NOT EXISTS printcraft;
CREATE EXTENSION IF NOT EXISTS pg_trgm     SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS unaccent    SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto    SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS vector      SCHEMA printcraft;

-- ============================ live public schema ============================
--
-- PostgreSQL database dump
--

-- Dumped from database version 15.8
-- Dumped by pg_dump version 15.8

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: ai_assistant_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ai_assistant_status AS ENUM (
    'draft',
    'active',
    'paused',
    'archived'
);


--
-- Name: ai_pricing_model; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ai_pricing_model AS ENUM (
    'per_message',
    'per_token',
    'subscription',
    'free'
);


--
-- Name: cat_action_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.cat_action_category AS ENUM (
    'entities',
    'communication',
    'payments',
    'organization',
    'settings',
    'context'
);


--
-- Name: cat_action_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.cat_action_status AS ENUM (
    'pending',
    'executing',
    'completed',
    'failed',
    'cancelled'
);


--
-- Name: compute_provider_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.compute_provider_type AS ENUM (
    'api',
    'self_hosted',
    'community'
);


--
-- Name: document_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.document_type AS ENUM (
    'goals',
    'finances',
    'skills',
    'notes',
    'business_plan',
    'other'
);


--
-- Name: document_visibility; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.document_visibility AS ENUM (
    'private',
    'cat_visible',
    'public'
);


--
-- Name: governance_model_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.governance_model_enum AS ENUM (
    'hierarchical',
    'democratic',
    'consensus',
    'dao',
    'other'
);


--
-- Name: membership_role_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.membership_role_enum AS ENUM (
    'owner',
    'admin',
    'moderator',
    'member',
    'guest'
);


--
-- Name: membership_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.membership_status_enum AS ENUM (
    'active',
    'pending',
    'suspended',
    'left',
    'banned'
);


--
-- Name: organization_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.organization_type_enum AS ENUM (
    'non_profit',
    'business',
    'dao',
    'community',
    'foundation',
    'other'
);


--
-- Name: support_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.support_type AS ENUM (
    'bitcoin_funding',
    'signature',
    'message',
    'reaction'
);


--
-- Name: accept_group_invitation(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.accept_group_invitation(invitation_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  inv RECORD;
  result jsonb;
BEGIN
  -- Get invitation
  SELECT * INTO inv FROM group_invitations WHERE id = invitation_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation not found');
  END IF;

  -- Check if pending
  IF inv.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation is no longer pending');
  END IF;

  -- Check if expired
  IF inv.expires_at < now() THEN
    UPDATE group_invitations SET status = 'expired' WHERE id = invitation_id;
    RETURN jsonb_build_object('success', false, 'error', 'Invitation has expired');
  END IF;

  -- Check authorization (user_id matches OR token-based)
  IF inv.user_id IS NOT NULL AND inv.user_id != auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'This invitation is for another user');
  END IF;

  -- Check if already a member
  IF EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = inv.group_id AND user_id = COALESCE(inv.user_id, auth.uid())
  ) THEN
    -- Update invitation status anyway
    UPDATE group_invitations
    SET status = 'accepted', responded_at = now()
    WHERE id = invitation_id;

    RETURN jsonb_build_object('success', true, 'already_member', true, 'group_id', inv.group_id);
  END IF;

  -- Add as member
  INSERT INTO group_members (group_id, user_id, role, invited_by)
  VALUES (inv.group_id, COALESCE(inv.user_id, auth.uid()), inv.role, inv.invited_by);

  -- Update invitation status
  UPDATE group_invitations
  SET status = 'accepted', responded_at = now()
  WHERE id = invitation_id;

  RETURN jsonb_build_object('success', true, 'group_id', inv.group_id);
END;
$$;


--
-- Name: add_timeline_comment(uuid, uuid, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.add_timeline_comment(p_event_id uuid, p_user_id uuid, p_content text, p_parent_comment_id uuid DEFAULT NULL::uuid) RETURNS TABLE(comment_id uuid, comment_count integer)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_comment_id UUID;
  v_count INTEGER;
BEGIN
  -- Verify user is authenticated
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Insert the comment
  INSERT INTO timeline_comments (event_id, user_id, content, parent_comment_id)
  VALUES (p_event_id, p_user_id, p_content, p_parent_comment_id)
  RETURNING id INTO v_comment_id;

  -- Get the updated count (only top-level comments)
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM timeline_comments
  WHERE event_id = p_event_id AND is_deleted = false AND parent_comment_id IS NULL;

  -- Update cached stats
  INSERT INTO timeline_event_stats (event_id, comment_count, updated_at)
  VALUES (p_event_id, v_count, NOW())
  ON CONFLICT (event_id) DO UPDATE SET comment_count = v_count, updated_at = NOW();

  -- Update timeline_events.reply_count if column exists
  UPDATE timeline_events SET reply_count = v_count WHERE id = p_event_id;

  RETURN QUERY SELECT v_comment_id, v_count;
END;
$$;


--
-- Name: auto_title_ai_conversation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_title_ai_conversation() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Only set title if this is the first user message and conversation has no title
  IF NEW.role = 'user' THEN
    UPDATE ai_conversations
    SET title = COALESCE(
      title,
      CASE
        WHEN LENGTH(NEW.content) > 50 THEN SUBSTRING(NEW.content, 1, 47) || '...'
        ELSE NEW.content
      END
    )
    WHERE id = NEW.conversation_id AND title IS NULL;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: cancel_ai_withdrawal(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cancel_ai_withdrawal(p_withdrawal_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE w RECORD;
BEGIN
  SELECT * INTO w FROM ai_creator_withdrawals WHERE id = p_withdrawal_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal not found or not pending'; END IF;
  UPDATE ai_creator_withdrawals SET status = 'cancelled', completed_at = NOW() WHERE id = p_withdrawal_id;
  UPDATE ai_creator_earnings SET
    pending_withdrawal_btc = GREATEST(0, COALESCE(pending_withdrawal_btc, 0) - w.amount_btc)
  WHERE creator_id = w.creator_id;
END;
$$;


--
-- Name: cat_credit_append(uuid, text, numeric, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cat_credit_append(p_user_id uuid, p_kind text, p_amount_btc numeric, p_ref text DEFAULT NULL::text, p_metadata jsonb DEFAULT NULL::jsonb) RETURNS numeric
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_current numeric;
  v_new numeric;
begin
  perform pg_advisory_xact_lock(hashtext(p_user_id::text));

  v_current := public.cat_credit_balance(p_user_id);
  v_new := v_current + p_amount_btc;

  if v_new < 0 then
    raise exception 'insufficient_credits' using errcode = 'check_violation';
  end if;

  insert into public.cat_credit_entries (user_id, kind, amount_btc, balance_after_btc, ref, metadata)
  values (p_user_id, p_kind, p_amount_btc, v_new, p_ref, p_metadata);

  return v_new;
end;
$$;


--
-- Name: cat_credit_balance(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cat_credit_balance(p_user_id uuid) RETURNS numeric
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  select coalesce(
    (select balance_after_btc
       from public.cat_credit_entries
      where user_id = p_user_id
      order by seq desc
      limit 1),
    0
  );
$$;


--
-- Name: check_booking_conflict(text, uuid, timestamp with time zone, timestamp with time zone, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_booking_conflict(p_bookable_type text, p_bookable_id uuid, p_starts_at timestamp with time zone, p_ends_at timestamp with time zone, p_exclude_booking_id uuid DEFAULT NULL::uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM bookings
    WHERE bookable_type = p_bookable_type AND bookable_id = p_bookable_id
    AND status IN ('confirmed', 'in_progress')
    AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id)
    AND (
      (starts_at <= p_starts_at AND ends_at > p_starts_at) OR
      (starts_at < p_ends_at AND ends_at >= p_ends_at) OR
      (starts_at >= p_starts_at AND ends_at <= p_ends_at)
    )
  );
END;
$$;


--
-- Name: check_cat_permission(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_cat_permission(p_user_id uuid, p_action_id text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$ DECLARE perm RECORD; BEGIN SELECT * INTO perm FROM public.cat_permissions WHERE user_id = p_user_id AND (action_id = p_action_id OR action_id = '*') AND granted = true LIMIT 1; IF NOT FOUND THEN RETURN false; END IF; RETURN true; END; $$;


--
-- Name: check_platform_limit(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_platform_limit(p_user_id uuid) RETURNS TABLE(daily_requests integer, daily_limit integer, requests_remaining integer, can_use_platform boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_daily_limit      INTEGER := 10;
  v_current_requests INTEGER := 0;
  v_expires_at       TIMESTAMPTZ;
BEGIN
  SELECT
    COALESCE(up.daily_limit, 10),
    up.expires_at
  INTO v_daily_limit, v_expires_at
  FROM public.user_plans up
  WHERE up.user_id = p_user_id;

  v_daily_limit := COALESCE(v_daily_limit, 10);

  IF v_expires_at IS NOT NULL AND v_expires_at < NOW() THEN
    v_daily_limit := 10;
  END IF;

  SELECT request_count INTO v_current_requests
  FROM public.platform_api_usage
  WHERE user_id = p_user_id AND usage_date = CURRENT_DATE;

  v_current_requests := COALESCE(v_current_requests, 0);

  RETURN QUERY SELECT
    v_current_requests,
    v_daily_limit,
    GREATEST(0, v_daily_limit - v_current_requests),
    v_current_requests < v_daily_limit;
END;
$$;


--
-- Name: cleanup_expired_invitations(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_invitations() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  expired_count integer;
BEGIN
  UPDATE group_invitations
  SET status = 'expired'
  WHERE status = 'pending' AND expires_at < now();

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;


--
-- Name: complete_ai_withdrawal(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.complete_ai_withdrawal(p_withdrawal_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE w RECORD;
BEGIN
  SELECT * INTO w FROM ai_creator_withdrawals WHERE id = p_withdrawal_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal not found or not pending'; END IF;
  UPDATE ai_creator_withdrawals SET status = 'completed', completed_at = NOW() WHERE id = p_withdrawal_id;
  UPDATE ai_creator_earnings SET
    pending_withdrawal_btc = GREATEST(0, COALESCE(pending_withdrawal_btc, 0) - w.amount_btc),
    total_withdrawn_btc = COALESCE(total_withdrawn_btc, 0) + w.amount_btc
  WHERE creator_id = w.creator_id;
  UPDATE ai_assistants SET total_withdrawn_btc = COALESCE(total_withdrawn_btc, 0) + w.amount_btc WHERE id = w.creator_id;
END;
$$;


--
-- Name: create_direct_conversation(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_direct_conversation(participant1_id uuid, participant2_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  conversation_id uuid;
  existing_conversation_id uuid;
BEGIN
  -- Check if a direct conversation already exists between these users
  SELECT c.id INTO existing_conversation_id
  FROM conversations c
  JOIN conversation_participants cp1 ON c.id = cp1.conversation_id
  JOIN conversation_participants cp2 ON c.id = cp2.conversation_id
  WHERE c.is_group = false
    AND cp1.user_id = participant1_id
    AND cp2.user_id = participant2_id
    AND cp1.is_active = true
    AND cp2.is_active = true;

  -- If exists, return the existing conversation
  IF existing_conversation_id IS NOT NULL THEN
    RETURN existing_conversation_id;
  END IF;

  -- Create new conversation
  INSERT INTO conversations (created_by, is_group)
  VALUES (participant1_id, false)
  RETURNING id INTO conversation_id;

  -- Add participants
  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES (conversation_id, participant1_id), (conversation_id, participant2_id);

  RETURN conversation_id;
END;
$$;


--
-- Name: create_group_conversation(uuid, uuid[], text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_group_conversation(p_created_by uuid, p_participant_ids uuid[], p_title text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_conversation_id uuid;
  v_all_participants uuid[];
  v_distinct_participants uuid[];
BEGIN
  -- Basic validation
  IF p_created_by IS NULL THEN
    RAISE EXCEPTION 'created_by cannot be null';
  END IF;

  IF p_participant_ids IS NULL OR array_length(p_participant_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'participant_ids cannot be empty';
  END IF;

  -- Compose full participant list including creator
  v_all_participants := array_cat(ARRAY[p_created_by], p_participant_ids);

  -- Remove duplicates
  SELECT ARRAY(SELECT DISTINCT unnest(v_all_participants)) INTO v_distinct_participants;

  -- Create conversation
  INSERT INTO conversations (created_by, is_group, title)
  VALUES (p_created_by, true, p_title)
  RETURNING id INTO v_conversation_id;

  -- Add participants (creator as admin, others as member)
  INSERT INTO conversation_participants (conversation_id, user_id, role)
  SELECT v_conversation_id,
         uid,
         CASE WHEN uid = p_created_by THEN 'admin' ELSE 'member' END
  FROM unnest(v_distinct_participants) AS uid;

  RETURN v_conversation_id;
END;
$$;


--
-- Name: create_loan_offer(uuid, uuid, text, numeric, numeric, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_loan_offer(p_loan_id uuid, p_offerer_id uuid, p_offer_type text, p_offer_amount numeric, p_interest_rate numeric DEFAULT NULL::numeric, p_term_months integer DEFAULT NULL::integer, p_terms text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_offer_id uuid;
  v_loan_owner uuid;
BEGIN
  -- Get loan owner
  SELECT user_id INTO v_loan_owner
  FROM loans
  WHERE id = p_loan_id AND status = 'active';

  IF v_loan_owner IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Loan not found or not active');
  END IF;

  IF v_loan_owner = p_offerer_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot offer on your own loan');
  END IF;

  -- Check minimum offer amount if specified
  IF EXISTS (
    SELECT 1 FROM loans
    WHERE id = p_loan_id
      AND minimum_offer_amount IS NOT NULL
      AND p_offer_amount < minimum_offer_amount
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Offer amount below minimum required');
  END IF;

  -- Insert offer
  INSERT INTO loan_offers (
    loan_id, offerer_id, offer_type, offer_amount,
    interest_rate, term_months, terms
  ) VALUES (
    p_loan_id, p_offerer_id, p_offer_type, p_offer_amount,
    p_interest_rate, p_term_months, p_terms
  )
  RETURNING id INTO v_offer_id;

  RETURN jsonb_build_object(
    'success', true,
    'offer_id', v_offer_id,
    'message', 'Offer submitted successfully'
  );
END;
$$;


--
-- Name: FUNCTION create_loan_offer(p_loan_id uuid, p_offerer_id uuid, p_offer_type text, p_offer_amount numeric, p_interest_rate numeric, p_term_months integer, p_terms text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.create_loan_offer(p_loan_id uuid, p_offerer_id uuid, p_offer_type text, p_offer_amount numeric, p_interest_rate numeric, p_term_months integer, p_terms text) IS 'Create a new offer to refinance or pay off a loan';


--
-- Name: create_post_with_visibility(text, uuid, text, uuid, text, text, text, jsonb, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_post_with_visibility(p_event_type text, p_actor_id uuid, p_subject_type text DEFAULT 'profile'::text, p_subject_id uuid DEFAULT NULL::uuid, p_title text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_visibility text DEFAULT 'public'::text, p_metadata jsonb DEFAULT '{}'::jsonb, p_timeline_contexts jsonb DEFAULT '[]'::jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_actor_id           uuid;
  v_event_id           uuid;
  v_title              text;
  v_context            jsonb;
  v_visibility_count   integer := 0;
  v_normalized_desc    text;
  v_recent_post_count  integer;
BEGIN
  v_actor_id := COALESCE(p_actor_id, auth.uid());

  IF v_actor_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   'Authentication required'
    );
  END IF;

  -- Rate limit: max 5 posts per actor per minute. Sustained spam (adelina x9)
  -- hits this; a single duplicate within minutes hits the dedup check below.
  SELECT COUNT(*) INTO v_recent_post_count
  FROM timeline_events
  WHERE actor_id  = v_actor_id
    AND event_timestamp > now() - interval '1 minute'
    AND NOT COALESCE(is_deleted, false);

  IF v_recent_post_count >= 5 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   'You are posting too quickly. Wait a moment and try again.'
    );
  END IF;

  -- Dedup: identical description from same actor within the last 5 minutes
  -- is almost always an accidental repost (network retry, double-click).
  -- Skip the check for empty/null bodies so non-text events aren't affected.
  v_normalized_desc := NULLIF(TRIM(p_description), '');
  IF v_normalized_desc IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM timeline_events
      WHERE actor_id        = v_actor_id
        AND TRIM(description) = v_normalized_desc
        AND event_timestamp > now() - interval '5 minutes'
        AND NOT COALESCE(is_deleted, false)
    ) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error',   'You just posted this. Edit it or wait a few minutes before reposting.'
      );
    END IF;
  END IF;

  v_title := COALESCE(
    NULLIF(TRIM(p_title), ''),
    NULLIF(LEFT(TRIM(p_description), 140), ''),
    'Update'
  );

  INSERT INTO timeline_events (
    event_type, actor_id, actor_type, subject_type, subject_id,
    title, description, content, visibility, metadata,
    event_timestamp, created_at, updated_at
  ) VALUES (
    p_event_type, v_actor_id, 'user', p_subject_type, p_subject_id,
    v_title, p_description,
    jsonb_build_object('text', COALESCE(p_description, '')),
    p_visibility, p_metadata,
    now(), now(), now()
  )
  RETURNING id INTO v_event_id;

  IF p_timeline_contexts IS NOT NULL AND jsonb_array_length(p_timeline_contexts) > 0 THEN
    FOR v_context IN SELECT * FROM jsonb_array_elements(p_timeline_contexts) LOOP
      INSERT INTO timeline_event_visibility (event_id, timeline_type, timeline_owner_id)
      VALUES (v_event_id, v_context->>'timeline_type', (v_context->>'timeline_owner_id')::uuid)
      ON CONFLICT (event_id, timeline_type, timeline_owner_id) DO NOTHING;
      v_visibility_count := v_visibility_count + 1;
    END LOOP;
  END IF;

  INSERT INTO timeline_event_visibility (event_id, timeline_type, timeline_owner_id)
  VALUES (v_event_id, 'profile', v_actor_id)
  ON CONFLICT (event_id, timeline_type, timeline_owner_id) DO NOTHING;

  RETURN jsonb_build_object(
    'success',          true,
    'post_id',          v_event_id,
    'visibility_count', v_visibility_count + 1
  );
END;
$$;


--
-- Name: create_quote_reply(uuid, uuid, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_quote_reply(p_parent_event_id uuid, p_actor_id uuid, p_content text, p_quoted_content text, p_visibility text DEFAULT 'public'::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_new_event_id UUID;
  v_parent_actor_id UUID;
BEGIN
  -- Validate actor owns this request
  IF auth.uid() != p_actor_id THEN
    RAISE EXCEPTION 'Actor mismatch';
  END IF;

  -- Get parent event details
  SELECT actor_id INTO v_parent_actor_id
  FROM timeline_events
  WHERE id = p_parent_event_id
  AND deleted_at IS NULL;

  IF v_parent_actor_id IS NULL THEN
    RAISE EXCEPTION 'Parent event not found';
  END IF;

  -- Create the quote reply event
  INSERT INTO timeline_events (
    event_type,
    actor_id,
    content,
    parent_event_id,
    visibility,
    metadata,
    created_at
  ) VALUES (
    'quote_reply',
    p_actor_id,
    p_content,
    p_parent_event_id,
    p_visibility,
    jsonb_build_object(
      'quoted_content', p_quoted_content,
      'quoted_actor_id', v_parent_actor_id
    ),
    NOW()
  )
  RETURNING id INTO v_new_event_id;

  -- Update quote count on parent event
  UPDATE timeline_events
  SET quote_count = COALESCE(quote_count, 0) + 1
  WHERE id = p_parent_event_id;

  -- Create notification for parent event owner
  IF v_parent_actor_id != p_actor_id THEN
    INSERT INTO notifications (
      user_id,
      actor_id,
      type,
      title,
      message,
      data,
      created_at
    ) VALUES (
      v_parent_actor_id,
      p_actor_id,
      'quote_reply',
      'Someone quoted your post',
      LEFT(p_content, 100),
      jsonb_build_object(
        'event_id', v_new_event_id,
        'parent_event_id', p_parent_event_id
      ),
      NOW()
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_new_event_id;
END;
$$;


--
-- Name: create_task_broadcast_notification(uuid, text, text, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_task_broadcast_notification(p_exclude_user_id uuid, p_type text, p_title text, p_message text, p_task_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  v_source_actor_id uuid;
BEGIN
  IF p_exclude_user_id IS NOT NULL THEN
    SELECT id INTO v_source_actor_id
    FROM public.actors
    WHERE user_id = p_exclude_user_id
    LIMIT 1;
  END IF;

  INSERT INTO public.notifications (
    recipient_user_id, type, title, message,
    action_url, source_actor_id, source_entity_type, source_entity_id
  )
  SELECT
    u.id, p_type, p_title, p_message,
    CASE WHEN p_task_id IS NOT NULL
      THEN '/dashboard/tasks/' || p_task_id::text
      ELSE '/dashboard/tasks'
    END,
    v_source_actor_id, 'task', p_task_id
  FROM auth.users u
  WHERE u.id != COALESCE(p_exclude_user_id, '00000000-0000-0000-0000-000000000000'::uuid);
END;
$$;


--
-- Name: create_task_notification(uuid, text, text, text, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_task_notification(p_recipient_user_id uuid, p_type text, p_title text, p_message text, p_task_id uuid, p_source_user_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  v_notification_id uuid;
  v_source_actor_id uuid;
BEGIN
  IF p_source_user_id IS NOT NULL THEN
    SELECT id INTO v_source_actor_id
    FROM public.actors
    WHERE user_id = p_source_user_id
    LIMIT 1;
  END IF;

  INSERT INTO public.notifications (
    recipient_user_id, type, title, message,
    action_url, source_actor_id, source_entity_type, source_entity_id
  ) VALUES (
    p_recipient_user_id, p_type, p_title, p_message,
    CASE WHEN p_task_id IS NOT NULL
      THEN '/dashboard/tasks/' || p_task_id::text
      ELSE '/dashboard/tasks'
    END,
    v_source_actor_id, 'task', p_task_id
  ) RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;


--
-- Name: decline_group_invitation(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.decline_group_invitation(invitation_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  inv RECORD;
BEGIN
  -- Get invitation
  SELECT * INTO inv FROM group_invitations WHERE id = invitation_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation not found');
  END IF;

  -- Check if pending
  IF inv.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation is no longer pending');
  END IF;

  -- Check authorization
  IF inv.user_id IS NOT NULL AND inv.user_id != auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'This invitation is for another user');
  END IF;

  -- Update status
  UPDATE group_invitations
  SET status = 'declined', responded_at = now()
  WHERE id = invitation_id;

  RETURN jsonb_build_object('success', true);
END;
$$;


--
-- Name: decrement_inventory(text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.decrement_inventory(p_entity_type text, p_entity_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: delete_timeline_comment(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_timeline_comment(p_comment_id uuid, p_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_event_id UUID;
  v_count INTEGER;
BEGIN
  -- Verify user is authenticated
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Get event_id before deleting
  SELECT event_id INTO v_event_id
  FROM timeline_comments WHERE id = p_comment_id AND user_id = p_user_id;

  IF v_event_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Soft delete the comment
  UPDATE timeline_comments
  SET is_deleted = true, deleted_at = NOW()
  WHERE id = p_comment_id AND user_id = p_user_id;

  -- Update count
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM timeline_comments
  WHERE event_id = v_event_id AND is_deleted = false AND parent_comment_id IS NULL;

  -- Update cached stats
  UPDATE timeline_event_stats SET comment_count = v_count, updated_at = NOW()
  WHERE event_id = v_event_id;

  -- Update timeline_events.reply_count if column exists
  UPDATE timeline_events SET reply_count = v_count WHERE id = v_event_id;

  RETURN TRUE;
END;
$$;


--
-- Name: dislike_timeline_event(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dislike_timeline_event(p_event_id uuid, p_user_id uuid) RETURNS TABLE(dislike_count integer)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Verify user is authenticated
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Insert the dislike (ignore if already exists)
  INSERT INTO timeline_dislikes (event_id, user_id)
  VALUES (p_event_id, p_user_id)
  ON CONFLICT (event_id, user_id) DO NOTHING;

  -- Remove any existing like
  DELETE FROM timeline_likes
  WHERE event_id = p_event_id AND user_id = p_user_id;

  -- Get the updated count
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM timeline_dislikes WHERE event_id = p_event_id;

  -- Update cached stats
  INSERT INTO timeline_event_stats (event_id, dislike_count, updated_at)
  VALUES (p_event_id, v_count, NOW())
  ON CONFLICT (event_id) DO UPDATE SET dislike_count = v_count, updated_at = NOW();

  -- Update timeline_events.dislike_count if column exists
  UPDATE timeline_events SET dislike_count = v_count WHERE id = p_event_id;

  RETURN QUERY SELECT v_count;
END;
$$;


--
-- Name: expire_cat_pending_actions(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.expire_cat_pending_actions() RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE cat_pending_actions
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();
END;
$$;


--
-- Name: f_score(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.f_score(doc text, needle text) RETURNS real
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
    AS $$ SELECT extensions.word_similarity(needle, doc) $$;


--
-- Name: f_unaccent(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.f_unaccent(text) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
    AS $_$ SELECT extensions.unaccent('extensions.unaccent'::regdictionary, $1) $_$;


--
-- Name: fail_ai_withdrawal(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fail_ai_withdrawal(p_withdrawal_id uuid, p_reason text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE w RECORD;
BEGIN
  SELECT * INTO w FROM ai_creator_withdrawals WHERE id = p_withdrawal_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal not found or not pending'; END IF;
  UPDATE ai_creator_withdrawals SET status = 'failed', completed_at = NOW(), failure_reason = p_reason WHERE id = p_withdrawal_id;
  UPDATE ai_creator_earnings SET
    pending_withdrawal_btc = GREATEST(0, COALESCE(pending_withdrawal_btc, 0) - w.amount_btc)
  WHERE creator_id = w.creator_id;
END;
$$;


--
-- Name: generate_invitation_token(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_invitation_token() RETURNS text
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN encode(gen_random_bytes(24), 'base64');
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: loans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.loans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    loan_category_id uuid,
    original_amount numeric(15,8) NOT NULL,
    remaining_balance numeric(15,8) NOT NULL,
    interest_rate numeric(5,2),
    monthly_payment numeric(15,8),
    currency text DEFAULT 'CHF'::text,
    lender_name text,
    loan_number text,
    origination_date date,
    maturity_date date,
    status text DEFAULT 'active'::text,
    is_public boolean DEFAULT true,
    is_negotiable boolean DEFAULT true,
    minimum_offer_amount numeric(15,8),
    preferred_terms text,
    contact_method text DEFAULT 'platform'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    paid_off_at timestamp with time zone,
    actor_id uuid NOT NULL,
    bitcoin_address text,
    lightning_address text,
    fulfillment_type text DEFAULT 'manual'::text,
    current_lender text,
    current_interest_rate numeric,
    desired_rate numeric,
    loan_type text DEFAULT 'new_request'::text,
    amount numeric(20,8) DEFAULT 1000000 NOT NULL,
    is_test boolean DEFAULT false NOT NULL,
    show_on_profile boolean DEFAULT true,
    CONSTRAINT loans_amount_sats_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT loans_check CHECK ((remaining_balance <= original_amount)),
    CONSTRAINT loans_check1 CHECK (((maturity_date IS NULL) OR (maturity_date > origination_date))),
    CONSTRAINT loans_contact_method_check CHECK ((contact_method = ANY (ARRAY['platform'::text, 'email'::text, 'phone'::text]))),
    CONSTRAINT loans_currency_check CHECK ((currency = ANY (ARRAY['USD'::text, 'EUR'::text, 'CHF'::text, 'BTC'::text, 'GBP'::text]))),
    CONSTRAINT loans_description_check CHECK ((char_length(description) <= 2000)),
    CONSTRAINT loans_fulfillment_type_check CHECK ((fulfillment_type = ANY (ARRAY['manual'::text, 'automatic'::text]))),
    CONSTRAINT loans_interest_rate_check CHECK (((interest_rate >= (0)::numeric) AND (interest_rate <= (100)::numeric))),
    CONSTRAINT loans_lender_name_check CHECK ((char_length(lender_name) <= 100)),
    CONSTRAINT loans_loan_number_check CHECK ((char_length(loan_number) <= 100)),
    CONSTRAINT loans_loan_type_check CHECK ((loan_type = ANY (ARRAY['new_request'::text, 'existing_refinance'::text]))),
    CONSTRAINT loans_minimum_offer_amount_check CHECK (((minimum_offer_amount IS NULL) OR (minimum_offer_amount > (0)::numeric))),
    CONSTRAINT loans_original_amount_check CHECK ((original_amount > (0)::numeric)),
    CONSTRAINT loans_preferred_terms_check CHECK ((char_length(preferred_terms) <= 1000)),
    CONSTRAINT loans_remaining_balance_check CHECK ((remaining_balance >= (0)::numeric)),
    CONSTRAINT loans_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'paid_off'::text, 'refinanced'::text, 'defaulted'::text, 'cancelled'::text]))),
    CONSTRAINT loans_title_check CHECK ((char_length(title) <= 200))
);


--
-- Name: TABLE loans; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.loans IS 'User loans available for refinancing or payoff offers';


--
-- Name: COLUMN loans.original_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.loans.original_amount IS 'Original loan amount in the specified currency';


--
-- Name: COLUMN loans.remaining_balance; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.loans.remaining_balance IS 'Remaining balance to be paid';


--
-- Name: COLUMN loans.interest_rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.loans.interest_rate IS 'Annual interest rate percentage';


--
-- Name: COLUMN loans.monthly_payment; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.loans.monthly_payment IS 'Current monthly payment amount (for refinancing)';


--
-- Name: COLUMN loans.current_lender; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.loans.current_lender IS 'Name of current lender (for refinancing)';


--
-- Name: COLUMN loans.current_interest_rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.loans.current_interest_rate IS 'Current annual interest rate (for refinancing)';


--
-- Name: COLUMN loans.desired_rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.loans.desired_rate IS 'Desired interest rate after refinancing';


--
-- Name: COLUMN loans.show_on_profile; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.loans.show_on_profile IS 'Whether this loan appears on the user''s public profile page';


--
-- Name: get_available_loans(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_available_loans(p_limit integer DEFAULT 20, p_offset integer DEFAULT 0) RETURNS SETOF public.loans
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
    SELECT l.*
    FROM public.loans l
    WHERE l.status = 'active'
    ORDER BY l.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;


--
-- Name: get_cat_action_daily_usage(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_cat_action_daily_usage(p_user_id uuid, p_action_id text) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  usage_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO usage_count
  FROM cat_action_log
  WHERE user_id = p_user_id
    AND action_id = p_action_id
    AND status IN ('completed', 'executing')
    AND created_at >= CURRENT_DATE;

  RETURN COALESCE(usage_count, 0);
END;
$$;


--
-- Name: get_comment_replies(uuid, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_comment_replies(p_comment_id uuid, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0) RETURNS TABLE(id uuid, event_id uuid, user_id uuid, content text, parent_comment_id uuid, created_at timestamp with time zone, updated_at timestamp with time zone)
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.event_id,
    c.user_id,
    c.content,
    c.parent_comment_id,
    c.created_at,
    c.updated_at
  FROM timeline_comments c
  WHERE c.parent_comment_id = p_comment_id
    AND c.is_deleted = false
  ORDER BY c.created_at ASC
  LIMIT p_limit OFFSET p_offset;
END;
$$;


--
-- Name: get_comment_reply_count(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_comment_reply_count(comment_id uuid) RETURNS integer
    LANGUAGE sql
    SET search_path TO 'public'
    AS $_$
  SELECT COUNT(*)::integer FROM timeline_comments
  WHERE parent_comment_id = $1
    AND NOT is_deleted;
$_$;


--
-- Name: get_enriched_timeline_feed(uuid, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_enriched_timeline_feed(p_user_id uuid, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0) RETURNS TABLE(id uuid, event_type text, actor_id uuid, content jsonb, visibility text, created_at timestamp with time zone, like_count integer, share_count integer, comment_count integer, user_liked boolean, user_shared boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.event_type,
    e.actor_id,
    e.content,
    e.visibility,
    e.created_at,
    COALESCE(s.like_count, e.like_count, 0)::INTEGER as like_count,
    COALESCE(s.share_count, e.share_count, 0)::INTEGER as share_count,
    COALESCE(s.comment_count, e.reply_count, 0)::INTEGER as comment_count,
    EXISTS(SELECT 1 FROM timeline_likes WHERE event_id = e.id AND user_id = p_user_id) as user_liked,
    FALSE as user_shared  -- Can be implemented later with shares table
  FROM timeline_events e
  LEFT JOIN timeline_event_stats s ON e.id = s.event_id
  WHERE (
    -- Own posts
    e.actor_id = p_user_id
    OR
    -- Posts from people user follows
    e.actor_id IN (
      SELECT following_id FROM follows WHERE follower_id = p_user_id
    )
    OR
    -- Public posts
    e.visibility = 'public'
  )
  AND (e.deleted_at IS NULL OR e.is_deleted = false)
  AND e.parent_event_id IS NULL  -- Only top-level posts
  ORDER BY e.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;


--
-- Name: get_event_comment_count(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_event_comment_count(event_id uuid) RETURNS integer
    LANGUAGE sql
    SET search_path TO 'public'
    AS $_$
  SELECT COUNT(*)::integer FROM timeline_comments
  WHERE timeline_comments.event_id = $1
    AND NOT is_deleted;
$_$;


--
-- Name: get_event_comments(uuid, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_event_comments(p_event_id uuid, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0) RETURNS TABLE(id uuid, event_id uuid, user_id uuid, content text, parent_comment_id uuid, created_at timestamp with time zone, updated_at timestamp with time zone)
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.event_id,
    c.user_id,
    c.content,
    c.parent_comment_id,
    c.created_at,
    c.updated_at
  FROM timeline_comments c
  WHERE c.event_id = p_event_id
    AND c.is_deleted = false
    AND c.parent_comment_id IS NULL
  ORDER BY c.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;


--
-- Name: get_event_dislike_count(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_event_dislike_count(event_id uuid) RETURNS integer
    LANGUAGE sql
    SET search_path TO 'public'
    AS $_$
  SELECT COUNT(*)::integer FROM timeline_dislikes WHERE timeline_dislikes.event_id = $1;
$_$;


--
-- Name: get_event_like_count(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_event_like_count(event_id uuid) RETURNS integer
    LANGUAGE sql
    SET search_path TO 'public'
    AS $_$
  SELECT COUNT(*)::integer FROM timeline_likes WHERE timeline_likes.event_id = $1;
$_$;


--
-- Name: get_event_share_count(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_event_share_count(event_id uuid) RETURNS integer
    LANGUAGE sql
    SET search_path TO 'public'
    AS $_$
  SELECT COUNT(*)::integer FROM timeline_shares WHERE timeline_shares.original_event_id = $1;
$_$;


--
-- Name: timeline_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.timeline_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type text NOT NULL,
    event_subtype text,
    actor_id uuid,
    actor_type text DEFAULT 'user'::text,
    subject_type text NOT NULL,
    subject_id uuid,
    target_type text,
    target_id uuid,
    title text NOT NULL,
    description text,
    content jsonb DEFAULT '{}'::jsonb,
    amount_btc numeric(20,8),
    quantity integer,
    location_data jsonb DEFAULT '{}'::jsonb,
    device_info jsonb DEFAULT '{}'::jsonb,
    visibility text DEFAULT 'public'::text,
    is_featured boolean DEFAULT false,
    event_timestamp timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    tags text[] DEFAULT '{}'::text[],
    parent_event_id uuid,
    thread_id uuid,
    is_deleted boolean DEFAULT false,
    deleted_at timestamp with time zone,
    deletion_reason text,
    is_cross_post_duplicate boolean DEFAULT false,
    thread_depth integer DEFAULT 0,
    is_quote_reply boolean DEFAULT false,
    CONSTRAINT timeline_events_actor_type_check CHECK ((actor_type = ANY (ARRAY['user'::text, 'organization'::text, 'system'::text]))),
    CONSTRAINT timeline_events_subject_type_check CHECK ((subject_type = ANY (ARRAY['profile'::text, 'organization'::text, 'transaction'::text, 'comment'::text, 'achievement'::text, 'system'::text, 'wallet'::text, 'project'::text, 'product'::text, 'service'::text, 'cause'::text, 'ai_assistant'::text, 'group'::text, 'circle'::text, 'asset'::text, 'loan'::text, 'investment'::text, 'event'::text, 'research'::text, 'wishlist'::text, 'document'::text]))),
    CONSTRAINT timeline_events_target_type_check CHECK ((target_type = ANY (ARRAY['project'::text, 'profile'::text, 'organization'::text, 'transaction'::text, 'comment'::text, 'event'::text, 'achievement'::text, 'system'::text]))),
    CONSTRAINT timeline_events_visibility_check CHECK ((visibility = ANY (ARRAY['public'::text, 'followers'::text, 'private'::text])))
);


--
-- Name: TABLE timeline_events; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.timeline_events IS 'Unified timeline events system for all user activities, project milestones, and community events';


--
-- Name: COLUMN timeline_events.event_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.timeline_events.event_type IS 'Type of event (project_created, donation_received, user_followed, etc.)';


--
-- Name: COLUMN timeline_events.event_subtype; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.timeline_events.event_subtype IS 'Additional event classification for more granular filtering';


--
-- Name: COLUMN timeline_events.actor_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.timeline_events.actor_id IS 'User/organization/system that performed the action';


--
-- Name: COLUMN timeline_events.subject_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.timeline_events.subject_type IS 'Type of entity the event is about (project, profile, etc.)';


--
-- Name: COLUMN timeline_events.subject_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.timeline_events.subject_id IS 'ID of the subject entity';


--
-- Name: COLUMN timeline_events.target_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.timeline_events.target_type IS 'Type of entity affected by the event';


--
-- Name: COLUMN timeline_events.target_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.timeline_events.target_id IS 'ID of the target entity';


--
-- Name: COLUMN timeline_events.visibility; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.timeline_events.visibility IS 'Who can see this event (public, followers, private)';


--
-- Name: COLUMN timeline_events.is_featured; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.timeline_events.is_featured IS 'Whether this event should be highlighted/promoted';


--
-- Name: get_following_feed(uuid, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_following_feed(p_user_id uuid, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0) RETURNS SETOF public.timeline_events
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  return query
  select e.*
  from timeline_events e
  where (
    e.actor_id = p_user_id
    or e.actor_id in (
      select following_id from follows where follower_id = p_user_id
    )
  )
  and (e.deleted_at is null or e.is_deleted = false)
  and e.parent_event_id is null
  order by e.created_at desc
  limit p_limit offset p_offset;
end;
$$;


--
-- Name: get_group_member_count(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_group_member_count(group_uuid uuid) RETURNS integer
    LANGUAGE sql
    SET search_path TO 'public'
    AS $$
  SELECT COUNT(*)::integer
  FROM public.group_members
  WHERE group_id = group_uuid;
$$;


--
-- Name: get_group_role(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_group_role(user_uuid uuid, group_uuid uuid) RETURNS text
    LANGUAGE sql
    SET search_path TO 'public'
    AS $$
  SELECT role FROM public.group_members
  WHERE user_id = user_uuid AND group_id = group_uuid;
$$;


--
-- Name: user_ai_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_ai_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    default_model_id text,
    default_tier text DEFAULT 'economy'::text,
    auto_router_enabled boolean DEFAULT true,
    max_cost_btc numeric(18,8) DEFAULT 100,
    require_vision boolean DEFAULT false,
    require_function_calling boolean DEFAULT false,
    onboarding_completed boolean DEFAULT false,
    onboarding_completed_at timestamp with time zone,
    onboarding_step integer DEFAULT 0,
    cached_total_requests integer DEFAULT 0,
    cached_total_tokens integer DEFAULT 0,
    cached_total_cost_btc numeric(18,8) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    platform_chain_position integer DEFAULT 0 NOT NULL,
    CONSTRAINT user_ai_preferences_default_tier_check CHECK ((default_tier = ANY (ARRAY['free'::text, 'economy'::text, 'standard'::text, 'premium'::text])))
);


--
-- Name: TABLE user_ai_preferences; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_ai_preferences IS 'Stores user preferences for AI features including BYOK settings, model preferences, and onboarding state';


--
-- Name: get_or_create_user_ai_preferences(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_or_create_user_ai_preferences(p_user_id uuid) RETURNS public.user_ai_preferences
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  result user_ai_preferences;
BEGIN
  -- Try to get existing preferences
  SELECT * INTO result FROM user_ai_preferences WHERE user_id = p_user_id;

  -- If not found, create new preferences with defaults
  IF result IS NULL THEN
    INSERT INTO user_ai_preferences (user_id)
    VALUES (p_user_id)
    RETURNING * INTO result;
  END IF;

  RETURN result;
END;
$$;


--
-- Name: get_thread_posts(uuid, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_thread_posts(p_thread_id uuid, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0) RETURNS SETOF public.timeline_events
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM timeline_events
  WHERE (thread_id = p_thread_id OR id = p_thread_id)
    AND (deleted_at IS NULL OR is_deleted = false)
  ORDER BY created_at ASC
  LIMIT p_limit OFFSET p_offset;
END;
$$;


--
-- Name: get_total_unread_count(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_total_unread_count(p_user_id uuid) RETURNS bigint
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  total_count bigint;
BEGIN
  SELECT COUNT(m.id)::bigint INTO total_count
  FROM conversation_participants cp
  LEFT JOIN messages m ON 
    m.conversation_id = cp.conversation_id
    AND m.sender_id != p_user_id
    AND m.is_deleted = false
    AND (
      cp.last_read_at IS NULL 
      OR 
      m.created_at > cp.last_read_at
    )
  WHERE cp.user_id = p_user_id
    AND cp.is_active = true;
  
  RETURN COALESCE(total_count, 0);
END;
$$;


--
-- Name: FUNCTION get_total_unread_count(p_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_total_unread_count(p_user_id uuid) IS 'Returns total unread message count across all conversations for a user.';


--
-- Name: get_unread_counts(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_unread_counts(p_user_id uuid) RETURNS TABLE(conversation_id uuid, unread_count bigint)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.conversation_id,
    COUNT(m.id)::bigint as unread_count
  FROM conversation_participants cp
  LEFT JOIN messages m ON 
    m.conversation_id = cp.conversation_id
    AND m.sender_id != p_user_id
    AND m.is_deleted = false
    AND (
      -- If user has never read, all messages are unread
      cp.last_read_at IS NULL 
      OR 
      -- Otherwise, messages after last_read_at are unread
      m.created_at > cp.last_read_at
    )
  WHERE cp.user_id = p_user_id
    AND cp.is_active = true
  GROUP BY cp.conversation_id;
END;
$$;


--
-- Name: FUNCTION get_unread_counts(p_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_unread_counts(p_user_id uuid) IS 'Returns unread message count per conversation for a user. Optimized single-query approach.';


--
-- Name: get_user_conversations(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_conversations(p_user_id uuid) RETURNS TABLE(id uuid, title text, is_group boolean, created_by uuid, created_at timestamp with time zone, updated_at timestamp with time zone, last_message_at timestamp with time zone, last_message_preview text, last_message_sender_id uuid, participants jsonb, unread_count bigint)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.title,
    c.is_group,
    c.created_by,
    c.created_at,
    c.updated_at,
    c.last_message_at,
    c.last_message_preview,
    c.last_message_sender_id,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'user_id', p.id,
          'username', p.username,
          'name', p.name,
          'avatar_url', p.avatar_url,
          'role', cp2.role,
          'joined_at', cp2.joined_at,
          'last_read_at', cp2.last_read_at,
          'is_active', cp2.is_active
        )
      )
      FROM conversation_participants cp2
      JOIN profiles p ON cp2.user_id = p.id
      WHERE cp2.conversation_id = c.id AND cp2.is_active = true
    ) as participants,
    (
      SELECT COUNT(*)
      FROM messages m
      WHERE m.conversation_id = c.id
        AND m.sender_id != p_user_id
        AND m.created_at > cp.last_read_at
        AND m.is_deleted = false
    ) as unread_count
  FROM conversations c
  JOIN conversation_participants cp ON c.id = cp.conversation_id AND cp.user_id = p_user_id
  WHERE cp.is_active = true
  ORDER BY c.last_message_at DESC;
END;
$$;


--
-- Name: FUNCTION get_user_conversations(p_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_user_conversations(p_user_id uuid) IS 'Returns all conversations for a specific user with proper unread counts';


--
-- Name: get_user_group_role(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_group_role(p_group_id uuid, p_user_id uuid) RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  SELECT role FROM public.group_members
  WHERE group_id = p_group_id
    AND user_id = p_user_id
  LIMIT 1;
$$;


--
-- Name: get_user_groups(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_groups(user_uuid uuid) RETURNS TABLE(group_id uuid, group_name text, group_slug text, label text, role text, joined_at timestamp with time zone)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO ''
    AS $$
  SELECT g.id, g.name, g.slug, g.label, gm.role, gm.joined_at
  FROM public.groups g
  JOIN public.group_members gm ON g.id = gm.group_id
  WHERE gm.user_id = user_uuid
  ORDER BY gm.joined_at DESC;
$$;


--
-- Name: get_user_loans(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_loans(p_user_id uuid) RETURNS TABLE(id uuid, title text, remaining_balance numeric, interest_rate numeric, status text, total_offers bigint, pending_offers bigint, last_payment_date timestamp with time zone)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT
    l.id,
    l.title,
    l.remaining_balance,
    l.interest_rate,
    l.status,
    COALESCE(ls.total_offers, 0) as total_offers,
    COALESCE(ls.pending_offers, 0) as pending_offers,
    ls.last_payment_date
  FROM loans l
  LEFT JOIN loan_stats ls ON l.id = ls.loan_id
  WHERE l.user_id = p_user_id
  ORDER BY l.created_at DESC;
$$;


--
-- Name: FUNCTION get_user_loans(p_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_user_loans(p_user_id uuid) IS 'Get all loans for a specific user with statistics';


--
-- Name: get_user_pending_invitations(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_pending_invitations(user_uuid uuid DEFAULT auth.uid()) RETURNS TABLE(id uuid, group_id uuid, group_name text, group_slug text, group_avatar_url text, role text, message text, inviter_id uuid, inviter_name text, inviter_avatar_url text, expires_at timestamp with time zone, created_at timestamp with time zone)
    LANGUAGE sql SECURITY DEFINER
    AS $$
  SELECT
    gi.id,
    gi.group_id,
    g.name as group_name,
    g.slug as group_slug,
    g.avatar_url as group_avatar_url,
    gi.role,
    gi.message,
    gi.invited_by as inviter_id,
    p.name as inviter_name,
    p.avatar_url as inviter_avatar_url,
    gi.expires_at,
    gi.created_at
  FROM group_invitations gi
  JOIN groups g ON g.id = gi.group_id
  LEFT JOIN profiles p ON p.id = gi.invited_by
  WHERE gi.user_id = user_uuid
    AND gi.status = 'pending'
    AND gi.expires_at > now()
  ORDER BY gi.created_at DESC;
$$;


--
-- Name: get_user_timeline_feed(uuid, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_timeline_feed(p_user_id uuid, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0) RETURNS SETOF public.timeline_events
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT e.*
  FROM timeline_events e
  WHERE (
    -- Own posts
    e.actor_id = p_user_id
    OR
    -- Posts from people user follows
    e.actor_id IN (
      SELECT following_id FROM follows WHERE follower_id = p_user_id
    )
    OR
    -- Public posts
    e.visibility = 'public'
  )
  AND (e.deleted_at IS NULL OR e.is_deleted = false)
  AND e.parent_event_id IS NULL  -- Only top-level posts
  ORDER BY e.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;


--
-- Name: global_search(text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.global_search(p_query text, p_limit integer DEFAULT 20) RETURNS TABLE(entity_type text, id uuid, title text, subtitle text, image_url text, rank real)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions'
    AS $$
#variable_conflict use_column
DECLARE
  uq  text := public.f_unaccent(coalesce(p_query,''));
  q   tsquery := websearch_to_tsquery('english', uq);
  pat text := '%'||uq||'%';
BEGIN
  IF length(trim(uq)) = 0 THEN RETURN; END IF;
  RETURN QUERY
  WITH hits AS (
    -- projects
    SELECT 'project'::text et, pr.id, pr.title,
           left(coalesce(pr.description,''),140) sub, pr.cover_image_url img,
           (ts_rank(to_tsvector('english', public.f_unaccent(coalesce(pr.title,'')||' '||coalesce(pr.description,''))), q)
            + 0.4*public.f_score(public.f_unaccent(coalesce(pr.title,'')), uq))::real rk, pr.created_at
    FROM projects pr
    WHERE pr.status IN ('active','paused') AND (
      to_tsvector('english', public.f_unaccent(coalesce(pr.title,'')||' '||coalesce(pr.description,''))) @@ q
      OR public.f_unaccent(coalesce(pr.title,'')) ILIKE pat
      OR public.f_score(public.f_unaccent(coalesce(pr.title,'')), uq) > 0.4)
    UNION ALL
    -- profiles
    SELECT 'profile', p.id, coalesce(nullif(p.name,''), p.username),
           '@'||coalesce(p.username,''), p.avatar_url,
           (ts_rank(to_tsvector('english', public.f_unaccent(coalesce(p.username,'')||' '||coalesce(p.name,'')||' '||coalesce(p.bio,''))), q)
            + 0.4*public.f_score(public.f_unaccent(coalesce(p.username,'')||' '||coalesce(p.name,'')), uq))::real, p.created_at
    FROM profiles p
    WHERE to_tsvector('english', public.f_unaccent(coalesce(p.username,'')||' '||coalesce(p.name,'')||' '||coalesce(p.bio,''))) @@ q
      OR public.f_unaccent(coalesce(p.username,'')||' '||coalesce(p.name,'')) ILIKE pat
      OR public.f_score(public.f_unaccent(coalesce(p.username,'')||' '||coalesce(p.name,'')), uq) > 0.4
  ),
  more AS (
    -- products / services / causes / loans / events (title+description)
    SELECT et, id, title, sub, NULL::text img, rk, created_at FROM (
      SELECT 'product'::text et, x.id, x.title, left(coalesce(x.description,''),140) sub,
             (ts_rank(to_tsvector('english', public.f_unaccent(coalesce(x.title,'')||' '||coalesce(x.description,''))), q)
              + 0.4*public.f_score(public.f_unaccent(coalesce(x.title,'')), uq))::real rk, x.created_at
      FROM user_products x WHERE x.status='active' AND (
        to_tsvector('english', public.f_unaccent(coalesce(x.title,'')||' '||coalesce(x.description,''))) @@ q
        OR public.f_unaccent(coalesce(x.title,'')) ILIKE pat OR public.f_score(public.f_unaccent(coalesce(x.title,'')), uq) > 0.4)
      UNION ALL
      SELECT 'service', x.id, x.title, left(coalesce(x.description,''),140),
             (ts_rank(to_tsvector('english', public.f_unaccent(coalesce(x.title,'')||' '||coalesce(x.description,''))), q)
              + 0.4*public.f_score(public.f_unaccent(coalesce(x.title,'')), uq))::real, x.created_at
      FROM user_services x WHERE x.status='active' AND (
        to_tsvector('english', public.f_unaccent(coalesce(x.title,'')||' '||coalesce(x.description,''))) @@ q
        OR public.f_unaccent(coalesce(x.title,'')) ILIKE pat OR public.f_score(public.f_unaccent(coalesce(x.title,'')), uq) > 0.4)
      UNION ALL
      SELECT 'cause', x.id, x.title, left(coalesce(x.description,''),140),
             (ts_rank(to_tsvector('english', public.f_unaccent(coalesce(x.title,'')||' '||coalesce(x.description,''))), q)
              + 0.4*public.f_score(public.f_unaccent(coalesce(x.title,'')), uq))::real, x.created_at
      FROM user_causes x WHERE x.status='active' AND (
        to_tsvector('english', public.f_unaccent(coalesce(x.title,'')||' '||coalesce(x.description,''))) @@ q
        OR public.f_unaccent(coalesce(x.title,'')) ILIKE pat OR public.f_score(public.f_unaccent(coalesce(x.title,'')), uq) > 0.4)
      UNION ALL
      SELECT 'loan', x.id, x.title, left(coalesce(x.description,''),140),
             (ts_rank(to_tsvector('english', public.f_unaccent(coalesce(x.title,'')||' '||coalesce(x.description,''))), q)
              + 0.4*public.f_score(public.f_unaccent(coalesce(x.title,'')), uq))::real, x.created_at
      FROM loans x WHERE x.is_public AND x.status='active' AND (
        to_tsvector('english', public.f_unaccent(coalesce(x.title,'')||' '||coalesce(x.description,''))) @@ q
        OR public.f_unaccent(coalesce(x.title,'')) ILIKE pat OR public.f_score(public.f_unaccent(coalesce(x.title,'')), uq) > 0.4)
      UNION ALL
      SELECT 'event', x.id, x.title, left(coalesce(x.description,''),140),
             (ts_rank(to_tsvector('english', public.f_unaccent(coalesce(x.title,'')||' '||coalesce(x.description,''))), q)
              + 0.4*public.f_score(public.f_unaccent(coalesce(x.title,'')), uq))::real, x.created_at
      FROM events x WHERE x.status='active' AND (
        to_tsvector('english', public.f_unaccent(coalesce(x.title,'')||' '||coalesce(x.description,''))) @@ q
        OR public.f_unaccent(coalesce(x.title,'')) ILIKE pat OR public.f_score(public.f_unaccent(coalesce(x.title,'')), uq) > 0.4)
    ) s
  )
  SELECT et, id, title, sub, img, rk
  FROM (SELECT et, id, title, sub, img, rk, created_at FROM hits
        UNION ALL SELECT et, id, title, sub, img, rk, created_at FROM more) u
  ORDER BY rk DESC, created_at DESC
  LIMIT p_limit;
END $$;


--
-- Name: handle_new_profile_actor(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_profile_actor() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.actors WHERE user_id = NEW.id AND actor_type = 'user'
  ) THEN
    INSERT INTO public.actors (actor_type, user_id, display_name, avatar_url, slug)
    VALUES (
      'user',
      NEW.id,
      COALESCE(NEW.name, NEW.username, 'User'),
      NEW.avatar_url,
      NEW.username
    );
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, username, name, email, status, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(split_part(NEW.email, '@', 1), 'user_' || left(NEW.id::text, 8)),
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1),
      'User'
    ),
    NEW.email,
    'active',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;


--
-- Name: handle_new_user_plan(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user_plan() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.user_plans (user_id, tier, daily_limit)
  VALUES (NEW.id, 'free', 10)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;


--
-- Name: handle_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: has_user_disliked_event(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_user_disliked_event(p_event_id uuid, p_user_id uuid) RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS(
    SELECT 1 FROM timeline_dislikes
    WHERE event_id = p_event_id AND user_id = p_user_id
  );
$$;


--
-- Name: has_user_liked_event(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_user_liked_event(p_event_id uuid, p_user_id uuid) RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS(
    SELECT 1 FROM timeline_likes
    WHERE event_id = p_event_id AND user_id = p_user_id
  );
$$;


--
-- Name: has_user_shared_event(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_user_shared_event(p_event_id uuid, p_user_id uuid) RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS(
    SELECT 1 FROM timeline_shares
    WHERE original_event_id = p_event_id AND user_id = p_user_id
  );
$$;


--
-- Name: increment_ai_revenue(uuid, uuid, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_ai_revenue(p_assistant_id uuid, p_creator_id uuid, p_amount numeric) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO ai_creator_earnings (creator_id, total_earned_btc) VALUES (p_creator_id, p_amount)
  ON CONFLICT (creator_id) DO UPDATE SET total_earned_btc = ai_creator_earnings.total_earned_btc + p_amount;
  UPDATE ai_assistants SET
    total_revenue = COALESCE(total_revenue, 0) + p_amount,
    total_conversations = COALESCE(total_conversations, 0) + 1
  WHERE id = p_assistant_id;
END;
$$;


--
-- Name: increment_platform_usage(uuid, integer, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_platform_usage(p_user_id uuid, p_request_count integer DEFAULT 1, p_token_count bigint DEFAULT 0) RETURNS TABLE(daily_requests integer, daily_tokens bigint, limit_reached boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_daily_limit      INTEGER := 10;
  v_current_requests INTEGER := 0;
  v_current_tokens   BIGINT  := 0;
  v_expires_at       TIMESTAMPTZ;
BEGIN
  SELECT
    COALESCE(up.daily_limit, 10),
    up.expires_at
  INTO v_daily_limit, v_expires_at
  FROM public.user_plans up
  WHERE up.user_id = p_user_id;

  v_daily_limit := COALESCE(v_daily_limit, 10);

  IF v_expires_at IS NOT NULL AND v_expires_at < NOW() THEN
    v_daily_limit := 10;
  END IF;

  INSERT INTO public.platform_api_usage (user_id, usage_date, request_count, token_count)
  VALUES (p_user_id, CURRENT_DATE, p_request_count, p_token_count)
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET
    request_count = public.platform_api_usage.request_count + p_request_count,
    token_count   = public.platform_api_usage.token_count   + p_token_count,
    updated_at    = NOW();

  SELECT request_count, token_count
  INTO v_current_requests, v_current_tokens
  FROM public.platform_api_usage
  WHERE user_id = p_user_id AND usage_date = CURRENT_DATE;

  v_current_requests := COALESCE(v_current_requests, 0);
  v_current_tokens   := COALESCE(v_current_tokens, 0);

  RETURN QUERY SELECT
    v_current_requests,
    v_current_tokens,
    v_current_requests >= v_daily_limit;
END;
$$;


--
-- Name: is_group_member(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_group_member(p_group_id uuid, p_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id
      AND user_id = p_user_id
  );
$$;


--
-- Name: like_timeline_event(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.like_timeline_event(p_event_id uuid, p_user_id uuid) RETURNS TABLE(like_count integer)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Verify user is authenticated
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Insert the like (ignore if already exists)
  INSERT INTO timeline_likes (event_id, user_id)
  VALUES (p_event_id, p_user_id)
  ON CONFLICT (event_id, user_id) DO NOTHING;

  -- Remove any existing dislike
  DELETE FROM timeline_dislikes
  WHERE event_id = p_event_id AND user_id = p_user_id;

  -- Get the updated count
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM timeline_likes WHERE event_id = p_event_id;

  -- Update cached stats
  INSERT INTO timeline_event_stats (event_id, like_count, updated_at)
  VALUES (p_event_id, v_count, NOW())
  ON CONFLICT (event_id) DO UPDATE SET like_count = v_count, updated_at = NOW();

  -- Update timeline_events.like_count if column exists
  UPDATE timeline_events SET like_count = v_count WHERE id = p_event_id;

  RETURN QUERY SELECT v_count;
END;
$$;


--
-- Name: mark_conversation_read(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mark_conversation_read(p_conversation_id uuid, p_user_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Verify user is a participant
  IF NOT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = p_conversation_id
    AND user_id = p_user_id
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'User is not a participant in this conversation';
  END IF;

  -- Mark all unread messages as read
  INSERT INTO message_read_receipts (message_id, user_id)
  SELECT m.id, p_user_id
  FROM messages m
  WHERE m.conversation_id = p_conversation_id
    AND m.created_at > (
      SELECT last_read_at
      FROM conversation_participants
      WHERE conversation_id = p_conversation_id AND user_id = p_user_id
    )
  ON CONFLICT (message_id, user_id) DO NOTHING;

  -- Update participant's last_read_at
  UPDATE conversation_participants
  SET last_read_at = now()
  WHERE conversation_id = p_conversation_id AND user_id = p_user_id;
END;
$$;


--
-- Name: match_cat_memories(uuid, printcraft.vector, integer, double precision); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.match_cat_memories(p_user_id uuid, query_embedding printcraft.vector, match_count integer DEFAULT 6, min_similarity double precision DEFAULT 0.3) RETURNS TABLE(id uuid, content text, similarity double precision, created_at timestamp with time zone)
    LANGUAGE sql STABLE
    SET search_path TO 'public', 'printcraft'
    AS $$
  select
    cm.id,
    cm.content,
    1 - (cm.embedding <=> query_embedding) as similarity,
    cm.created_at
  from public.cat_memories cm
  where cm.user_id = p_user_id
    and cm.embedding is not null
    and 1 - (cm.embedding <=> query_embedding) >= min_similarity
  order by cm.embedding <=> query_embedding
  limit match_count;
$$;


--
-- Name: match_content(printcraft.vector, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.match_content(query_embedding printcraft.vector, match_count integer DEFAULT 8, filter_type text DEFAULT NULL::text) RETURNS TABLE(entity_type text, entity_id uuid, title text, url text, text_preview text, similarity double precision)
    LANGUAGE sql STABLE
    SET search_path TO 'public', 'printcraft'
    AS $$
  select
    ce.entity_type,
    ce.entity_id,
    ce.title,
    ce.url,
    ce.text_preview,
    1 - (ce.embedding <=> query_embedding) as similarity
  from public.content_embeddings ce
  where ce.embedding is not null
    and (filter_type is null or ce.entity_type = filter_type)
  order by ce.embedding <=> query_embedding
  limit match_count;
$$;


--
-- Name: match_content(printcraft.vector, integer, text, double precision); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.match_content(query_embedding printcraft.vector, match_count integer DEFAULT 8, filter_type text DEFAULT NULL::text, min_similarity double precision DEFAULT 0.35) RETURNS TABLE(entity_type text, entity_id uuid, title text, url text, text_preview text, similarity double precision, quality_score double precision, score double precision)
    LANGUAGE sql STABLE
    SET search_path TO 'public', 'printcraft'
    AS $$
  select
    ce.entity_type,
    ce.entity_id,
    ce.title,
    ce.url,
    ce.text_preview,
    1 - (ce.embedding <=> query_embedding) as similarity,
    ce.quality_score,
    (1 - (ce.embedding <=> query_embedding)) + 0.15 * coalesce(ce.quality_score, 0) as score
  from public.content_embeddings ce
  where ce.embedding is not null
    and (filter_type is null or ce.entity_type = filter_type)
    and (1 - (ce.embedding <=> query_embedding)) >= min_similarity
  order by score desc
  limit match_count;
$$;


--
-- Name: notify_embedding_reindex(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_embedding_reindex() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
declare
  v_secret text;
  v_id uuid;
begin
  select secret into v_secret from private.reindex_config limit 1;
  if v_secret is null or v_secret = '' then
    return coalesce(new, old);
  end if;
  v_id := coalesce(new.id, old.id);
  perform net.http_post(
    url := 'https://orangecat.ch/api/admin/reindex-embeddings',
    body := jsonb_build_object('entity_type', tg_argv[0], 'entity_id', v_id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-reindex-secret', v_secret)
  );
  return coalesce(new, old);
end;
$$;


--
-- Name: request_ai_withdrawal(uuid, numeric, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.request_ai_withdrawal(p_creator_id uuid, p_amount numeric, p_destination text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO ai_creator_withdrawals (creator_id, amount_btc, destination, status)
  VALUES (p_creator_id, p_amount, p_destination, 'pending') RETURNING id INTO v_id;
  UPDATE ai_creator_earnings SET pending_withdrawal_btc = COALESCE(pending_withdrawal_btc, 0) + p_amount
  WHERE creator_id = p_creator_id;
  RETURN v_id;
END;
$$;


--
-- Name: reset_task_on_completion(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reset_task_on_completion() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Reset recurring tasks to idle
  UPDATE tasks
  SET current_status = 'idle',
      updated_at = now()
  WHERE id = NEW.task_id
  AND task_type != 'one_time';

  -- Mark one-time tasks as completed
  UPDATE tasks
  SET is_completed = true,
      completed_at = NEW.completed_at,
      completed_by = NEW.completed_by,
      current_status = 'idle',
      updated_at = now()
  WHERE id = NEW.task_id
  AND task_type = 'one_time';

  -- Resolve all open attention flags for this task
  UPDATE task_attention_flags
  SET is_resolved = true,
      resolved_by = NEW.completed_by,
      resolved_at = NEW.completed_at,
      resolved_by_completion_id = NEW.id
  WHERE task_id = NEW.task_id
  AND is_resolved = false;

  -- Complete all pending/accepted requests for this task
  UPDATE task_requests
  SET status = 'completed',
      completion_id = NEW.id,
      responded_by = COALESCE(responded_by, NEW.completed_by),
      updated_at = now()
  WHERE task_id = NEW.task_id
  AND status IN ('pending', 'accepted');

  RETURN NEW;
END;
$$;


--
-- Name: search_profiles_fts(text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_profiles_fts(p_query text, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0) RETURNS TABLE(id uuid, username text, name text, bio text, avatar_url text, created_at timestamp with time zone, location_country text, location_city text, location_zip text, latitude double precision, longitude double precision)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions'
    AS $$
DECLARE
  uq text := public.f_unaccent(coalesce(p_query,''));
  q  tsquery := websearch_to_tsquery('english', uq);
  pat text := '%'||uq||'%';
BEGIN
  IF length(trim(uq)) = 0 THEN RETURN; END IF;
  RETURN QUERY
  SELECT p.id, p.username, p.name, p.bio, p.avatar_url, p.created_at,
         p.location_country, p.location_city, p.location_zip, p.latitude, p.longitude
  FROM profiles p
  WHERE to_tsvector('english', public.f_unaccent(coalesce(p.username,'')||' '||coalesce(p.name,'')||' '||coalesce(p.bio,''))) @@ q
     OR public.f_unaccent(coalesce(p.username,'')||' '||coalesce(p.name,'')) ILIKE pat
     OR public.f_score(public.f_unaccent(coalesce(p.username,'')||' '||coalesce(p.name,'')), uq) > 0.4
  ORDER BY
    ts_rank(
      setweight(to_tsvector('english', public.f_unaccent(coalesce(p.username,'')||' '||coalesce(p.name,''))), 'A') ||
      setweight(to_tsvector('english', public.f_unaccent(coalesce(p.bio,''))), 'C'), q
    )
    + 0.4 * public.f_score(public.f_unaccent(coalesce(p.username,'')||' '||coalesce(p.name,'')), uq) DESC,
    p.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END $$;


--
-- Name: search_profiles_nearby(double precision, double precision, double precision, text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_profiles_nearby(p_lat double precision, p_lng double precision, p_radius_km double precision, p_query text DEFAULT NULL::text, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0) RETURNS TABLE(id uuid, username text, name text, bio text, avatar_url text, created_at timestamp with time zone, location_country text, location_city text, location_zip text, latitude double precision, longitude double precision, distance_km double precision)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.name,
    p.bio,
    p.avatar_url,
    p.created_at,
    p.location_country,
    p.location_city,
    p.location_zip,
    p.latitude,
    p.longitude,
    -- Calculate distance in km
    ST_Distance(
      ST_MakePoint(p.longitude, p.latitude)::geography,
      ST_MakePoint(p_lng, p_lat)::geography
    ) / 1000.0 as distance_km
  FROM profiles p
  WHERE p.latitude IS NOT NULL
    AND p.longitude IS NOT NULL
    AND ST_DWithin(
      ST_MakePoint(p.longitude, p.latitude)::geography,
      ST_MakePoint(p_lng, p_lat)::geography,
      p_radius_km * 1000  -- Convert km to meters
    )
    AND (p_query IS NULL OR 
         to_tsvector('english',
           coalesce(p.username, '') || ' ' ||
           coalesce(p.name, '') || ' ' ||
           coalesce(p.bio, '')
         ) @@ plainto_tsquery('english', p_query))
  ORDER BY 
    ST_Distance(
      ST_MakePoint(p.longitude, p.latitude)::geography,
      ST_MakePoint(p_lng, p_lat)::geography
    ) ASC,
    p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;


--
-- Name: FUNCTION search_profiles_nearby(p_lat double precision, p_lng double precision, p_radius_km double precision, p_query text, p_limit integer, p_offset integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.search_profiles_nearby(p_lat double precision, p_lng double precision, p_radius_km double precision, p_query text, p_limit integer, p_offset integer) IS 'PostGIS geographic search for profiles within radius (replaces JavaScript Haversine)';


--
-- Name: search_projects_fts(text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_projects_fts(p_query text, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0) RETURNS TABLE(id uuid, user_id uuid, title text, description text, bitcoin_address text, created_at timestamp with time zone, updated_at timestamp with time zone, category text, status text, goal_amount numeric, currency text, raised_amount numeric, cover_image_url text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions'
    AS $$
DECLARE
  uq text := public.f_unaccent(coalesce(p_query,''));
  q  tsquery := websearch_to_tsquery('english', uq);
  pat text := '%'||uq||'%';
BEGIN
  IF length(trim(uq)) = 0 THEN RETURN; END IF;
  RETURN QUERY
  SELECT pr.id, pr.user_id, pr.title, pr.description, pr.bitcoin_address,
         pr.created_at, pr.updated_at, pr.category, pr.status, pr.goal_amount,
         pr.currency, pr.raised_amount, pr.cover_image_url
  FROM projects pr
  WHERE to_tsvector('english', public.f_unaccent(coalesce(pr.title,'')||' '||coalesce(pr.description,''))) @@ q
     OR public.f_unaccent(coalesce(pr.title,'')||' '||coalesce(pr.description,'')) ILIKE pat
     OR public.f_score(public.f_unaccent(coalesce(pr.title,'')), uq) > 0.4
  ORDER BY
    ts_rank(
      setweight(to_tsvector('english', public.f_unaccent(coalesce(pr.title,''))), 'A') ||
      setweight(to_tsvector('english', public.f_unaccent(coalesce(pr.description,''))), 'B'), q
    )
    + 0.4 * public.f_score(public.f_unaccent(coalesce(pr.title,'')), uq) DESC,
    pr.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END $$;


--
-- Name: search_projects_nearby(double precision, double precision, double precision, text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_projects_nearby(p_lat double precision, p_lng double precision, p_radius_km double precision, p_query text DEFAULT NULL::text, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0) RETURNS TABLE(id uuid, user_id uuid, title text, description text, bitcoin_address text, created_at timestamp with time zone, updated_at timestamp with time zone, category text, status text, goal_amount numeric, currency text, raised_amount numeric, cover_image_url text, location_city text, location_country text, location_coordinates point, distance_km double precision)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pr.id,
    pr.user_id,
    pr.title,
    pr.description,
    pr.bitcoin_address,
    pr.created_at,
    pr.updated_at,
    pr.category,
    pr.status,
    pr.goal_amount,
    pr.currency,
    pr.raised_amount,
    pr.cover_image_url,
    pr.location_city,
    pr.location_country,
    pr.location_coordinates,
    -- Calculate distance in km
    ST_Distance(
      pr.location_coordinates::geography,
      ST_MakePoint(p_lng, p_lat)::geography
    ) / 1000.0 as distance_km
  FROM projects pr
  WHERE pr.location_coordinates IS NOT NULL
    AND ST_DWithin(
      pr.location_coordinates::geography,
      ST_MakePoint(p_lng, p_lat)::geography,
      p_radius_km * 1000  -- Convert km to meters
    )
    AND (p_query IS NULL OR 
         to_tsvector('english',
           coalesce(pr.title, '') || ' ' ||
           coalesce(pr.description, '')
         ) @@ plainto_tsquery('english', p_query))
    AND pr.status IN ('active', 'paused')
  ORDER BY 
    ST_Distance(
      pr.location_coordinates::geography,
      ST_MakePoint(p_lng, p_lat)::geography
    ) ASC,
    pr.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;


--
-- Name: FUNCTION search_projects_nearby(p_lat double precision, p_lng double precision, p_radius_km double precision, p_query text, p_limit integer, p_offset integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.search_projects_nearby(p_lat double precision, p_lng double precision, p_radius_km double precision, p_query text, p_limit integer, p_offset integer) IS 'PostGIS geographic search for projects within radius (replaces JavaScript Haversine)';


--
-- Name: send_message(uuid, uuid, text, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.send_message(p_conversation_id uuid, p_sender_id uuid, p_content text, p_message_type text DEFAULT 'text'::text, p_metadata jsonb DEFAULT NULL::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  message_id uuid;
BEGIN
  -- Verify sender is a participant
  IF NOT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = p_conversation_id
    AND user_id = p_sender_id
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'User is not a participant in this conversation';
  END IF;

  -- Insert message
  INSERT INTO messages (conversation_id, sender_id, content, message_type, metadata)
  VALUES (p_conversation_id, p_sender_id, p_content, p_message_type, p_metadata)
  RETURNING id INTO message_id;

  -- Update conversation metadata
  UPDATE conversations
  SET
    last_message_at = now(),
    last_message_preview = LEFT(p_content, 100),
    last_message_sender_id = p_sender_id,
    updated_at = now()
  WHERE id = p_conversation_id;

  -- Update participant's last_read_at for sender
  UPDATE conversation_participants
  SET last_read_at = now()
  WHERE conversation_id = p_conversation_id
    AND user_id = p_sender_id;

  RETURN message_id;
END;
$$;


--
-- Name: set_ai_assistant_published_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_ai_assistant_published_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  IF NEW.status = 'active' AND OLD.status != 'active' AND NEW.published_at IS NULL THEN
    NEW.published_at = now();
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: set_updated_at_stakeholder_relationships(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at_stakeholder_relationships() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: set_wallet_user_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_wallet_user_id() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$ BEGIN IF NEW.profile_id IS NOT NULL THEN NEW.user_id := NEW.profile_id; ELSIF NEW.project_id IS NOT NULL THEN SELECT user_id INTO NEW.user_id FROM projects WHERE id = NEW.project_id; END IF; IF NEW.user_id IS NULL THEN RAISE EXCEPTION 'Could not determine user_id for wallet'; END IF; RETURN NEW; END; $$;


--
-- Name: share_timeline_event(uuid, uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.share_timeline_event(p_original_event_id uuid, p_user_id uuid DEFAULT NULL::uuid, p_share_text text DEFAULT NULL::text, p_visibility text DEFAULT 'public'::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Set user_id if not provided
  v_user_id := COALESCE(p_user_id, auth.uid());
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  -- Check if event exists
  IF NOT EXISTS(SELECT 1 FROM timeline_events WHERE id = p_original_event_id AND NOT is_deleted) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Event not found');
  END IF;

  -- Insert share
  INSERT INTO timeline_shares (original_event_id, user_id, share_text, visibility)
  VALUES (p_original_event_id, v_user_id, p_share_text, p_visibility);

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'share_count', get_event_share_count(p_original_event_id)
  );
END;
$$;


--
-- Name: FUNCTION share_timeline_event(p_original_event_id uuid, p_user_id uuid, p_share_text text, p_visibility text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.share_timeline_event(p_original_event_id uuid, p_user_id uuid, p_share_text text, p_visibility text) IS 'Share a timeline event with optional text';


--
-- Name: soft_delete_timeline_event(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.soft_delete_timeline_event(event_id uuid, reason text DEFAULT NULL::text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_actor_id UUID;
  v_deleted BOOLEAN := FALSE;
BEGIN
  -- Get the current user's ID
  v_actor_id := auth.uid();

  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check if user owns this event (or is admin)
  IF NOT EXISTS (
    SELECT 1 FROM timeline_events
    WHERE id = event_id
    AND (actor_id = v_actor_id OR v_actor_id IN (
      SELECT user_id FROM profiles WHERE role = 'admin'
    ))
  ) THEN
    RAISE EXCEPTION 'Event not found or access denied';
  END IF;

  -- Soft delete by setting deleted_at and optionally storing reason
  UPDATE timeline_events
  SET
    deleted_at = NOW(),
    metadata = COALESCE(metadata, '{}'::jsonb) ||
      CASE WHEN reason IS NOT NULL
        THEN jsonb_build_object('deletion_reason', reason)
        ELSE '{}'::jsonb
      END
  WHERE id = event_id
  AND deleted_at IS NULL;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  -- Update engagement counts on parent if this was a reply
  UPDATE timeline_events parent
  SET reply_count = GREATEST(0, COALESCE(reply_count, 0) - 1)
  WHERE parent.id = (
    SELECT parent_event_id FROM timeline_events WHERE id = event_id
  )
  AND parent.id IS NOT NULL;

  RETURN v_deleted > 0;
END;
$$;


--
-- Name: sync_profile_to_actor(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_profile_to_actor() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
  UPDATE public.actors SET
    display_name = COALESCE(NEW.name, NEW.username, 'User'),
    avatar_url   = NEW.avatar_url,
    slug         = NEW.username,
    updated_at   = now()
  WHERE user_id = NEW.id AND actor_type = 'user';
  RETURN NEW;
END;
$$;


--
-- Name: sync_project_funding(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_project_funding() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    IF NEW.to_entity_type = 'project' AND NEW.status = 'confirmed' THEN
      UPDATE projects SET
        raised_amount = COALESCE(raised_amount, 0) + NEW.amount_btc,
        contributor_count = CASE
          WHEN NEW.from_entity_type = 'profile' THEN COALESCE(contributor_count, 0) + 1
          ELSE COALESCE(contributor_count, 0)
        END,
        updated_at = NOW()
      WHERE id = NEW.to_entity_id;
    END IF;
    RETURN NEW;
  END IF;
  IF (TG_OP = 'UPDATE') THEN
    IF NEW.to_entity_type = 'project' AND OLD.status != NEW.status THEN
      IF OLD.status = 'confirmed' AND NEW.status != 'confirmed' THEN
        UPDATE projects SET
          raised_amount = GREATEST(0, COALESCE(raised_amount, 0) - OLD.amount_btc),
          contributor_count = CASE
            WHEN OLD.from_entity_type = 'profile' THEN GREATEST(0, COALESCE(contributor_count, 0) - 1)
            ELSE COALESCE(contributor_count, 0)
          END,
          updated_at = NOW()
        WHERE id = OLD.to_entity_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;


--
-- Name: transfer_between_wallets(uuid, uuid, numeric, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.transfer_between_wallets(p_from_wallet_id uuid, p_to_wallet_id uuid, p_amount_btc numeric, p_transaction_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: undislike_timeline_event(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.undislike_timeline_event(p_event_id uuid, p_user_id uuid) RETURNS TABLE(dislike_count integer)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Verify user is authenticated
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Remove the dislike
  DELETE FROM timeline_dislikes
  WHERE event_id = p_event_id AND user_id = p_user_id;

  -- Get the updated count
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM timeline_dislikes WHERE event_id = p_event_id;

  -- Update cached stats
  INSERT INTO timeline_event_stats (event_id, dislike_count, updated_at)
  VALUES (p_event_id, v_count, NOW())
  ON CONFLICT (event_id) DO UPDATE SET dislike_count = v_count, updated_at = NOW();

  -- Update timeline_events.dislike_count if column exists
  UPDATE timeline_events SET dislike_count = v_count WHERE id = p_event_id;

  RETURN QUERY SELECT v_count;
END;
$$;


--
-- Name: unlike_timeline_event(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.unlike_timeline_event(p_event_id uuid, p_user_id uuid) RETURNS TABLE(like_count integer)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Verify user is authenticated
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Remove the like
  DELETE FROM timeline_likes
  WHERE event_id = p_event_id AND user_id = p_user_id;

  -- Get the updated count
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM timeline_likes WHERE event_id = p_event_id;

  -- Update cached stats
  INSERT INTO timeline_event_stats (event_id, like_count, updated_at)
  VALUES (p_event_id, v_count, NOW())
  ON CONFLICT (event_id) DO UPDATE SET like_count = v_count, updated_at = NOW();

  -- Update timeline_events.like_count if column exists
  UPDATE timeline_events SET like_count = v_count WHERE id = p_event_id;

  RETURN QUERY SELECT v_count;
END;
$$;


--
-- Name: update_ai_assistant_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_ai_assistant_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_ai_conversation_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_ai_conversation_stats() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  UPDATE ai_conversations
  SET
    total_messages = total_messages + 1,
    total_tokens_used = total_tokens_used + COALESCE(NEW.tokens_used, 0),
    total_cost_btc = total_cost_btc + COALESCE(NEW.cost_btc, 0),
    last_message_at = NEW.created_at,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;


--
-- Name: update_assets_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_assets_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_association_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_association_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;


--
-- Name: update_booking_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_booking_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;


--
-- Name: update_cat_conversation_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_cat_conversation_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE cat_conversations SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;


--
-- Name: update_cat_permissions_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_cat_permissions_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_conversation_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_conversation_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_events_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_events_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_group_event_rsvps_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_group_event_rsvps_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_group_events_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_group_events_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_groups_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_groups_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_key_usage(uuid, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_key_usage(p_key_id uuid, p_tokens_used bigint DEFAULT 0) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: update_loan_offers_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_loan_offers_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_loans_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_loans_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_message_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_message_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  NEW.updated_at = now();
  IF TG_OP = 'UPDATE' THEN
    NEW.edited_at = now();
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: update_notification_preferences_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_notification_preferences_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_project_support_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_project_support_stats() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO project_support_stats (project_id, total_bitcoin_sats, total_signatures, total_messages, total_reactions, total_supporters, last_support_at)
  VALUES (
    NEW.project_id,
    CASE WHEN NEW.support_type = 'bitcoin_funding' THEN NEW.amount_sats ELSE 0 END,
    CASE WHEN NEW.support_type = 'signature' THEN 1 ELSE 0 END,
    CASE WHEN NEW.support_type = 'message' THEN 1 ELSE 0 END,
    CASE WHEN NEW.support_type = 'reaction' THEN 1 ELSE 0 END,
    1,
    NEW.created_at
  )
  ON CONFLICT (project_id) DO UPDATE SET
    total_bitcoin_sats = project_support_stats.total_bitcoin_sats + 
      CASE WHEN NEW.support_type = 'bitcoin_funding' THEN NEW.amount_sats ELSE 0 END,
    total_signatures = project_support_stats.total_signatures + 
      CASE WHEN NEW.support_type = 'signature' THEN 1 ELSE 0 END,
    total_messages = project_support_stats.total_messages + 
      CASE WHEN NEW.support_type = 'message' THEN 1 ELSE 0 END,
    total_reactions = project_support_stats.total_reactions + 
      CASE WHEN NEW.support_type = 'reaction' THEN 1 ELSE 0 END,
    total_supporters = (
      SELECT COUNT(DISTINCT user_id) 
      FROM project_support 
      WHERE project_id = NEW.project_id AND user_id IS NOT NULL
    ),
    last_support_at = NEW.created_at,
    updated_at = timezone('utc'::text, now());
  
  RETURN NEW;
END;
$$;


--
-- Name: update_task_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_task_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_timeline_comment(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_timeline_comment(p_comment_id uuid, p_user_id uuid, p_content text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Verify user is authenticated
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Update the comment (only if user owns it)
  UPDATE timeline_comments
  SET content = p_content, updated_at = NOW()
  WHERE id = p_comment_id AND user_id = p_user_id AND is_deleted = false;

  RETURN FOUND;
END;
$$;


--
-- Name: update_timeline_comment_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_timeline_comment_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_timeline_event_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_timeline_event_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_treasury_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_treasury_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_user_ai_preferences_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_user_ai_preferences_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_user_documents_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_user_documents_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: user_api_keys_touch_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.user_api_keys_touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END $$;


--
-- Name: user_is_participant(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.user_is_participant(p_conversation_id uuid, p_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Temporarily disable RLS for this function execution
  SET LOCAL row_security = off;
  RETURN EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = p_conversation_id
    AND user_id = p_user_id
    AND is_active = true
  );
END;
$$;


--
-- Name: _backup_cat_conversations_20260703; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._backup_cat_conversations_20260703 (
    id uuid,
    user_id uuid,
    title text,
    is_default boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: _backup_cat_messages_20260703; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._backup_cat_messages_20260703 (
    id uuid,
    conversation_id uuid,
    user_id uuid,
    role text,
    content text,
    model_used text,
    provider text,
    token_count integer,
    created_at timestamp with time zone
);


--
-- Name: actors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.actors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_type text NOT NULL,
    user_id uuid,
    group_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    display_name text,
    avatar_url text,
    slug text,
    CONSTRAINT actor_type_check CHECK ((((actor_type = 'user'::text) AND (user_id IS NOT NULL) AND (group_id IS NULL)) OR ((actor_type = 'group'::text) AND (group_id IS NOT NULL) AND (user_id IS NULL)))),
    CONSTRAINT actors_actor_type_check CHECK ((actor_type = ANY (ARRAY['user'::text, 'group'::text])))
);


--
-- Name: ai_assistants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_assistants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    category text,
    tags text[] DEFAULT '{}'::text[],
    avatar_url text,
    system_prompt text NOT NULL,
    welcome_message text,
    personality_traits text[],
    knowledge_base_urls text[],
    model_preference text DEFAULT 'any'::text,
    max_tokens_per_response integer DEFAULT 1000,
    temperature numeric(3,2) DEFAULT 0.7,
    compute_provider_type public.compute_provider_type DEFAULT 'api'::public.compute_provider_type,
    compute_provider_id uuid,
    api_provider text,
    pricing_model public.ai_pricing_model DEFAULT 'per_message'::public.ai_pricing_model,
    price_per_message numeric(20,8) DEFAULT 0,
    price_per_1k_tokens numeric(20,8) DEFAULT 0,
    subscription_price numeric(20,8) DEFAULT 0,
    free_messages_per_day integer DEFAULT 0,
    status public.ai_assistant_status DEFAULT 'draft'::public.ai_assistant_status,
    is_public boolean DEFAULT false,
    is_featured boolean DEFAULT false,
    total_conversations integer DEFAULT 0,
    total_revenue numeric(20,8) DEFAULT 0,
    average_rating numeric(3,2),
    lightning_address text,
    bitcoin_address text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    published_at timestamp with time zone,
    total_withdrawn_btc numeric(18,8) DEFAULT 0,
    actor_id uuid NOT NULL,
    show_on_profile boolean DEFAULT true,
    allowed_models text[] DEFAULT '{}'::text[],
    default_model text DEFAULT 'auto'::text,
    min_model_tier text DEFAULT 'economy'::text,
    CONSTRAINT ai_assistants_min_model_tier_check CHECK ((min_model_tier = ANY (ARRAY['economy'::text, 'standard'::text, 'premium'::text]))),
    CONSTRAINT valid_price CHECK (((pricing_model = 'free'::public.ai_pricing_model) OR ((pricing_model = 'per_message'::public.ai_pricing_model) AND (price_per_message >= (0)::numeric)) OR ((pricing_model = 'per_token'::public.ai_pricing_model) AND (price_per_1k_tokens >= (0)::numeric)) OR ((pricing_model = 'subscription'::public.ai_pricing_model) AND (subscription_price >= (0)::numeric)))),
    CONSTRAINT valid_temperature CHECK (((temperature >= (0)::numeric) AND (temperature <= (2)::numeric)))
);


--
-- Name: TABLE ai_assistants; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ai_assistants IS 'AI Assistants created by users - autonomous AI services with customizable prompts, pricing, and compute providers';


--
-- Name: COLUMN ai_assistants.system_prompt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ai_assistants.system_prompt IS 'The core prompt/context that defines the AI behavior - this is the "software"';


--
-- Name: COLUMN ai_assistants.compute_provider_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ai_assistants.compute_provider_type IS 'Where the AI runs: api (OpenAI/Anthropic), self_hosted (user hardware), or community (shared compute)';


--
-- Name: COLUMN ai_assistants.pricing_model; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ai_assistants.pricing_model IS 'How users pay: per message, per token, subscription, or free';


--
-- Name: COLUMN ai_assistants.show_on_profile; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ai_assistants.show_on_profile IS 'Whether this AI assistant appears on the user''s public profile page';


--
-- Name: COLUMN ai_assistants.allowed_models; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ai_assistants.allowed_models IS 'List of OpenRouter model IDs users can select (empty = all available)';


--
-- Name: COLUMN ai_assistants.default_model; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ai_assistants.default_model IS 'Default model ID or "auto" for automatic selection';


--
-- Name: COLUMN ai_assistants.min_model_tier; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ai_assistants.min_model_tier IS 'Minimum model tier for this assistant (economy, standard, premium)';


--
-- Name: ai_conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assistant_id uuid NOT NULL,
    user_id uuid NOT NULL,
    title text,
    status text DEFAULT 'active'::text,
    total_messages integer DEFAULT 0,
    total_tokens_used integer DEFAULT 0,
    total_cost_btc numeric(18,8) DEFAULT 0,
    last_message_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ai_conversations_status_check CHECK ((status = ANY (ARRAY['active'::text, 'archived'::text])))
);


--
-- Name: ai_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    tokens_used integer DEFAULT 0,
    cost_btc numeric(18,8) DEFAULT 0,
    model_used text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    api_cost_btc numeric(18,8) DEFAULT 0,
    creator_markup_btc numeric(18,8) DEFAULT 0,
    CONSTRAINT ai_messages_role_check CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text])))
);


--
-- Name: COLUMN ai_messages.api_cost_btc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ai_messages.api_cost_btc IS 'Actual OpenRouter API cost in satoshis';


--
-- Name: COLUMN ai_messages.creator_markup_btc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ai_messages.creator_markup_btc IS 'Creator markup above API cost in satoshis';


--
-- Name: ai_cost_analytics; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.ai_cost_analytics AS
 SELECT a.id AS assistant_id,
    a.title AS assistant_title,
    a.user_id AS creator_id,
    count(m.id) AS total_messages,
    sum(m.tokens_used) AS total_tokens,
    sum(m.cost_btc) AS total_cost_btc,
    sum(m.api_cost_btc) AS total_api_cost_btc,
    sum(m.creator_markup_btc) AS total_creator_earnings_btc,
    avg(m.cost_btc) AS avg_cost_per_message,
    count(DISTINCT c.user_id) AS unique_users
   FROM ((public.ai_assistants a
     LEFT JOIN public.ai_conversations c ON ((c.assistant_id = a.id)))
     LEFT JOIN public.ai_messages m ON (((m.conversation_id = c.id) AND (m.role = 'assistant'::text))))
  GROUP BY a.id, a.title, a.user_id;


--
-- Name: VIEW ai_cost_analytics; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.ai_cost_analytics IS 'Analytics view for AI assistant costs and earnings (BTC)';


--
-- Name: ai_creator_earnings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_creator_earnings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    total_earned_btc bigint DEFAULT 0,
    total_withdrawn_btc bigint DEFAULT 0,
    available_balance_btc numeric(18,8) GENERATED ALWAYS AS ((total_earned_btc - total_withdrawn_btc)) STORED,
    pending_withdrawal_btc numeric(18,8) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: ai_creator_withdrawals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_creator_withdrawals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    amount_btc bigint NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    lightning_address text,
    payment_hash text,
    payment_preimage text,
    fee_btc bigint DEFAULT 0,
    failure_reason text,
    processed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    net_amount_btc numeric(18,8) GENERATED ALWAYS AS ((amount_btc - COALESCE(fee_btc, (0)::bigint))) STORED,
    CONSTRAINT ai_creator_withdrawals_amount_sats_check CHECK ((amount_btc > 0)),
    CONSTRAINT ai_creator_withdrawals_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text, 'cancelled'::text])))
);


--
-- Name: asset_availability; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asset_availability (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    asset_id uuid NOT NULL,
    provider_actor_id uuid NOT NULL,
    available_from date NOT NULL,
    available_to date,
    min_rental_hours integer DEFAULT 1,
    max_rental_hours integer,
    rental_price_per_hour_btc numeric(18,8),
    rental_price_per_day_btc numeric(18,8),
    blocked_dates jsonb DEFAULT '[]'::jsonb,
    is_available boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    description text,
    location text,
    estimated_value numeric,
    currency text DEFAULT 'USD'::text NOT NULL,
    documents jsonb,
    verification_status text DEFAULT 'unverified'::text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    public_visibility boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    actor_id uuid,
    is_for_sale boolean DEFAULT false NOT NULL,
    sale_price_btc numeric(18,8),
    is_for_rent boolean DEFAULT false NOT NULL,
    rental_price_btc numeric(18,8),
    rental_period_type text DEFAULT 'daily'::text NOT NULL,
    min_rental_period integer DEFAULT 1 NOT NULL,
    max_rental_period integer,
    requires_deposit boolean DEFAULT false NOT NULL,
    deposit_amount_btc numeric(18,8),
    show_on_profile boolean DEFAULT true NOT NULL,
    is_test boolean DEFAULT false NOT NULL,
    CONSTRAINT assets_rental_period_type_check CHECK ((rental_period_type = ANY (ARRAY['hourly'::text, 'daily'::text, 'weekly'::text, 'monthly'::text]))),
    CONSTRAINT assets_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'archived'::text]))),
    CONSTRAINT assets_title_check CHECK ((char_length(title) <= 100)),
    CONSTRAINT assets_type_check CHECK ((type = ANY (ARRAY['real_estate'::text, 'vehicle'::text, 'luxury'::text, 'equipment'::text, 'computing'::text, 'recreational'::text, 'robot'::text, 'drone'::text, 'business'::text, 'securities'::text, 'other'::text]))),
    CONSTRAINT assets_verification_status_check CHECK ((verification_status = ANY (ARRAY['unverified'::text, 'user_provided'::text, 'third_party_verified'::text])))
);


--
-- Name: COLUMN assets.is_for_sale; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assets.is_for_sale IS 'Whether the asset is listed for sale';


--
-- Name: COLUMN assets.sale_price_btc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assets.sale_price_btc IS 'Sale price in BTC (NUMERIC(18,8))';


--
-- Name: COLUMN assets.is_for_rent; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assets.is_for_rent IS 'Whether the asset is available for rent';


--
-- Name: COLUMN assets.rental_price_btc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assets.rental_price_btc IS 'Rental price in BTC per period';


--
-- Name: COLUMN assets.rental_period_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assets.rental_period_type IS 'Type of rental period: hourly, daily, weekly, monthly';


--
-- Name: COLUMN assets.min_rental_period; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assets.min_rental_period IS 'Minimum rental periods required';


--
-- Name: COLUMN assets.max_rental_period; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assets.max_rental_period IS 'Maximum rental periods allowed (null = unlimited)';


--
-- Name: COLUMN assets.requires_deposit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assets.requires_deposit IS 'Whether a security deposit is required for rentals';


--
-- Name: COLUMN assets.deposit_amount_btc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assets.deposit_amount_btc IS 'Security deposit amount in BTC';


--
-- Name: COLUMN assets.show_on_profile; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assets.show_on_profile IS 'Whether this asset appears on the user''s public profile page';


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    action text NOT NULL,
    user_id uuid,
    entity_type text,
    entity_id text,
    metadata jsonb DEFAULT '{}'::jsonb,
    ip_address text,
    user_agent text,
    success boolean DEFAULT true,
    error_message text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: availability_slots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.availability_slots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service_id uuid NOT NULL,
    provider_actor_id uuid NOT NULL,
    day_of_week integer,
    specific_date date,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    is_available boolean DEFAULT true,
    max_bookings integer DEFAULT 1,
    current_bookings integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT availability_slots_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6))),
    CONSTRAINT slot_has_schedule CHECK ((((day_of_week IS NOT NULL) AND (specific_date IS NULL)) OR ((day_of_week IS NULL) AND (specific_date IS NOT NULL))))
);


--
-- Name: bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bookings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bookable_type text NOT NULL,
    bookable_id uuid NOT NULL,
    provider_actor_id uuid NOT NULL,
    customer_actor_id uuid NOT NULL,
    customer_user_id uuid NOT NULL,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone NOT NULL,
    timezone text DEFAULT 'UTC'::text,
    duration_minutes integer,
    price_btc numeric(18,8) DEFAULT 0 NOT NULL,
    currency text DEFAULT 'BTC'::text,
    deposit_btc numeric(18,8) DEFAULT 0,
    deposit_paid boolean DEFAULT false,
    total_paid_btc numeric(18,8) DEFAULT 0,
    status text DEFAULT 'pending'::text,
    customer_notes text,
    provider_notes text,
    cancellation_reason text,
    metadata jsonb DEFAULT '{}'::jsonb,
    confirmed_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT bookings_bookable_type_check CHECK ((bookable_type = ANY (ARRAY['service'::text, 'asset'::text]))),
    CONSTRAINT bookings_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text, 'rejected'::text, 'no_show'::text])))
);


--
-- Name: cat_action_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cat_action_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    action_id text NOT NULL,
    category public.cat_action_category NOT NULL,
    status public.cat_action_status DEFAULT 'pending'::public.cat_action_status NOT NULL,
    parameters jsonb DEFAULT '{}'::jsonb NOT NULL,
    result jsonb,
    error_message text,
    conversation_id uuid,
    message_id uuid,
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    confirmed_at timestamp with time zone,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    amount_btc numeric(18,8),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE cat_action_log; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.cat_action_log IS 'Audit trail of all actions executed by My Cat - full history for transparency';


--
-- Name: cat_conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cat_conversations (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    title text,
    is_default boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cat_credit_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cat_credit_entries (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    seq bigint NOT NULL,
    user_id uuid NOT NULL,
    kind text NOT NULL,
    amount_btc numeric(18,8) NOT NULL,
    balance_after_btc numeric(18,8) NOT NULL,
    ref text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cat_credit_entries_kind_check CHECK ((kind = ANY (ARRAY['topup'::text, 'usage'::text, 'grant'::text, 'refund'::text, 'adjustment'::text])))
);


--
-- Name: cat_credit_entries_seq_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.cat_credit_entries ALTER COLUMN seq ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.cat_credit_entries_seq_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: cat_credit_topups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cat_credit_topups (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    amount_btc numeric(18,8) NOT NULL,
    payment_hash text NOT NULL,
    bolt11 text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    paid_at timestamp with time zone,
    CONSTRAINT cat_credit_topups_amount_btc_check CHECK ((amount_btc > (0)::numeric)),
    CONSTRAINT cat_credit_topups_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text, 'expired'::text])))
);


--
-- Name: cat_memories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cat_memories (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    content text NOT NULL,
    embedding printcraft.vector(1536),
    source text DEFAULT 'chat'::text NOT NULL,
    source_conversation_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cat_messages (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    conversation_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    model_used text,
    provider text,
    token_count integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cat_messages_role_check CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text])))
);


--
-- Name: cat_pending_actions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cat_pending_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    action_id text NOT NULL,
    category public.cat_action_category NOT NULL,
    parameters jsonb DEFAULT '{}'::jsonb NOT NULL,
    description text NOT NULL,
    conversation_id uuid,
    message_id uuid,
    status text DEFAULT 'pending'::text NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '24:00:00'::interval) NOT NULL,
    confirmed_at timestamp with time zone,
    rejected_at timestamp with time zone,
    rejection_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cat_pending_actions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'rejected'::text, 'expired'::text])))
);


--
-- Name: TABLE cat_pending_actions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.cat_pending_actions IS 'Actions waiting for user confirmation before execution';


--
-- Name: cat_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cat_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    action_id text NOT NULL,
    category public.cat_action_category NOT NULL,
    granted boolean DEFAULT true NOT NULL,
    requires_confirmation boolean DEFAULT true NOT NULL,
    daily_limit integer,
    max_btc_per_action numeric(18,8),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE cat_permissions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.cat_permissions IS 'User permissions for My Cat autonomous actions - controls what My Cat can do on behalf of the user';


--
-- Name: COLUMN cat_permissions.action_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cat_permissions.action_id IS 'Specific action ID or * for category-wide permission';


--
-- Name: COLUMN cat_permissions.daily_limit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cat_permissions.daily_limit IS 'Maximum times this action can be executed per day (null = unlimited)';


--
-- Name: COLUMN cat_permissions.max_btc_per_action; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cat_permissions.max_btc_per_action IS 'Maximum satoshis for payment actions (null = unlimited)';


--
-- Name: channel_waitlist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.channel_waitlist (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    user_id uuid,
    source text DEFAULT 'channel_page'::text,
    referrer text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: circles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.circles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    category text,
    visibility text DEFAULT 'public'::text NOT NULL,
    cover_image_url text,
    tags text[] DEFAULT '{}'::text[],
    status text DEFAULT 'active'::text NOT NULL,
    member_count integer DEFAULT 0 NOT NULL,
    is_test boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT circles_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'paused'::text, 'archived'::text]))),
    CONSTRAINT circles_visibility_check CHECK ((visibility = ANY (ARRAY['public'::text, 'unlisted'::text, 'private'::text])))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    username text NOT NULL,
    avatar_url text,
    website text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    name text,
    bio text,
    email text,
    phone text,
    location text,
    timezone text,
    language text,
    currency text,
    bitcoin_address text,
    lightning_address text,
    bitcoin_public_key text,
    lightning_node_id text,
    payment_preferences jsonb,
    verification_status text DEFAULT 'unverified'::text,
    last_login_at timestamp with time zone,
    banner_url text,
    status text DEFAULT 'active'::text,
    last_active_at timestamp with time zone,
    profile_completed_at timestamp with time zone,
    onboarding_completed boolean DEFAULT false,
    terms_accepted_at timestamp with time zone,
    privacy_policy_accepted_at timestamp with time zone,
    social_links jsonb,
    preferences jsonb,
    metadata jsonb,
    verification_data jsonb,
    privacy_settings jsonb,
    location_search text,
    location_country text,
    location_city text,
    location_zip text,
    latitude double precision,
    longitude double precision,
    contact_email text,
    onboarding_wallet_setup_completed boolean DEFAULT false,
    onboarding_first_project_created boolean DEFAULT false,
    onboarding_method text,
    receive_reminders boolean DEFAULT true NOT NULL,
    background text,
    CONSTRAINT chk_onboarding_method CHECK (((onboarding_method IS NULL) OR (onboarding_method = ANY (ARRAY['standard'::text, 'intelligent'::text, 'skipped'::text])))),
    CONSTRAINT profiles_bitcoin_address_format CHECK (((bitcoin_address IS NULL) OR (bitcoin_address ~ '^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,}$'::text))),
    CONSTRAINT profiles_email_format CHECK (((email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'::text) OR (email IS NULL))),
    CONSTRAINT profiles_lightning_address_format CHECK (((lightning_address IS NULL) OR (lightning_address ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'::text))),
    CONSTRAINT profiles_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'suspended'::text, 'deleted'::text]))),
    CONSTRAINT profiles_verification_status_check CHECK ((verification_status = ANY (ARRAY['unverified'::text, 'pending'::text, 'verified'::text, 'rejected'::text]))),
    CONSTRAINT profiles_website_format CHECK (((website ~* '^https?://'::text) OR (website IS NULL)))
);


--
-- Name: TABLE profiles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.profiles IS 'User profiles with Bitcoin-native features';


--
-- Name: COLUMN profiles.website; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.website IS 'User website URL';


--
-- Name: COLUMN profiles.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.name IS 'User-friendly display name';


--
-- Name: COLUMN profiles.bio; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.bio IS 'User biography/description';


--
-- Name: COLUMN profiles.bitcoin_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.bitcoin_address IS 'Bitcoin address for receiving payments';


--
-- Name: COLUMN profiles.lightning_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.lightning_address IS 'Lightning Network address for instant payments';


--
-- Name: COLUMN profiles.contact_email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.contact_email IS 'Public contact email (different from registration email). Visible on profile for supporters to contact the user.';


--
-- Name: COLUMN profiles.onboarding_wallet_setup_completed; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.onboarding_wallet_setup_completed IS 'Whether user completed wallet setup during onboarding';


--
-- Name: COLUMN profiles.onboarding_first_project_created; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.onboarding_first_project_created IS 'Whether user created their first project after onboarding';


--
-- Name: COLUMN profiles.onboarding_method; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.onboarding_method IS 'How user completed onboarding: standard, intelligent, skipped';


--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text,
    description text,
    goal_amount numeric(20,8),
    currency text DEFAULT 'CHF'::text,
    funding_purpose text,
    bitcoin_address text,
    lightning_address text,
    category text,
    tags text[] DEFAULT '{}'::text[],
    status text DEFAULT 'draft'::text,
    raised_amount numeric(20,8) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    website_url text,
    cover_image_url text,
    contributor_count integer DEFAULT 0,
    creator_id uuid,
    group_id uuid,
    actor_id uuid NOT NULL,
    is_test boolean DEFAULT false NOT NULL,
    show_on_profile boolean DEFAULT true,
    CONSTRAINT projects_currency_check CHECK ((currency = ANY (ARRAY['USD'::text, 'EUR'::text, 'CHF'::text, 'BTC'::text, 'GBP'::text])))
);


--
-- Name: TABLE projects; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.projects IS 'MVP: Projects created by individual users for Bitcoin fundraising';


--
-- Name: COLUMN projects.website_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.projects.website_url IS 'Project website (HTTPS validated in app)';


--
-- Name: COLUMN projects.cover_image_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.projects.cover_image_url IS 'Cover image URL';


--
-- Name: COLUMN projects.show_on_profile; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.projects.show_on_profile IS 'Whether this project appears on the user''s public profile page';


--
-- Name: timeline_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.timeline_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    user_id uuid NOT NULL,
    content text NOT NULL,
    content_html text,
    parent_comment_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_deleted boolean DEFAULT false,
    deleted_at timestamp with time zone,
    deletion_reason text,
    CONSTRAINT timeline_comments_content_check CHECK ((char_length(content) <= 5000))
);


--
-- Name: TABLE timeline_comments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.timeline_comments IS 'Comments and replies on timeline events';


--
-- Name: timeline_likes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.timeline_likes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE timeline_likes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.timeline_likes IS 'User likes on timeline events';


--
-- Name: timeline_shares; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.timeline_shares (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    original_event_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    share_text text,
    visibility text DEFAULT 'public'::text,
    CONSTRAINT timeline_shares_visibility_check CHECK ((visibility = ANY (ARRAY['public'::text, 'followers'::text, 'private'::text])))
);


--
-- Name: TABLE timeline_shares; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.timeline_shares IS 'User shares/reposts of timeline events';


--
-- Name: community_timeline_no_duplicates; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.community_timeline_no_duplicates AS
 SELECT DISTINCT ON (te.id) te.id,
    te.event_type,
    te.actor_id,
    te.subject_type,
    te.subject_id,
    te.title,
    te.description,
    te.visibility,
    te.event_timestamp,
    te.created_at,
    te.updated_at,
    te.metadata,
    COALESCE(( SELECT (count(*))::integer AS count
           FROM public.timeline_likes
          WHERE (timeline_likes.event_id = te.id)), 0) AS like_count,
    COALESCE(( SELECT (count(*))::integer AS count
           FROM public.timeline_shares
          WHERE (timeline_shares.original_event_id = te.id)), 0) AS share_count,
    COALESCE(( SELECT (count(*))::integer AS count
           FROM public.timeline_comments
          WHERE (timeline_comments.event_id = te.id)), 0) AS comment_count,
    jsonb_build_object('id', p.id, 'username', p.username, 'display_name', p.name, 'avatar_url', p.avatar_url) AS actor_data,
        CASE
            WHEN (te.subject_type = 'profile'::text) THEN jsonb_build_object('id', sp.id, 'type', 'profile', 'username', sp.username, 'display_name', sp.name)
            WHEN (te.subject_type = 'project'::text) THEN jsonb_build_object('id', pr.id, 'type', 'project', 'title', pr.title)
            ELSE NULL::jsonb
        END AS subject_data
   FROM (((public.timeline_events te
     LEFT JOIN public.profiles p ON ((p.id = te.actor_id)))
     LEFT JOIN public.profiles sp ON (((sp.id = te.subject_id) AND (te.subject_type = 'profile'::text))))
     LEFT JOIN public.projects pr ON (((pr.id = te.subject_id) AND (te.subject_type = 'project'::text))))
  WHERE ((te.is_deleted = false) AND (te.visibility = 'public'::text) AND (te.is_cross_post_duplicate = false) AND (NOT (te.metadata ? 'original_post_id'::text)))
  ORDER BY te.id, te.event_timestamp DESC;


--
-- Name: content_embeddings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.content_embeddings (
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    title text,
    url text,
    text_preview text,
    embedding printcraft.vector(1536),
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    quality_score real DEFAULT 0 NOT NULL
);


--
-- Name: contracts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contracts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    party_a_actor_id uuid NOT NULL,
    party_b_actor_id uuid NOT NULL,
    contract_type text NOT NULL,
    terms jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    proposal_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    activated_at timestamp with time zone,
    completed_at timestamp with time zone,
    terminated_at timestamp with time zone,
    CONSTRAINT contracts_contract_type_check CHECK ((contract_type = ANY (ARRAY['employment'::text, 'service'::text, 'rental'::text, 'partnership'::text, 'membership'::text]))),
    CONSTRAINT contracts_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'proposed'::text, 'active'::text, 'completed'::text, 'terminated'::text, 'cancelled'::text])))
);


--
-- Name: contributions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contributions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payment_intent_id uuid NOT NULL,
    contributor_id uuid NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    amount_btc numeric(18,8) NOT NULL,
    message text,
    is_anonymous boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT contributions_amount_sats_check CHECK ((amount_btc > (0)::numeric))
);


--
-- Name: conversation_participants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversation_participants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text DEFAULT 'member'::text NOT NULL,
    joined_at timestamp with time zone DEFAULT now() NOT NULL,
    last_read_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text,
    is_group boolean DEFAULT false NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_message_at timestamp with time zone DEFAULT now() NOT NULL,
    last_message_preview text,
    last_message_sender_id uuid,
    conversation_type text DEFAULT 'direct'::text,
    professional_slug text,
    CONSTRAINT conversations_conversation_type_check CHECK ((conversation_type = ANY (ARRAY['direct'::text, 'group'::text])))
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    content text NOT NULL,
    message_type text DEFAULT 'text'::text NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    edited_at timestamp with time zone
);


--
-- Name: conversation_details; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.conversation_details WITH (security_invoker='true') AS
 SELECT c.id,
    c.title,
    c.is_group,
    c.created_by,
    c.created_at,
    c.updated_at,
    c.last_message_at,
    c.last_message_preview,
    c.last_message_sender_id,
    ( SELECT jsonb_agg(jsonb_build_object('user_id', p.id, 'username', p.username, 'name', p.name, 'avatar_url', p.avatar_url, 'role', cp2.role, 'joined_at', cp2.joined_at, 'last_read_at', cp2.last_read_at, 'is_active', cp2.is_active)) AS jsonb_agg
           FROM (public.conversation_participants cp2
             JOIN public.profiles p ON ((cp2.user_id = p.id)))
          WHERE ((cp2.conversation_id = c.id) AND (cp2.is_active = true))) AS participants,
    ( SELECT count(*) AS count
           FROM public.messages m
          WHERE ((m.conversation_id = c.id) AND (m.sender_id <> auth.uid()) AND (m.created_at > ( SELECT conversation_participants.last_read_at
                   FROM public.conversation_participants
                  WHERE ((conversation_participants.conversation_id = c.id) AND (conversation_participants.user_id = auth.uid())))) AND (m.is_deleted = false))) AS unread_count
   FROM public.conversations c
  WHERE (EXISTS ( SELECT 1
           FROM public.conversation_participants cp
          WHERE ((cp.conversation_id = c.id) AND (cp.user_id = auth.uid()) AND (cp.is_active = true))));


--
-- Name: VIEW conversation_details; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.conversation_details IS 'Returns conversations for current user (granted to authenticated)';


--
-- Name: enriched_timeline_events; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.enriched_timeline_events AS
 SELECT te.id,
    te.event_type,
    te.event_subtype,
    te.actor_id,
    te.actor_type,
    te.subject_type,
    te.subject_id,
    te.target_type,
    te.target_id,
    te.title,
    te.description,
    te.content,
    te.amount_btc,
    te.quantity,
    te.visibility,
    te.is_featured,
    te.event_timestamp,
    te.created_at,
    te.updated_at,
    te.metadata,
    te.tags,
    te.parent_event_id,
    te.thread_id,
    te.is_deleted,
    jsonb_build_object('id', actor.id, 'username', actor.username, 'full_name', actor.name, 'avatar_url', actor.avatar_url, 'display_name', actor.name, 'bio', actor.bio, 'created_at', actor.created_at) AS actor_data,
        CASE te.subject_type
            WHEN 'profile'::text THEN jsonb_build_object('id', sp.id, 'username', sp.username, 'full_name', sp.name, 'avatar_url', sp.avatar_url, 'display_name', sp.name, 'bio', sp.bio, 'type', 'profile')
            WHEN 'project'::text THEN jsonb_build_object('id', spr.id, 'title', spr.title, 'status', spr.status, 'description', spr.description, 'category', spr.category, 'type', 'project')
            ELSE NULL::jsonb
        END AS subject_data,
        CASE te.target_type
            WHEN 'profile'::text THEN jsonb_build_object('id', tp.id, 'username', tp.username, 'avatar_url', tp.avatar_url, 'display_name', tp.name, 'type', 'profile')
            WHEN 'project'::text THEN jsonb_build_object('id', tpr.id, 'title', tpr.title, 'status', tpr.status, 'category', tpr.category, 'type', 'project')
            ELSE NULL::jsonb
        END AS target_data,
    0 AS like_count,
    0 AS comment_count,
    0 AS share_count
   FROM (((((public.timeline_events te
     LEFT JOIN public.profiles actor ON ((te.actor_id = actor.id)))
     LEFT JOIN public.profiles sp ON (((te.subject_type = 'profile'::text) AND (te.subject_id = sp.id))))
     LEFT JOIN public.projects spr ON (((te.subject_type = 'project'::text) AND (te.subject_id = spr.id))))
     LEFT JOIN public.profiles tp ON (((te.target_type = 'profile'::text) AND (te.target_id = tp.id))))
     LEFT JOIN public.projects tpr ON (((te.target_type = 'project'::text) AND (te.target_id = tpr.id))))
  WHERE (NOT te.is_deleted);


--
-- Name: entity_wallets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entity_wallets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wallet_id uuid NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    is_primary boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid
);


--
-- Name: event_attendees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_attendees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    user_id uuid NOT NULL,
    status text DEFAULT 'registered'::text,
    ticket_count integer DEFAULT 1,
    payment_status text DEFAULT 'pending'::text,
    transaction_id uuid,
    registered_at timestamp with time zone DEFAULT now(),
    checked_in_at timestamp with time zone,
    CONSTRAINT event_attendees_payment_status_check CHECK ((payment_status = ANY (ARRAY['pending'::text, 'paid'::text, 'refunded'::text]))),
    CONSTRAINT event_attendees_status_check CHECK ((status = ANY (ARRAY['registered'::text, 'waitlisted'::text, 'cancelled'::text, 'attended'::text, 'no_show'::text]))),
    CONSTRAINT event_attendees_ticket_count_check CHECK ((ticket_count > 0))
);


--
-- Name: events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    category text,
    event_type text DEFAULT 'meetup'::text,
    tags text[] DEFAULT '{}'::text[],
    start_date timestamp with time zone NOT NULL,
    end_date timestamp with time zone,
    timezone text DEFAULT 'UTC'::text,
    is_all_day boolean DEFAULT false,
    is_recurring boolean DEFAULT false,
    recurrence_pattern jsonb,
    venue_name text,
    venue_address text,
    venue_city text,
    venue_country text,
    venue_postal_code text,
    latitude numeric(10,8),
    longitude numeric(11,8),
    is_online boolean DEFAULT false,
    online_url text,
    asset_id uuid,
    max_attendees integer,
    current_attendees integer DEFAULT 0,
    requires_rsvp boolean DEFAULT true,
    rsvp_deadline timestamp with time zone,
    ticket_price numeric(18,8),
    currency text DEFAULT 'SATS'::text,
    is_free boolean DEFAULT false,
    funding_goal numeric(18,8),
    bitcoin_address text,
    lightning_address text,
    images text[] DEFAULT '{}'::text[],
    thumbnail_url text,
    banner_url text,
    video_url text,
    status text DEFAULT 'draft'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    actor_id uuid NOT NULL,
    is_test boolean DEFAULT false NOT NULL,
    show_on_profile boolean DEFAULT true,
    CONSTRAINT events_currency_check CHECK ((currency = ANY (ARRAY['USD'::text, 'EUR'::text, 'CHF'::text, 'BTC'::text, 'GBP'::text]))),
    CONSTRAINT events_event_type_check CHECK ((event_type = ANY (ARRAY['meetup'::text, 'conference'::text, 'workshop'::text, 'party'::text, 'exhibition'::text, 'festival'::text, 'retreat'::text, 'other'::text]))),
    CONSTRAINT events_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'open'::text, 'full'::text, 'ongoing'::text, 'completed'::text, 'cancelled'::text])))
);


--
-- Name: COLUMN events.show_on_profile; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.events.show_on_profile IS 'Whether this event appears on the user''s public profile page';


--
-- Name: follows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.follows (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    follower_id uuid NOT NULL,
    following_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT follows_check CHECK ((follower_id <> following_id))
);


--
-- Name: github_repo_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.github_repo_cache (
    user_id uuid NOT NULL,
    handle text NOT NULL,
    repos jsonb DEFAULT '[]'::jsonb NOT NULL,
    fetched_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: group_activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_activities (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    group_id uuid NOT NULL,
    user_id uuid,
    activity_type text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: group_event_rsvps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_event_rsvps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    user_id uuid NOT NULL,
    status text DEFAULT 'going'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT group_event_rsvps_status_check CHECK ((status = ANY (ARRAY['going'::text, 'maybe'::text, 'not_going'::text])))
);


--
-- Name: group_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    creator_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    event_type text DEFAULT 'general'::text,
    location_type text DEFAULT 'online'::text,
    location_details text,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone,
    timezone text DEFAULT 'UTC'::text,
    max_attendees integer,
    is_public boolean DEFAULT true,
    requires_rsvp boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT group_events_event_type_check CHECK ((event_type = ANY (ARRAY['general'::text, 'meeting'::text, 'celebration'::text, 'assembly'::text]))),
    CONSTRAINT group_events_location_type_check CHECK ((location_type = ANY (ARRAY['online'::text, 'in_person'::text, 'hybrid'::text])))
);


--
-- Name: group_features; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_features (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    feature_key text NOT NULL,
    enabled boolean DEFAULT true,
    config jsonb DEFAULT '{}'::jsonb,
    enabled_at timestamp with time zone DEFAULT now(),
    enabled_by uuid
);


--
-- Name: TABLE group_features; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.group_features IS 'Optional features enabled per group: treasury, proposals, voting, events, marketplace, shared_wallet';


--
-- Name: group_invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    user_id uuid,
    email text,
    token text,
    role text DEFAULT 'member'::text NOT NULL,
    message text,
    status text DEFAULT 'pending'::text NOT NULL,
    invited_by uuid NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval),
    responded_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT group_invitations_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'member'::text]))),
    CONSTRAINT group_invitations_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text, 'expired'::text, 'revoked'::text]))),
    CONSTRAINT invitation_target_check CHECK ((((user_id IS NOT NULL) AND (email IS NULL) AND (token IS NULL)) OR ((user_id IS NULL) AND (email IS NOT NULL) AND (token IS NULL)) OR ((user_id IS NULL) AND (email IS NULL) AND (token IS NOT NULL)) OR ((user_id IS NOT NULL) AND (token IS NOT NULL))))
);


--
-- Name: group_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text DEFAULT 'member'::text NOT NULL,
    permission_overrides jsonb,
    invited_by uuid,
    joined_at timestamp with time zone DEFAULT now(),
    CONSTRAINT group_members_role_check CHECK ((role = ANY (ARRAY['founder'::text, 'admin'::text, 'member'::text])))
);


--
-- Name: TABLE group_members; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.group_members IS 'Group membership with roles and optional permission overrides';


--
-- Name: COLUMN group_members.permission_overrides; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.group_members.permission_overrides IS 'JSON object overriding specific permissions for this member';


--
-- Name: group_proposals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_proposals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    proposer_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    proposal_type text DEFAULT 'general'::text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    voting_threshold integer,
    action_type text,
    action_data jsonb DEFAULT '{}'::jsonb,
    voting_starts_at timestamp with time zone,
    voting_ends_at timestamp with time zone,
    executed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_public boolean DEFAULT false NOT NULL,
    CONSTRAINT group_proposals_proposal_type_check CHECK ((proposal_type = ANY (ARRAY['general'::text, 'treasury'::text, 'membership'::text, 'governance'::text]))),
    CONSTRAINT group_proposals_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'passed'::text, 'failed'::text, 'executed'::text, 'cancelled'::text])))
);


--
-- Name: group_votes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_votes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    proposal_id uuid NOT NULL,
    voter_id uuid NOT NULL,
    vote text NOT NULL,
    voting_power numeric(20,8) DEFAULT 1.0,
    voted_at timestamp with time zone DEFAULT now(),
    CONSTRAINT group_votes_vote_check CHECK ((vote = ANY (ARRAY['yes'::text, 'no'::text, 'abstain'::text])))
);


--
-- Name: group_wallets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_wallets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    purpose text,
    bitcoin_address text,
    lightning_address text,
    current_balance_btc numeric(18,8) DEFAULT 0,
    is_active boolean DEFAULT true,
    created_by uuid,
    required_signatures integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT group_wallets_purpose_check CHECK ((purpose = ANY (ARRAY['general'::text, 'projects'::text, 'investment'::text, 'community'::text, 'emergency'::text, 'savings'::text, 'other'::text])))
);


--
-- Name: groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    label text DEFAULT 'circle'::text NOT NULL,
    tags text[] DEFAULT '{}'::text[],
    avatar_url text,
    banner_url text,
    is_public boolean DEFAULT true,
    visibility text DEFAULT 'public'::text,
    bitcoin_address text,
    lightning_address text,
    governance_preset text DEFAULT 'consensus'::text,
    voting_threshold integer,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT groups_visibility_check CHECK ((visibility = ANY (ARRAY['public'::text, 'members_only'::text, 'private'::text])))
);


--
-- Name: TABLE groups; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.groups IS 'Unified groups system - labels influence defaults but dont restrict capabilities';


--
-- Name: COLUMN groups.label; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.groups.label IS 'Group identity/template: circle, family, dao, company, nonprofit, cooperative, guild, network_state';


--
-- Name: COLUMN groups.governance_preset; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.groups.governance_preset IS 'Default permission model: consensus (unanimous), democratic (majority), hierarchical (founder/admin control)';


--
-- Name: idempotency_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.idempotency_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    key text NOT NULL,
    method text NOT NULL,
    path text NOT NULL,
    body_hash text NOT NULL,
    response_status integer,
    response_body jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '24:00:00'::interval) NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    CONSTRAINT idempotency_results_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'complete'::text])))
);


--
-- Name: TABLE idempotency_results; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.idempotency_results IS 'Server-managed Idempotency-Key dedup cache. 24h TTL. Server reads/writes via the admin client; users have no direct access.';


--
-- Name: COLUMN idempotency_results.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.idempotency_results.status IS 'pending = row claimed but work in flight; complete = response populated. Race-safe: parallel retries with the same key collide on the unique (user_id, key, path) index and the loser polls until the winner sets complete.';


--
-- Name: integration_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.integration_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    actor_id uuid NOT NULL,
    name text NOT NULL,
    key_hash text NOT NULL,
    key_prefix text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_used_at timestamp with time zone,
    expires_at timestamp with time zone,
    revoked_at timestamp with time zone,
    scopes text[] DEFAULT ARRAY['*'::text] NOT NULL,
    is_test boolean DEFAULT false NOT NULL,
    CONSTRAINT integration_keys_name_not_blank CHECK ((length(TRIM(BOTH FROM name)) > 0))
);


--
-- Name: TABLE integration_keys; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.integration_keys IS 'Outbound platform API keys - let external services authenticate to OrangeCat as a specific actor.';


--
-- Name: COLUMN integration_keys.actor_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.integration_keys.actor_id IS 'Actor the key acts as. Validated at mint time.';


--
-- Name: COLUMN integration_keys.key_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.integration_keys.key_hash IS 'SHA-256 of the plaintext key. Plaintext is shown once at creation and never stored.';


--
-- Name: COLUMN integration_keys.key_prefix; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.integration_keys.key_prefix IS 'First 11 chars of the plaintext key for UI display.';


--
-- Name: COLUMN integration_keys.scopes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.integration_keys.scopes IS 'Allowed operations. "*" is wildcard. Otherwise an array of "<entity>.<read|write>" tokens (e.g. "products.write").';


--
-- Name: COLUMN integration_keys.is_test; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.integration_keys.is_test IS 'Sandbox keys. Plaintext format ock_test_<hex>. Only sees/writes is_test=true entities; live keys only see/write is_test=false.';


--
-- Name: investments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.investments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    investment_type text DEFAULT 'revenue_share'::text NOT NULL,
    target_amount numeric(20,8) NOT NULL,
    minimum_investment numeric(20,8) DEFAULT 0.0001 NOT NULL,
    maximum_investment numeric(20,8),
    total_raised numeric(20,8) DEFAULT 0 NOT NULL,
    currency text DEFAULT 'BTC'::text NOT NULL,
    expected_return_rate numeric(6,2),
    return_frequency text,
    term_months integer,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    status text DEFAULT 'draft'::text NOT NULL,
    risk_level text,
    terms text,
    is_public boolean DEFAULT false NOT NULL,
    bitcoin_address text,
    lightning_address text,
    wallet_id uuid,
    thumbnail_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    show_on_profile boolean DEFAULT true,
    is_test boolean DEFAULT false NOT NULL,
    CONSTRAINT check_investment_amounts CHECK (((maximum_investment IS NULL) OR (minimum_investment <= maximum_investment))),
    CONSTRAINT check_investment_status CHECK ((status = ANY (ARRAY['draft'::text, 'open'::text, 'funded'::text, 'active'::text, 'closed'::text, 'cancelled'::text]))),
    CONSTRAINT check_investment_type CHECK ((investment_type = ANY (ARRAY['equity'::text, 'revenue_share'::text, 'profit_share'::text, 'token'::text, 'other'::text]))),
    CONSTRAINT check_maximum_investment_positive CHECK (((maximum_investment IS NULL) OR (maximum_investment > (0)::numeric))),
    CONSTRAINT check_minimum_investment_positive CHECK ((minimum_investment > (0)::numeric)),
    CONSTRAINT check_return_frequency CHECK (((return_frequency IS NULL) OR (return_frequency = ANY (ARRAY['monthly'::text, 'quarterly'::text, 'annually'::text, 'at_exit'::text, 'custom'::text])))),
    CONSTRAINT check_risk_level CHECK (((risk_level IS NULL) OR (risk_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])))),
    CONSTRAINT check_target_amount_positive CHECK ((target_amount > (0)::numeric)),
    CONSTRAINT check_total_raised_nonnegative CHECK ((total_raised >= (0)::numeric))
);


--
-- Name: loan_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.loan_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    icon text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE loan_categories; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.loan_categories IS 'Categories for different types of loans';


--
-- Name: loan_collateral; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.loan_collateral (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    loan_id uuid NOT NULL,
    asset_id uuid NOT NULL,
    owner_id uuid NOT NULL,
    pledged_value numeric,
    currency text,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT loan_collateral_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'active'::text, 'released'::text, 'liquidated'::text])))
);


--
-- Name: loan_offers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.loan_offers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    loan_id uuid NOT NULL,
    offerer_id uuid NOT NULL,
    offer_type text NOT NULL,
    offer_amount numeric(15,8) NOT NULL,
    interest_rate numeric(5,2),
    term_months integer,
    monthly_payment numeric(15,8),
    terms text,
    conditions text,
    status text DEFAULT 'pending'::text,
    is_binding boolean DEFAULT false,
    expires_at timestamp with time zone DEFAULT (now() + '30 days'::interval),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    accepted_at timestamp with time zone,
    rejected_at timestamp with time zone,
    CONSTRAINT loan_offers_check CHECK (((offer_type = 'payoff'::text) OR ((interest_rate IS NOT NULL) AND (term_months IS NOT NULL)))),
    CONSTRAINT loan_offers_check1 CHECK ((expires_at > created_at)),
    CONSTRAINT loan_offers_conditions_check CHECK ((char_length(conditions) <= 1000)),
    CONSTRAINT loan_offers_interest_rate_check CHECK (((interest_rate >= (0)::numeric) AND (interest_rate <= (100)::numeric))),
    CONSTRAINT loan_offers_offer_amount_check CHECK ((offer_amount > (0)::numeric)),
    CONSTRAINT loan_offers_offer_type_check CHECK ((offer_type = ANY (ARRAY['refinance'::text, 'payoff'::text]))),
    CONSTRAINT loan_offers_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text, 'expired'::text, 'cancelled'::text]))),
    CONSTRAINT loan_offers_term_months_check CHECK (((term_months > 0) AND (term_months <= 360))),
    CONSTRAINT loan_offers_terms_check CHECK ((char_length(terms) <= 2000))
);


--
-- Name: TABLE loan_offers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.loan_offers IS 'Offers from users to refinance or pay off other users loans';


--
-- Name: loan_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.loan_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    loan_id uuid NOT NULL,
    offer_id uuid,
    amount numeric(15,8) NOT NULL,
    currency text DEFAULT 'USD'::text,
    payment_type text NOT NULL,
    payer_id uuid NOT NULL,
    recipient_id uuid NOT NULL,
    transaction_id text,
    payment_method text,
    notes text,
    status text DEFAULT 'completed'::text,
    processed_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT loan_payments_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT loan_payments_check CHECK ((payer_id <> recipient_id)),
    CONSTRAINT loan_payments_currency_check CHECK ((currency = ANY (ARRAY['USD'::text, 'EUR'::text, 'CHF'::text, 'BTC'::text, 'GBP'::text]))),
    CONSTRAINT loan_payments_notes_check CHECK ((char_length(notes) <= 500)),
    CONSTRAINT loan_payments_payment_method_check CHECK ((payment_method = ANY (ARRAY['bitcoin'::text, 'lightning'::text, 'bank_transfer'::text, 'card'::text, 'other'::text]))),
    CONSTRAINT loan_payments_payment_type_check CHECK ((payment_type = ANY (ARRAY['monthly'::text, 'lump_sum'::text, 'refinance'::text, 'payoff'::text]))),
    CONSTRAINT loan_payments_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text, 'refunded'::text])))
);


--
-- Name: TABLE loan_payments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.loan_payments IS 'Payment transactions between users for loans';


--
-- Name: message_read_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.message_read_receipts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message_id uuid NOT NULL,
    user_id uuid NOT NULL,
    read_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: message_details; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.message_details WITH (security_invoker='true') AS
 SELECT m.id,
    m.conversation_id,
    m.sender_id,
    m.content,
    m.message_type,
    m.metadata,
    m.created_at,
    m.updated_at,
    m.is_deleted,
    m.edited_at,
    jsonb_build_object('id', p.id, 'username', p.username, 'name', p.name, 'avatar_url', p.avatar_url) AS sender,
        CASE
            WHEN (m.sender_id = auth.uid()) THEN true
            WHEN (EXISTS ( SELECT 1
               FROM public.message_read_receipts mrr
              WHERE ((mrr.message_id = m.id) AND (mrr.user_id = auth.uid())))) THEN true
            ELSE false
        END AS is_read
   FROM (public.messages m
     JOIN public.profiles p ON ((m.sender_id = p.id)))
  WHERE ((m.is_deleted = false) AND (EXISTS ( SELECT 1
           FROM public.conversation_participants cp
          WHERE ((cp.conversation_id = m.conversation_id) AND (cp.user_id = auth.uid()) AND (cp.is_active = true)))));


--
-- Name: VIEW message_details; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.message_details IS 'Returns messages with sender info and read status (granted to authenticated)';


--
-- Name: notification_email_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_email_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    notification_type text NOT NULL,
    email_address text NOT NULL,
    subject text NOT NULL,
    status text DEFAULT 'sent'::text NOT NULL,
    resend_id text,
    metadata jsonb DEFAULT '{}'::jsonb,
    sent_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notification_email_log_status_check CHECK ((status = ANY (ARRAY['sent'::text, 'bounced'::text, 'complained'::text, 'failed'::text])))
);


--
-- Name: notification_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    economic_emails boolean DEFAULT true NOT NULL,
    social_emails boolean DEFAULT true NOT NULL,
    group_emails boolean DEFAULT true NOT NULL,
    progress_emails boolean DEFAULT true NOT NULL,
    reengagement_emails boolean DEFAULT true NOT NULL,
    digest_frequency text DEFAULT 'weekly'::text NOT NULL,
    type_overrides jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notification_preferences_digest_frequency_check CHECK ((digest_frequency = ANY (ARRAY['daily'::text, 'weekly'::text, 'never'::text])))
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    message text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    read_at timestamp with time zone,
    action_url text,
    CONSTRAINT notifications_type_check CHECK ((type = ANY (ARRAY['follow'::text, 'payment'::text, 'project_funded'::text, 'message'::text, 'comment'::text, 'like'::text, 'mention'::text, 'system'::text, 'task_attention'::text, 'task_request'::text, 'task_completed'::text, 'task_broadcast'::text])))
);


--
-- Name: oauth_auth_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.oauth_auth_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code_hash text NOT NULL,
    client_id text NOT NULL,
    actor_id uuid NOT NULL,
    user_id uuid NOT NULL,
    redirect_uri text NOT NULL,
    scopes text[] DEFAULT '{}'::text[] NOT NULL,
    code_challenge text NOT NULL,
    code_challenge_method text DEFAULT 'S256'::text NOT NULL,
    nonce text,
    expires_at timestamp with time zone NOT NULL,
    consumed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: oauth_clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.oauth_clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id text NOT NULL,
    client_secret_hash text,
    name text NOT NULL,
    redirect_uris text[] DEFAULT '{}'::text[] NOT NULL,
    allowed_scopes text[] DEFAULT '{}'::text[] NOT NULL,
    is_confidential boolean DEFAULT true NOT NULL,
    is_trusted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    disabled_at timestamp with time zone
);


--
-- Name: oauth_refresh_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.oauth_refresh_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    token_hash text NOT NULL,
    client_id text NOT NULL,
    actor_id uuid NOT NULL,
    user_id uuid NOT NULL,
    scopes text[] DEFAULT '{}'::text[] NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    last_used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: oauth_user_grants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.oauth_user_grants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    client_id text NOT NULL,
    scopes text[] DEFAULT '{}'::text[] NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payment_intent_id uuid NOT NULL,
    buyer_id uuid NOT NULL,
    seller_id uuid NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    amount_btc numeric(18,8) NOT NULL,
    entity_title text NOT NULL,
    status text DEFAULT 'pending_payment'::text NOT NULL,
    shipping_address_id uuid,
    tracking_number text,
    tracking_url text,
    buyer_note text,
    seller_note text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT orders_status_check CHECK ((status = ANY (ARRAY['pending_payment'::text, 'paid'::text, 'shipped'::text, 'completed'::text, 'cancelled'::text, 'refunded'::text])))
);


--
-- Name: payment_intents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_intents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    buyer_id uuid NOT NULL,
    seller_id uuid NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    amount_btc numeric(18,8) NOT NULL,
    payment_method text NOT NULL,
    bolt11 text,
    payment_hash text,
    onchain_address text,
    status text DEFAULT 'created'::text NOT NULL,
    description text,
    expires_at timestamp with time zone,
    paid_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    lnurl_verify_url text,
    CONSTRAINT payment_intents_amount_sats_check CHECK ((amount_btc > (0)::numeric)),
    CONSTRAINT payment_intents_payment_method_check CHECK ((payment_method = ANY (ARRAY['nwc'::text, 'lightning_address'::text, 'onchain'::text]))),
    CONSTRAINT payment_intents_status_check CHECK ((status = ANY (ARRAY['created'::text, 'invoice_ready'::text, 'paid'::text, 'expired'::text, 'failed'::text, 'buyer_confirmed'::text, 'pending_confirmation'::text])))
);


--
-- Name: COLUMN payment_intents.lnurl_verify_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payment_intents.lnurl_verify_url IS 'LUD-21 verify URL from the LNURL-pay callback; polled to auto-detect settlement for lightning_address payments.';


--
-- Name: platform_api_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_api_usage (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    usage_date date DEFAULT CURRENT_DATE NOT NULL,
    request_count integer DEFAULT 0 NOT NULL,
    token_count bigint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE platform_api_usage; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.platform_api_usage IS 'Daily counter of free-tier Cat requests per user. Read+upserted by check_platform_limit and increment_platform_usage. RLS lets users see only their own row; writes happen via the SECURITY DEFINER RPCs.';


--
-- Name: post_visibility; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.post_visibility (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_id uuid NOT NULL,
    timeline_type text NOT NULL,
    timeline_owner_id uuid,
    added_by_id uuid NOT NULL,
    added_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT post_visibility_timeline_type_check CHECK ((timeline_type = ANY (ARRAY['profile'::text, 'project'::text, 'community'::text])))
);


--
-- Name: project_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_categories (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    icon text,
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: project_favorites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_favorites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    project_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE project_favorites; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.project_favorites IS 'User favorites/bookmarks for projects';


--
-- Name: COLUMN project_favorites.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_favorites.user_id IS 'User who favorited the project';


--
-- Name: COLUMN project_favorites.project_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_favorites.project_id IS 'Project that was favorited';


--
-- Name: project_media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_media (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    storage_path text NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    alt_text text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT check_position_range CHECK ((("position" >= 0) AND ("position" <= 2)))
);


--
-- Name: TABLE project_media; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.project_media IS 'Gallery images for projects (max 3)';


--
-- Name: COLUMN project_media.storage_path; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_media.storage_path IS 'Storage path (derive public URL at read-time for flexibility)';


--
-- Name: project_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    role_title text NOT NULL,
    skills text[] DEFAULT '{}'::text[] NOT NULL,
    engagement_type text DEFAULT 'contribution'::text NOT NULL,
    description text,
    status text DEFAULT 'open'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: project_support; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_support (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    project_id uuid NOT NULL,
    user_id uuid,
    support_type public.support_type NOT NULL,
    amount_btc numeric(18,8),
    transaction_hash text,
    lightning_invoice text,
    display_name text,
    message text,
    is_anonymous boolean DEFAULT false,
    reaction_emoji text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT valid_bitcoin_funding CHECK (((support_type <> 'bitcoin_funding'::public.support_type) OR ((amount_btc IS NOT NULL) AND (amount_btc > (0)::numeric)))),
    CONSTRAINT valid_message CHECK (((support_type <> 'message'::public.support_type) OR (message IS NOT NULL))),
    CONSTRAINT valid_reaction CHECK (((support_type <> 'reaction'::public.support_type) OR (reaction_emoji IS NOT NULL))),
    CONSTRAINT valid_signature CHECK (((support_type <> 'signature'::public.support_type) OR (display_name IS NOT NULL)))
);


--
-- Name: project_support_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_support_stats (
    project_id uuid NOT NULL,
    total_bitcoin_btc numeric(18,8) DEFAULT 0,
    total_signatures integer DEFAULT 0,
    total_messages integer DEFAULT 0,
    total_reactions integer DEFAULT 0,
    total_supporters integer DEFAULT 0,
    last_support_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


--
-- Name: project_updates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_updates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    type text,
    title text,
    content text,
    amount_btc numeric(18,8),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: research_contributions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.research_contributions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    research_entity_id uuid NOT NULL,
    user_id uuid,
    amount_btc numeric(18,8) NOT NULL,
    funding_model text NOT NULL,
    message text,
    anonymous boolean DEFAULT false,
    lightning_invoice text,
    onchain_tx text,
    created_at timestamp with time zone DEFAULT now(),
    status text DEFAULT 'pending'::text,
    confirmed_at timestamp with time zone,
    CONSTRAINT research_contributions_amount_btc_check CHECK ((amount_btc > (0)::numeric)),
    CONSTRAINT research_contributions_funding_model_check CHECK ((funding_model = ANY (ARRAY['donation'::text, 'subscription'::text, 'milestone'::text, 'royalty'::text]))),
    CONSTRAINT research_contributions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'failed'::text])))
);


--
-- Name: research_entities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.research_entities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    title text NOT NULL,
    description text NOT NULL,
    field text NOT NULL,
    methodology text NOT NULL,
    expected_outcome text NOT NULL,
    timeline text NOT NULL,
    funding_goal_btc bigint NOT NULL,
    funding_raised_btc numeric(18,8) DEFAULT 0,
    funding_model text NOT NULL,
    wallet_address text NOT NULL,
    lead_researcher text NOT NULL,
    team_members jsonb DEFAULT '[]'::jsonb,
    open_collaboration boolean DEFAULT true,
    resource_needs jsonb DEFAULT '[]'::jsonb,
    progress_frequency text NOT NULL,
    transparency_level text NOT NULL,
    voting_enabled boolean DEFAULT true,
    current_milestone text,
    next_deadline timestamp with time zone,
    impact_areas jsonb DEFAULT '[]'::jsonb,
    target_audience text[] DEFAULT '{}'::text[],
    sdg_alignment jsonb DEFAULT '[]'::jsonb,
    progress_updates jsonb DEFAULT '[]'::jsonb,
    contributions jsonb DEFAULT '[]'::jsonb,
    status text DEFAULT 'draft'::text,
    is_public boolean DEFAULT true,
    is_featured boolean DEFAULT false,
    search_vector tsvector,
    metadata jsonb DEFAULT '{}'::jsonb,
    actor_id uuid NOT NULL,
    show_on_profile boolean DEFAULT true,
    CONSTRAINT research_entities_field_check CHECK ((field = ANY (ARRAY['fundamental_physics'::text, 'mathematics'::text, 'computer_science'::text, 'biology'::text, 'chemistry'::text, 'neuroscience'::text, 'psychology'::text, 'economics'::text, 'philosophy'::text, 'engineering'::text, 'medicine'::text, 'environmental_science'::text, 'social_science'::text, 'artificial_intelligence'::text, 'blockchain_cryptography'::text, 'other'::text]))),
    CONSTRAINT research_entities_funding_goal_btc_check CHECK (((funding_goal_btc)::numeric >= 0.00001)),
    CONSTRAINT research_entities_funding_model_check CHECK ((funding_model = ANY (ARRAY['donation'::text, 'subscription'::text, 'milestone'::text, 'royalty'::text, 'hybrid'::text]))),
    CONSTRAINT research_entities_funding_raised_btc_check CHECK ((funding_raised_btc >= (0)::numeric)),
    CONSTRAINT research_entities_methodology_check CHECK ((methodology = ANY (ARRAY['theoretical'::text, 'experimental'::text, 'computational'::text, 'empirical'::text, 'qualitative'::text, 'mixed_methods'::text, 'meta_analysis'::text, 'survey'::text, 'case_study'::text, 'action_research'::text]))),
    CONSTRAINT research_entities_progress_frequency_check CHECK ((progress_frequency = ANY (ARRAY['weekly'::text, 'biweekly'::text, 'monthly'::text, 'milestone'::text, 'as_needed'::text]))),
    CONSTRAINT research_entities_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'completed'::text, 'paused'::text, 'cancelled'::text]))),
    CONSTRAINT research_entities_timeline_check CHECK ((timeline = ANY (ARRAY['short_term'::text, 'medium_term'::text, 'long_term'::text, 'ongoing'::text, 'indefinite'::text]))),
    CONSTRAINT research_entities_transparency_level_check CHECK ((transparency_level = ANY (ARRAY['full'::text, 'progress'::text, 'milestone'::text, 'minimal'::text])))
);


--
-- Name: research_progress_updates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.research_progress_updates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    research_entity_id uuid NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    milestone_achieved boolean DEFAULT false,
    funding_released bigint DEFAULT 0,
    attachments text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now(),
    votes_up integer DEFAULT 0,
    votes_down integer DEFAULT 0,
    total_votes integer GENERATED ALWAYS AS ((votes_up + votes_down)) STORED,
    CONSTRAINT research_progress_updates_funding_released_check CHECK ((funding_released >= 0))
);


--
-- Name: research_votes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.research_votes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    research_entity_id uuid NOT NULL,
    user_id uuid NOT NULL,
    vote_type text NOT NULL,
    choice text NOT NULL,
    weight numeric(5,2) DEFAULT 1.00,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT research_votes_vote_type_check CHECK ((vote_type = ANY (ARRAY['direction'::text, 'priority'::text, 'impact'::text, 'continuation'::text])))
);


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    filename text NOT NULL,
    applied_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: search_queries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.search_queries (
    id bigint NOT NULL,
    query text NOT NULL,
    result_count integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: search_queries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.search_queries ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.search_queries_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: shipping_addresses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipping_addresses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    label text,
    full_name text NOT NULL,
    street text NOT NULL,
    street2 text,
    city text NOT NULL,
    state text,
    postal_code text NOT NULL,
    country_code text DEFAULT 'CH'::text NOT NULL,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: stakeholder_relationships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stakeholder_relationships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_actor_id uuid NOT NULL,
    from_project_id uuid NOT NULL,
    to_actor_id uuid,
    to_project_id uuid,
    to_external_url text,
    to_external_name text,
    kind text NOT NULL,
    status text,
    confidence smallint,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT stakeholder_relationships_confidence_check CHECK (((confidence >= 0) AND (confidence <= 100))),
    CONSTRAINT stakeholder_relationships_kind_check CHECK ((kind = ANY (ARRAY['competitor'::text, 'collaborator'::text, 'investor'::text, 'customer'::text, 'employee'::text, 'acquirer'::text, 'acquisition_target'::text, 'in_house_dev'::text]))),
    CONSTRAINT stakeholder_relationships_to_target_set CHECK ((((((to_actor_id IS NOT NULL))::integer + ((to_project_id IS NOT NULL))::integer) + ((to_external_url IS NOT NULL))::integer) = 1))
);


--
-- Name: TABLE stakeholder_relationships; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.stakeholder_relationships IS 'Typed edges between a project and its stakeholders (competitors, collaborators, investors, customers, employees, acquirers, acquisition targets, in-house dev projects). Read from Cockpit via the identity bridge.';


--
-- Name: COLUMN stakeholder_relationships.kind; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stakeholder_relationships.kind IS 'One of eight stakeholder categories. Extend this CHECK constraint to add new categories.';


--
-- Name: COLUMN stakeholder_relationships.metadata; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stakeholder_relationships.metadata IS 'JSONB side-channel for agent-populated signals (last RSS check, deck-open events, etc.) without schema migrations.';


--
-- Name: task_attention_flags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_attention_flags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    flagged_by uuid NOT NULL,
    message text,
    is_resolved boolean DEFAULT false,
    resolved_by uuid,
    resolved_at timestamp with time zone,
    resolved_by_completion_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: task_completions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_completions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    completed_by uuid NOT NULL,
    completed_at timestamp with time zone DEFAULT now(),
    notes text,
    duration_minutes integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: task_projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    status text DEFAULT 'planning'::text NOT NULL,
    target_date date,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT task_projects_status_check CHECK ((status = ANY (ARRAY['planning'::text, 'active'::text, 'on_hold'::text, 'completed'::text, 'cancelled'::text])))
);


--
-- Name: task_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    requested_by uuid NOT NULL,
    requested_user_id uuid,
    is_broadcast boolean GENERATED ALWAYS AS ((requested_user_id IS NULL)) STORED,
    message text,
    status text DEFAULT 'pending'::text NOT NULL,
    response_message text,
    responded_by uuid,
    completion_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT task_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text, 'completed'::text])))
);


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    instructions text,
    task_type text NOT NULL,
    schedule_cron text,
    schedule_human text,
    category text NOT NULL,
    tags text[] DEFAULT '{}'::text[],
    priority text DEFAULT 'normal'::text NOT NULL,
    estimated_minutes integer,
    current_status text DEFAULT 'idle'::text NOT NULL,
    is_completed boolean DEFAULT false,
    completed_at timestamp with time zone,
    completed_by uuid,
    project_id uuid,
    created_by uuid NOT NULL,
    is_archived boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    due_date timestamp with time zone,
    is_reminder boolean DEFAULT false NOT NULL,
    CONSTRAINT tasks_category_check CHECK ((category = ANY (ARRAY['cleaning'::text, 'maintenance'::text, 'admin'::text, 'inventory'::text, 'it'::text, 'kitchen'::text, 'workshop'::text, 'logistics'::text, 'other'::text]))),
    CONSTRAINT tasks_current_status_check CHECK ((current_status = ANY (ARRAY['idle'::text, 'needs_attention'::text, 'requested'::text, 'in_progress'::text]))),
    CONSTRAINT tasks_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text]))),
    CONSTRAINT tasks_task_type_check CHECK ((task_type = ANY (ARRAY['one_time'::text, 'recurring_scheduled'::text, 'recurring_as_needed'::text])))
);


--
-- Name: timeline_dislikes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.timeline_dislikes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE timeline_dislikes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.timeline_dislikes IS 'User dislikes on timeline events (for scam detection and wisdom of crowds)';


--
-- Name: timeline_event_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.timeline_event_stats (
    event_id uuid NOT NULL,
    like_count integer DEFAULT 0,
    dislike_count integer DEFAULT 0,
    comment_count integer DEFAULT 0,
    share_count integer DEFAULT 0,
    view_count integer DEFAULT 0,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: timeline_event_visibility; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.timeline_event_visibility (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    timeline_type text NOT NULL,
    timeline_owner_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT timeline_event_visibility_timeline_type_check CHECK ((timeline_type = ANY (ARRAY['profile'::text, 'project'::text, 'community'::text])))
);


--
-- Name: timeline_interactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.timeline_interactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    event_id uuid NOT NULL,
    interaction_type text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT timeline_interactions_interaction_type_check CHECK ((interaction_type = ANY (ARRAY['like'::text, 'dislike'::text, 'repost'::text, 'quote'::text])))
);


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    amount_btc numeric(18,8) NOT NULL,
    currency text DEFAULT 'BTC'::text NOT NULL,
    from_entity_type text NOT NULL,
    from_entity_id uuid NOT NULL,
    to_entity_type text NOT NULL,
    to_entity_id uuid NOT NULL,
    payment_method text,
    purpose text,
    message text,
    anonymous boolean DEFAULT false NOT NULL,
    public_visibility boolean DEFAULT false NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    initiated_at timestamp with time zone,
    confirmed_at timestamp with time zone,
    settled_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT transactions_amount_btc_check CHECK ((amount_btc > (0)::numeric)),
    CONSTRAINT transactions_from_entity_type_check CHECK ((from_entity_type = ANY (ARRAY['profile'::text, 'project'::text]))),
    CONSTRAINT transactions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'completed'::text, 'failed'::text, 'cancelled'::text, 'refunded'::text]))),
    CONSTRAINT transactions_to_entity_type_check CHECK ((to_entity_type = ANY (ARRAY['profile'::text, 'project'::text])))
);


--
-- Name: transparency_scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transparency_scores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_id uuid NOT NULL,
    entity_type text NOT NULL,
    score numeric(5,2) NOT NULL,
    calculation_date timestamp with time zone DEFAULT now() NOT NULL,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    audit_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT transparency_scores_entity_type_check CHECK ((entity_type = ANY (ARRAY['profile'::text, 'organization'::text]))),
    CONSTRAINT transparency_scores_score_check CHECK (((score >= (0)::numeric) AND (score <= (100)::numeric)))
);


--
-- Name: typing_indicators; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.typing_indicators (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    user_id uuid NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:00:10'::interval) NOT NULL
);


--
-- Name: user_api_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_api_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    provider text NOT NULL,
    key_name text NOT NULL,
    encrypted_key text NOT NULL,
    key_hint text NOT NULL,
    is_valid boolean DEFAULT true NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    last_validated_at timestamp with time zone,
    last_used_at timestamp with time zone,
    total_requests integer DEFAULT 0 NOT NULL,
    total_tokens_used bigint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL
);


--
-- Name: user_causes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_causes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    cause_category text NOT NULL,
    goal_amount numeric(20,8),
    currency text DEFAULT 'CHF'::text,
    bitcoin_address text,
    lightning_address text,
    distribution_rules jsonb,
    beneficiaries jsonb DEFAULT '[]'::jsonb,
    status text DEFAULT 'draft'::text,
    total_raised numeric(20,8) DEFAULT 0,
    total_distributed numeric(20,8) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    actor_id uuid NOT NULL,
    is_test boolean DEFAULT false NOT NULL,
    show_on_profile boolean DEFAULT true,
    CONSTRAINT user_causes_currency_check CHECK ((currency = ANY (ARRAY['USD'::text, 'EUR'::text, 'CHF'::text, 'BTC'::text, 'GBP'::text]))),
    CONSTRAINT user_causes_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'completed'::text, 'paused'::text])))
);


--
-- Name: COLUMN user_causes.show_on_profile; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_causes.show_on_profile IS 'Whether this cause appears on the user''s public profile page';


--
-- Name: user_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id uuid NOT NULL,
    title text NOT NULL,
    content text,
    file_url text,
    file_type text,
    file_size_bytes integer,
    document_type public.document_type DEFAULT 'notes'::public.document_type NOT NULL,
    visibility public.document_visibility DEFAULT 'cat_visible'::public.document_visibility NOT NULL,
    tags text[] DEFAULT '{}'::text[],
    summary text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE user_documents; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_documents IS 'User documents for My Cat context - stores personal information that helps My Cat give personalized advice';


--
-- Name: COLUMN user_documents.visibility; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_documents.visibility IS 'private = only user sees, cat_visible = My Cat can use as context, public = anyone can see';


--
-- Name: user_economic_profile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_economic_profile (
    user_id uuid NOT NULL,
    skills jsonb DEFAULT '[]'::jsonb NOT NULL,
    assets jsonb DEFAULT '[]'::jsonb NOT NULL,
    goals jsonb DEFAULT '[]'::jsonb NOT NULL,
    constraints jsonb DEFAULT '[]'::jsonb NOT NULL,
    asked_for jsonb DEFAULT '[]'::jsonb NOT NULL,
    motivation text,
    stage text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_nudges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_nudges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    nudge_type text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    cta_label text,
    cta_url text,
    dedupe_key text NOT NULL,
    score real DEFAULT 0 NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    generated_at timestamp with time zone DEFAULT now() NOT NULL,
    dismissed_at timestamp with time zone
);


--
-- Name: user_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_plans (
    user_id uuid NOT NULL,
    tier text DEFAULT 'free'::text NOT NULL,
    daily_limit integer DEFAULT 10 NOT NULL,
    expires_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    payment_method text,
    last_invoice_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_plans_daily_limit_check CHECK ((daily_limit > 0)),
    CONSTRAINT user_plans_payment_method_check CHECK (((payment_method IS NULL) OR (payment_method = ANY (ARRAY['lightning'::text, 'onchain'::text, 'manual'::text])))),
    CONSTRAINT user_plans_tier_check CHECK ((tier = ANY (ARRAY['free'::text, 'pro'::text])))
);


--
-- Name: TABLE user_plans; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_plans IS 'Cat tier per user. Free is the default; Pro requires a paid Lightning invoice and tracks expiry.';


--
-- Name: COLUMN user_plans.daily_limit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_plans.daily_limit IS 'Resolved daily message cap. Free=10, Pro=200 (target). Read by check_platform_limit.';


--
-- Name: COLUMN user_plans.expires_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_plans.expires_at IS 'NULL on Free. On Pro, the renewal deadline; the RPC treats expired Pro as Free.';


--
-- Name: user_presence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_presence (
    user_id uuid NOT NULL,
    status text DEFAULT 'offline'::text,
    last_seen_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_presence_status_check CHECK ((status = ANY (ARRAY['online'::text, 'away'::text, 'offline'::text])))
);


--
-- Name: user_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    price numeric(20,8) NOT NULL,
    currency text DEFAULT 'CHF'::text,
    product_type text DEFAULT 'physical'::text,
    images text[] DEFAULT '{}'::text[],
    thumbnail_url text,
    inventory_count integer DEFAULT '-1'::integer,
    fulfillment_type text DEFAULT 'manual'::text,
    category text,
    tags text[] DEFAULT '{}'::text[],
    status text DEFAULT 'draft'::text,
    is_featured boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    group_id uuid,
    actor_id uuid NOT NULL,
    is_test boolean DEFAULT false NOT NULL,
    show_on_profile boolean DEFAULT true,
    CONSTRAINT user_products_currency_check CHECK ((currency = ANY (ARRAY['USD'::text, 'EUR'::text, 'CHF'::text, 'BTC'::text, 'GBP'::text]))),
    CONSTRAINT user_products_fulfillment_type_check CHECK ((fulfillment_type = ANY (ARRAY['manual'::text, 'automatic'::text, 'digital'::text]))),
    CONSTRAINT user_products_price_check CHECK ((price > (0)::numeric)),
    CONSTRAINT user_products_price_sats_check CHECK ((price > (0)::numeric)),
    CONSTRAINT user_products_product_type_check CHECK ((product_type = ANY (ARRAY['physical'::text, 'digital'::text, 'service'::text]))),
    CONSTRAINT user_products_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'paused'::text, 'sold_out'::text])))
);


--
-- Name: COLUMN user_products.show_on_profile; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_products.show_on_profile IS 'Whether this product appears on the user''s public profile page';


--
-- Name: user_services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_services (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    category text NOT NULL,
    hourly_rate numeric(20,8),
    fixed_price numeric(20,8),
    currency text DEFAULT 'CHF'::text,
    duration_minutes integer,
    availability_schedule jsonb,
    service_location_type text DEFAULT 'remote'::text,
    service_area text,
    images text[] DEFAULT '{}'::text[],
    portfolio_links text[] DEFAULT '{}'::text[],
    status text DEFAULT 'draft'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    group_id uuid,
    actor_id uuid NOT NULL,
    is_test boolean DEFAULT false NOT NULL,
    show_on_profile boolean DEFAULT true,
    CONSTRAINT pricing_required CHECK (((hourly_rate IS NOT NULL) OR (fixed_price IS NOT NULL))),
    CONSTRAINT user_services_currency_check CHECK ((currency = ANY (ARRAY['USD'::text, 'EUR'::text, 'CHF'::text, 'BTC'::text, 'GBP'::text]))),
    CONSTRAINT user_services_service_location_type_check CHECK ((service_location_type = ANY (ARRAY['remote'::text, 'onsite'::text, 'both'::text]))),
    CONSTRAINT user_services_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'paused'::text, 'unavailable'::text])))
);


--
-- Name: COLUMN user_services.show_on_profile; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_services.show_on_profile IS 'Whether this service appears on the user''s public profile page';


--
-- Name: wallets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid,
    project_id uuid,
    user_id uuid,
    label text NOT NULL,
    description text,
    address_or_xpub text DEFAULT ''::text,
    wallet_type text DEFAULT 'address'::text NOT NULL,
    category text DEFAULT 'general'::text NOT NULL,
    category_icon text DEFAULT '💰'::text NOT NULL,
    behavior_type text DEFAULT 'general'::text NOT NULL,
    budget_amount numeric(20,8),
    budget_period text DEFAULT 'monthly'::text,
    goal_amount numeric(20,8),
    goal_currency text DEFAULT 'USD'::text,
    goal_deadline timestamp with time zone,
    balance_btc numeric(20,8) DEFAULT 0 NOT NULL,
    balance_updated_at timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    nwc_connection_uri text,
    lightning_address text,
    CONSTRAINT check_has_owner CHECK ((((profile_id IS NOT NULL) AND (project_id IS NULL)) OR ((profile_id IS NULL) AND (project_id IS NOT NULL)))),
    CONSTRAINT wallet_has_payment_method CHECK ((((address_or_xpub IS NOT NULL) AND (address_or_xpub <> ''::text)) OR ((lightning_address IS NOT NULL) AND (lightning_address <> ''::text)) OR ((nwc_connection_uri IS NOT NULL) AND (nwc_connection_uri <> ''::text)))),
    CONSTRAINT wallets_balance_btc_check CHECK ((balance_btc >= (0)::numeric)),
    CONSTRAINT wallets_behavior_type_check CHECK ((behavior_type = ANY (ARRAY['general'::text, 'recurring_budget'::text, 'one_time_goal'::text]))),
    CONSTRAINT wallets_budget_amount_check CHECK ((budget_amount > (0)::numeric)),
    CONSTRAINT wallets_budget_period_check CHECK ((budget_period = ANY (ARRAY['weekly'::text, 'monthly'::text, 'quarterly'::text, 'yearly'::text]))),
    CONSTRAINT wallets_description_check CHECK ((char_length(description) <= 500)),
    CONSTRAINT wallets_goal_amount_check CHECK ((goal_amount > (0)::numeric)),
    CONSTRAINT wallets_goal_currency_check CHECK ((goal_currency = ANY (ARRAY['USD'::text, 'EUR'::text, 'CHF'::text, 'BTC'::text, 'GBP'::text]))),
    CONSTRAINT wallets_label_check CHECK ((char_length(label) <= 100)),
    CONSTRAINT wallets_wallet_type_check CHECK ((wallet_type = ANY (ARRAY['address'::text, 'xpub'::text, 'lightning'::text, 'onchain'::text, 'both'::text])))
);


--
-- Name: webhook_deliveries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webhook_deliveries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    endpoint_id uuid NOT NULL,
    event_type text NOT NULL,
    event_id uuid NOT NULL,
    payload jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    response_status integer,
    response_body text,
    attempt_count integer DEFAULT 0 NOT NULL,
    last_attempt_at timestamp with time zone,
    next_attempt_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT webhook_deliveries_event_type_not_blank CHECK ((length(TRIM(BOTH FROM event_type)) > 0)),
    CONSTRAINT webhook_deliveries_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'delivered'::text, 'failed'::text])))
);


--
-- Name: TABLE webhook_deliveries; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.webhook_deliveries IS 'Webhook delivery log + retry queue. Admin-client only - RLS denies all user access.';


--
-- Name: webhook_endpoints; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webhook_endpoints (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    actor_id uuid NOT NULL,
    name text NOT NULL,
    url text NOT NULL,
    secret_prefix text NOT NULL,
    event_types text[],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_delivery_at timestamp with time zone,
    revoked_at timestamp with time zone,
    secret_encrypted bytea NOT NULL,
    CONSTRAINT webhook_endpoints_name_not_blank CHECK ((length(TRIM(BOTH FROM name)) > 0)),
    CONSTRAINT webhook_endpoints_url_not_blank CHECK ((length(TRIM(BOTH FROM url)) > 0))
);


--
-- Name: TABLE webhook_endpoints; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.webhook_endpoints IS 'Outbound webhook configuration. Admin-client only - RLS denies all user access. App layer authorises by user_id at the service boundary.';


--
-- Name: COLUMN webhook_endpoints.secret_encrypted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.webhook_endpoints.secret_encrypted IS 'AES-256-GCM ciphertext of the signing secret. Layout: IV(12B)||tag(16B)||ciphertext. Decrypted with WEBHOOK_SECRET_KEY env var. Phase 1: dual-write with secret_plaintext. Phase 2 will drop secret_plaintext.';


--
-- Name: wishlist_contributions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wishlist_contributions (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    wishlist_item_id uuid NOT NULL,
    contributor_actor_id uuid,
    amount_btc numeric(18,8) NOT NULL,
    message text,
    is_anonymous boolean DEFAULT false,
    payment_hash text,
    payment_status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now(),
    paid_at timestamp with time zone
);


--
-- Name: TABLE wishlist_contributions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.wishlist_contributions IS 'Contributions/funding toward wishlist items';


--
-- Name: wishlist_feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wishlist_feedback (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    wishlist_item_id uuid NOT NULL,
    fulfillment_proof_id uuid,
    actor_id uuid NOT NULL,
    feedback_type text NOT NULL,
    comment text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT dislike_requires_comment CHECK (((feedback_type <> 'dislike'::text) OR ((comment IS NOT NULL) AND (length(comment) >= 10)))),
    CONSTRAINT wishlist_feedback_feedback_type_check CHECK ((feedback_type = ANY (ARRAY['like'::text, 'dislike'::text])))
);


--
-- Name: TABLE wishlist_feedback; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.wishlist_feedback IS 'Community feedback on fulfillment - likes increase trust, dislikes require explanation';


--
-- Name: wishlist_fulfillment_proofs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wishlist_fulfillment_proofs (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    wishlist_item_id uuid NOT NULL,
    proof_type text NOT NULL,
    description text NOT NULL,
    image_url text,
    transaction_id text,
    is_verified boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE wishlist_fulfillment_proofs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.wishlist_fulfillment_proofs IS 'Proof that wishlist items were purchased as promised';


--
-- Name: wishlist_item_with_stats; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.wishlist_item_with_stats AS
SELECT
    NULL::uuid AS id,
    NULL::uuid AS wishlist_id,
    NULL::text AS title,
    NULL::text AS description,
    NULL::text AS image_url,
    NULL::uuid AS product_id,
    NULL::uuid AS service_id,
    NULL::text AS external_url,
    NULL::text AS external_source,
    NULL::numeric(18,8) AS target_amount_btc,
    NULL::text AS currency,
    NULL::numeric AS original_amount,
    NULL::numeric(18,8) AS funded_amount_btc,
    NULL::boolean AS is_fully_funded,
    NULL::boolean AS is_fulfilled,
    NULL::text AS dedicated_wallet_address,
    NULL::boolean AS use_dedicated_wallet,
    NULL::integer AS priority,
    NULL::boolean AS allow_partial_funding,
    NULL::integer AS quantity_wanted,
    NULL::integer AS quantity_received,
    NULL::timestamp with time zone AS created_at,
    NULL::timestamp with time zone AS updated_at,
    NULL::bigint AS contribution_count,
    NULL::bigint AS contributor_count,
    NULL::bigint AS like_count,
    NULL::bigint AS dislike_count;


--
-- Name: wishlist_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wishlist_items (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    wishlist_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    image_url text,
    product_id uuid,
    service_id uuid,
    external_url text,
    external_source text,
    target_amount_btc numeric(18,8) NOT NULL,
    currency text DEFAULT 'SATS'::text,
    original_amount numeric,
    funded_amount_btc numeric(18,8) DEFAULT 0,
    is_fully_funded boolean DEFAULT false,
    is_fulfilled boolean DEFAULT false,
    dedicated_wallet_address text,
    use_dedicated_wallet boolean DEFAULT false,
    priority integer DEFAULT 0,
    allow_partial_funding boolean DEFAULT true,
    quantity_wanted integer DEFAULT 1,
    quantity_received integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE wishlist_items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.wishlist_items IS 'Items on a wishlist - can be internal or external';


--
-- Name: wishlist_with_stats; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.wishlist_with_stats AS
SELECT
    NULL::uuid AS id,
    NULL::uuid AS actor_id,
    NULL::text AS title,
    NULL::text AS description,
    NULL::text AS type,
    NULL::text AS visibility,
    NULL::boolean AS is_active,
    NULL::timestamp with time zone AS event_date,
    NULL::text AS cover_image_url,
    NULL::timestamp with time zone AS created_at,
    NULL::timestamp with time zone AS updated_at,
    NULL::bigint AS item_count,
    NULL::bigint AS funded_item_count,
    NULL::bigint AS fulfilled_item_count,
    NULL::numeric AS total_target_btc,
    NULL::numeric AS total_funded_btc;


--
-- Name: wishlists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wishlists (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    actor_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    type text DEFAULT 'general'::text NOT NULL,
    visibility text DEFAULT 'public'::text NOT NULL,
    is_active boolean DEFAULT true,
    event_date timestamp with time zone,
    cover_image_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_test boolean DEFAULT false NOT NULL,
    show_on_profile boolean DEFAULT true
);


--
-- Name: TABLE wishlists; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.wishlists IS 'Personal registries/wishlists for crowdfunding wants';


--
-- Name: actors actors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.actors
    ADD CONSTRAINT actors_pkey PRIMARY KEY (id);


--
-- Name: ai_assistants ai_assistants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_assistants
    ADD CONSTRAINT ai_assistants_pkey PRIMARY KEY (id);


--
-- Name: ai_conversations ai_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_conversations
    ADD CONSTRAINT ai_conversations_pkey PRIMARY KEY (id);


--
-- Name: ai_creator_earnings ai_creator_earnings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_creator_earnings
    ADD CONSTRAINT ai_creator_earnings_pkey PRIMARY KEY (id);


--
-- Name: ai_creator_earnings ai_creator_earnings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_creator_earnings
    ADD CONSTRAINT ai_creator_earnings_user_id_key UNIQUE (user_id);


--
-- Name: ai_creator_withdrawals ai_creator_withdrawals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_creator_withdrawals
    ADD CONSTRAINT ai_creator_withdrawals_pkey PRIMARY KEY (id);


--
-- Name: ai_messages ai_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_messages
    ADD CONSTRAINT ai_messages_pkey PRIMARY KEY (id);


--
-- Name: asset_availability asset_availability_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_availability
    ADD CONSTRAINT asset_availability_pkey PRIMARY KEY (id);


--
-- Name: assets assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: availability_slots availability_slots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.availability_slots
    ADD CONSTRAINT availability_slots_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: cat_action_log cat_action_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat_action_log
    ADD CONSTRAINT cat_action_log_pkey PRIMARY KEY (id);


--
-- Name: cat_conversations cat_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat_conversations
    ADD CONSTRAINT cat_conversations_pkey PRIMARY KEY (id);


--
-- Name: cat_credit_entries cat_credit_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat_credit_entries
    ADD CONSTRAINT cat_credit_entries_pkey PRIMARY KEY (id);


--
-- Name: cat_credit_topups cat_credit_topups_payment_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat_credit_topups
    ADD CONSTRAINT cat_credit_topups_payment_hash_key UNIQUE (payment_hash);


--
-- Name: cat_credit_topups cat_credit_topups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat_credit_topups
    ADD CONSTRAINT cat_credit_topups_pkey PRIMARY KEY (id);


--
-- Name: cat_memories cat_memories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat_memories
    ADD CONSTRAINT cat_memories_pkey PRIMARY KEY (id);


--
-- Name: cat_messages cat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat_messages
    ADD CONSTRAINT cat_messages_pkey PRIMARY KEY (id);


--
-- Name: cat_pending_actions cat_pending_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat_pending_actions
    ADD CONSTRAINT cat_pending_actions_pkey PRIMARY KEY (id);


--
-- Name: cat_permissions cat_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat_permissions
    ADD CONSTRAINT cat_permissions_pkey PRIMARY KEY (id);


--
-- Name: cat_permissions cat_permissions_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat_permissions
    ADD CONSTRAINT cat_permissions_unique UNIQUE (user_id, action_id, category);


--
-- Name: channel_waitlist channel_waitlist_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_waitlist
    ADD CONSTRAINT channel_waitlist_email_key UNIQUE (email);


--
-- Name: channel_waitlist channel_waitlist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_waitlist
    ADD CONSTRAINT channel_waitlist_pkey PRIMARY KEY (id);


--
-- Name: circles circles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.circles
    ADD CONSTRAINT circles_pkey PRIMARY KEY (id);


--
-- Name: content_embeddings content_embeddings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_embeddings
    ADD CONSTRAINT content_embeddings_pkey PRIMARY KEY (entity_type, entity_id);


--
-- Name: contracts contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);


--
-- Name: contributions contributions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contributions
    ADD CONSTRAINT contributions_pkey PRIMARY KEY (id);


--
-- Name: conversation_participants conversation_participants_conversation_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT conversation_participants_conversation_id_user_id_key UNIQUE (conversation_id, user_id);


--
-- Name: conversation_participants conversation_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT conversation_participants_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: entity_wallets entity_wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_wallets
    ADD CONSTRAINT entity_wallets_pkey PRIMARY KEY (id);


--
-- Name: entity_wallets entity_wallets_wallet_id_entity_type_entity_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_wallets
    ADD CONSTRAINT entity_wallets_wallet_id_entity_type_entity_id_key UNIQUE (wallet_id, entity_type, entity_id);


--
-- Name: event_attendees event_attendees_event_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_attendees
    ADD CONSTRAINT event_attendees_event_id_user_id_key UNIQUE (event_id, user_id);


--
-- Name: event_attendees event_attendees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_attendees
    ADD CONSTRAINT event_attendees_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: follows follows_follower_id_following_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_follower_id_following_id_key UNIQUE (follower_id, following_id);


--
-- Name: follows follows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_pkey PRIMARY KEY (id);


--
-- Name: github_repo_cache github_repo_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.github_repo_cache
    ADD CONSTRAINT github_repo_cache_pkey PRIMARY KEY (user_id);


--
-- Name: group_activities group_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_activities
    ADD CONSTRAINT group_activities_pkey PRIMARY KEY (id);


--
-- Name: group_event_rsvps group_event_rsvps_event_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_event_rsvps
    ADD CONSTRAINT group_event_rsvps_event_id_user_id_key UNIQUE (event_id, user_id);


--
-- Name: group_event_rsvps group_event_rsvps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_event_rsvps
    ADD CONSTRAINT group_event_rsvps_pkey PRIMARY KEY (id);


--
-- Name: group_events group_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_events
    ADD CONSTRAINT group_events_pkey PRIMARY KEY (id);


--
-- Name: group_features group_features_group_id_feature_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_features
    ADD CONSTRAINT group_features_group_id_feature_key_key UNIQUE (group_id, feature_key);


--
-- Name: group_features group_features_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_features
    ADD CONSTRAINT group_features_pkey PRIMARY KEY (id);


--
-- Name: group_invitations group_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_invitations
    ADD CONSTRAINT group_invitations_pkey PRIMARY KEY (id);


--
-- Name: group_invitations group_invitations_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_invitations
    ADD CONSTRAINT group_invitations_token_key UNIQUE (token);


--
-- Name: group_members group_members_group_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_group_id_user_id_key UNIQUE (group_id, user_id);


--
-- Name: group_members group_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_pkey PRIMARY KEY (id);


--
-- Name: group_proposals group_proposals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_proposals
    ADD CONSTRAINT group_proposals_pkey PRIMARY KEY (id);


--
-- Name: group_votes group_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_votes
    ADD CONSTRAINT group_votes_pkey PRIMARY KEY (id);


--
-- Name: group_votes group_votes_proposal_id_voter_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_votes
    ADD CONSTRAINT group_votes_proposal_id_voter_id_key UNIQUE (proposal_id, voter_id);


--
-- Name: group_wallets group_wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_wallets
    ADD CONSTRAINT group_wallets_pkey PRIMARY KEY (id);


--
-- Name: groups groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_pkey PRIMARY KEY (id);


--
-- Name: groups groups_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_slug_key UNIQUE (slug);


--
-- Name: idempotency_results idempotency_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.idempotency_results
    ADD CONSTRAINT idempotency_results_pkey PRIMARY KEY (id);


--
-- Name: integration_keys integration_keys_key_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_keys
    ADD CONSTRAINT integration_keys_key_hash_key UNIQUE (key_hash);


--
-- Name: integration_keys integration_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_keys
    ADD CONSTRAINT integration_keys_pkey PRIMARY KEY (id);


--
-- Name: investments investments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investments
    ADD CONSTRAINT investments_pkey PRIMARY KEY (id);


--
-- Name: loan_categories loan_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loan_categories
    ADD CONSTRAINT loan_categories_name_key UNIQUE (name);


--
-- Name: loan_categories loan_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loan_categories
    ADD CONSTRAINT loan_categories_pkey PRIMARY KEY (id);


--
-- Name: loan_collateral loan_collateral_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loan_collateral
    ADD CONSTRAINT loan_collateral_pkey PRIMARY KEY (id);


--
-- Name: loan_offers loan_offers_loan_id_offerer_id_status_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loan_offers
    ADD CONSTRAINT loan_offers_loan_id_offerer_id_status_key UNIQUE (loan_id, offerer_id, status) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: loan_offers loan_offers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loan_offers
    ADD CONSTRAINT loan_offers_pkey PRIMARY KEY (id);


--
-- Name: loan_payments loan_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loan_payments
    ADD CONSTRAINT loan_payments_pkey PRIMARY KEY (id);


--
-- Name: loans loans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loans
    ADD CONSTRAINT loans_pkey PRIMARY KEY (id);


--
-- Name: message_read_receipts message_read_receipts_message_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_read_receipts
    ADD CONSTRAINT message_read_receipts_message_id_user_id_key UNIQUE (message_id, user_id);


--
-- Name: message_read_receipts message_read_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_read_receipts
    ADD CONSTRAINT message_read_receipts_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: notification_email_log notification_email_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_email_log
    ADD CONSTRAINT notification_email_log_pkey PRIMARY KEY (id);


--
-- Name: notification_preferences notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (id);


--
-- Name: notification_preferences notification_preferences_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_key UNIQUE (user_id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: oauth_auth_codes oauth_auth_codes_code_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_auth_codes
    ADD CONSTRAINT oauth_auth_codes_code_hash_key UNIQUE (code_hash);


--
-- Name: oauth_auth_codes oauth_auth_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_auth_codes
    ADD CONSTRAINT oauth_auth_codes_pkey PRIMARY KEY (id);


--
-- Name: oauth_clients oauth_clients_client_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_clients
    ADD CONSTRAINT oauth_clients_client_id_key UNIQUE (client_id);


--
-- Name: oauth_clients oauth_clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_clients
    ADD CONSTRAINT oauth_clients_pkey PRIMARY KEY (id);


--
-- Name: oauth_refresh_tokens oauth_refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_refresh_tokens
    ADD CONSTRAINT oauth_refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: oauth_refresh_tokens oauth_refresh_tokens_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_refresh_tokens
    ADD CONSTRAINT oauth_refresh_tokens_token_hash_key UNIQUE (token_hash);


--
-- Name: oauth_user_grants oauth_user_grants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_user_grants
    ADD CONSTRAINT oauth_user_grants_pkey PRIMARY KEY (id);


--
-- Name: oauth_user_grants oauth_user_grants_user_id_client_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_user_grants
    ADD CONSTRAINT oauth_user_grants_user_id_client_id_key UNIQUE (user_id, client_id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: payment_intents payment_intents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_intents
    ADD CONSTRAINT payment_intents_pkey PRIMARY KEY (id);


--
-- Name: platform_api_usage platform_api_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_api_usage
    ADD CONSTRAINT platform_api_usage_pkey PRIMARY KEY (id);


--
-- Name: platform_api_usage platform_api_usage_user_id_usage_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_api_usage
    ADD CONSTRAINT platform_api_usage_user_id_usage_date_key UNIQUE (user_id, usage_date);


--
-- Name: post_visibility post_visibility_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_visibility
    ADD CONSTRAINT post_visibility_pkey PRIMARY KEY (id);


--
-- Name: post_visibility post_visibility_post_id_timeline_type_timeline_owner_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_visibility
    ADD CONSTRAINT post_visibility_post_id_timeline_type_timeline_owner_id_key UNIQUE (post_id, timeline_type, timeline_owner_id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_username_key UNIQUE (username);


--
-- Name: project_categories project_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_categories
    ADD CONSTRAINT project_categories_name_key UNIQUE (name);


--
-- Name: project_categories project_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_categories
    ADD CONSTRAINT project_categories_pkey PRIMARY KEY (id);


--
-- Name: project_favorites project_favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_favorites
    ADD CONSTRAINT project_favorites_pkey PRIMARY KEY (id);


--
-- Name: project_favorites project_favorites_user_id_project_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_favorites
    ADD CONSTRAINT project_favorites_user_id_project_id_key UNIQUE (user_id, project_id);


--
-- Name: project_media project_media_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_media
    ADD CONSTRAINT project_media_pkey PRIMARY KEY (id);


--
-- Name: project_roles project_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_roles
    ADD CONSTRAINT project_roles_pkey PRIMARY KEY (id);


--
-- Name: project_support project_support_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_support
    ADD CONSTRAINT project_support_pkey PRIMARY KEY (id);


--
-- Name: project_support_stats project_support_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_support_stats
    ADD CONSTRAINT project_support_stats_pkey PRIMARY KEY (project_id);


--
-- Name: project_updates project_updates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_updates
    ADD CONSTRAINT project_updates_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: research_contributions research_contributions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_contributions
    ADD CONSTRAINT research_contributions_pkey PRIMARY KEY (id);


--
-- Name: research_entities research_entities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_entities
    ADD CONSTRAINT research_entities_pkey PRIMARY KEY (id);


--
-- Name: research_entities research_entities_wallet_address_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_entities
    ADD CONSTRAINT research_entities_wallet_address_key UNIQUE (wallet_address);


--
-- Name: research_progress_updates research_progress_updates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_progress_updates
    ADD CONSTRAINT research_progress_updates_pkey PRIMARY KEY (id);


--
-- Name: research_votes research_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_votes
    ADD CONSTRAINT research_votes_pkey PRIMARY KEY (id);


--
-- Name: research_votes research_votes_research_entity_id_user_id_vote_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_votes
    ADD CONSTRAINT research_votes_research_entity_id_user_id_vote_type_key UNIQUE (research_entity_id, user_id, vote_type);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (filename);


--
-- Name: search_queries search_queries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.search_queries
    ADD CONSTRAINT search_queries_pkey PRIMARY KEY (id);


--
-- Name: shipping_addresses shipping_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_addresses
    ADD CONSTRAINT shipping_addresses_pkey PRIMARY KEY (id);


--
-- Name: stakeholder_relationships stakeholder_relationships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stakeholder_relationships
    ADD CONSTRAINT stakeholder_relationships_pkey PRIMARY KEY (id);


--
-- Name: task_attention_flags task_attention_flags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_attention_flags
    ADD CONSTRAINT task_attention_flags_pkey PRIMARY KEY (id);


--
-- Name: task_completions task_completions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_completions
    ADD CONSTRAINT task_completions_pkey PRIMARY KEY (id);


--
-- Name: task_projects task_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_projects
    ADD CONSTRAINT task_projects_pkey PRIMARY KEY (id);


--
-- Name: task_requests task_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_requests
    ADD CONSTRAINT task_requests_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: timeline_comments timeline_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timeline_comments
    ADD CONSTRAINT timeline_comments_pkey PRIMARY KEY (id);


--
-- Name: timeline_dislikes timeline_dislikes_event_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timeline_dislikes
    ADD CONSTRAINT timeline_dislikes_event_id_user_id_key UNIQUE (event_id, user_id);


--
-- Name: timeline_dislikes timeline_dislikes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timeline_dislikes
    ADD CONSTRAINT timeline_dislikes_pkey PRIMARY KEY (id);


--
-- Name: timeline_event_stats timeline_event_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timeline_event_stats
    ADD CONSTRAINT timeline_event_stats_pkey PRIMARY KEY (event_id);


--
-- Name: timeline_event_visibility timeline_event_visibility_event_id_timeline_type_timeline_o_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timeline_event_visibility
    ADD CONSTRAINT timeline_event_visibility_event_id_timeline_type_timeline_o_key UNIQUE (event_id, timeline_type, timeline_owner_id);


--
-- Name: timeline_event_visibility timeline_event_visibility_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timeline_event_visibility
    ADD CONSTRAINT timeline_event_visibility_pkey PRIMARY KEY (id);


--
-- Name: timeline_events timeline_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timeline_events
    ADD CONSTRAINT timeline_events_pkey PRIMARY KEY (id);


--
-- Name: timeline_interactions timeline_interactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timeline_interactions
    ADD CONSTRAINT timeline_interactions_pkey PRIMARY KEY (id);


--
-- Name: timeline_interactions timeline_interactions_user_id_event_id_interaction_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timeline_interactions
    ADD CONSTRAINT timeline_interactions_user_id_event_id_interaction_type_key UNIQUE (user_id, event_id, interaction_type);


--
-- Name: timeline_likes timeline_likes_event_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timeline_likes
    ADD CONSTRAINT timeline_likes_event_id_user_id_key UNIQUE (event_id, user_id);


--
-- Name: timeline_likes timeline_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timeline_likes
    ADD CONSTRAINT timeline_likes_pkey PRIMARY KEY (id);


--
-- Name: timeline_shares timeline_shares_original_event_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timeline_shares
    ADD CONSTRAINT timeline_shares_original_event_id_user_id_key UNIQUE (original_event_id, user_id);


--
-- Name: timeline_shares timeline_shares_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timeline_shares
    ADD CONSTRAINT timeline_shares_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: transparency_scores transparency_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transparency_scores
    ADD CONSTRAINT transparency_scores_pkey PRIMARY KEY (id);


--
-- Name: typing_indicators typing_indicators_conversation_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.typing_indicators
    ADD CONSTRAINT typing_indicators_conversation_id_user_id_key UNIQUE (conversation_id, user_id);


--
-- Name: typing_indicators typing_indicators_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.typing_indicators
    ADD CONSTRAINT typing_indicators_pkey PRIMARY KEY (id);


--
-- Name: transparency_scores unique_entity_score; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transparency_scores
    ADD CONSTRAINT unique_entity_score UNIQUE (entity_id, entity_type);


--
-- Name: project_media unique_project_media_position; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_media
    ADD CONSTRAINT unique_project_media_position UNIQUE (project_id, "position");


--
-- Name: user_ai_preferences user_ai_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_ai_preferences
    ADD CONSTRAINT user_ai_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_ai_preferences user_ai_preferences_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_ai_preferences
    ADD CONSTRAINT user_ai_preferences_user_id_unique UNIQUE (user_id);


--
-- Name: user_api_keys user_api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_api_keys
    ADD CONSTRAINT user_api_keys_pkey PRIMARY KEY (id);


--
-- Name: user_api_keys user_api_keys_unique_name_per_user; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_api_keys
    ADD CONSTRAINT user_api_keys_unique_name_per_user UNIQUE (user_id, key_name);


--
-- Name: user_causes user_causes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_causes
    ADD CONSTRAINT user_causes_pkey PRIMARY KEY (id);


--
-- Name: user_documents user_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_documents
    ADD CONSTRAINT user_documents_pkey PRIMARY KEY (id);


--
-- Name: user_economic_profile user_economic_profile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_economic_profile
    ADD CONSTRAINT user_economic_profile_pkey PRIMARY KEY (user_id);


--
-- Name: user_nudges user_nudges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_nudges
    ADD CONSTRAINT user_nudges_pkey PRIMARY KEY (id);


--
-- Name: user_nudges user_nudges_user_id_dedupe_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_nudges
    ADD CONSTRAINT user_nudges_user_id_dedupe_key_key UNIQUE (user_id, dedupe_key);


--
-- Name: user_plans user_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_plans
    ADD CONSTRAINT user_plans_pkey PRIMARY KEY (user_id);


--
-- Name: user_presence user_presence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_presence
    ADD CONSTRAINT user_presence_pkey PRIMARY KEY (user_id);


--
-- Name: user_products user_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_products
    ADD CONSTRAINT user_products_pkey PRIMARY KEY (id);


--
-- Name: user_services user_services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_services
    ADD CONSTRAINT user_services_pkey PRIMARY KEY (id);


--
-- Name: wallets wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_pkey PRIMARY KEY (id);


--
-- Name: webhook_deliveries webhook_deliveries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_deliveries
    ADD CONSTRAINT webhook_deliveries_pkey PRIMARY KEY (id);


--
-- Name: webhook_endpoints webhook_endpoints_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_endpoints
    ADD CONSTRAINT webhook_endpoints_pkey PRIMARY KEY (id);


--
-- Name: wishlist_contributions wishlist_contributions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlist_contributions
    ADD CONSTRAINT wishlist_contributions_pkey PRIMARY KEY (id);


--
-- Name: wishlist_feedback wishlist_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlist_feedback
    ADD CONSTRAINT wishlist_feedback_pkey PRIMARY KEY (id);


--
-- Name: wishlist_feedback wishlist_feedback_wishlist_item_id_actor_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlist_feedback
    ADD CONSTRAINT wishlist_feedback_wishlist_item_id_actor_id_key UNIQUE (wishlist_item_id, actor_id);


--
-- Name: wishlist_fulfillment_proofs wishlist_fulfillment_proofs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlist_fulfillment_proofs
    ADD CONSTRAINT wishlist_fulfillment_proofs_pkey PRIMARY KEY (id);


--
-- Name: wishlist_items wishlist_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlist_items
    ADD CONSTRAINT wishlist_items_pkey PRIMARY KEY (id);


--
-- Name: wishlists wishlists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlists
    ADD CONSTRAINT wishlists_pkey PRIMARY KEY (id);


--
-- Name: cat_credit_entries_kind_ref; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX cat_credit_entries_kind_ref ON public.cat_credit_entries USING btree (kind, ref) WHERE (ref IS NOT NULL);


--
-- Name: cat_credit_entries_user_seq; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cat_credit_entries_user_seq ON public.cat_credit_entries USING btree (user_id, seq DESC);


--
-- Name: cat_credit_topups_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cat_credit_topups_user_created ON public.cat_credit_topups USING btree (user_id, created_at DESC);


--
-- Name: cat_memories_hnsw; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cat_memories_hnsw ON public.cat_memories USING hnsw (embedding printcraft.vector_cosine_ops);


--
-- Name: cat_memories_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cat_memories_user_created ON public.cat_memories USING btree (user_id, created_at DESC);


--
-- Name: content_embeddings_hnsw; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX content_embeddings_hnsw ON public.content_embeddings USING hnsw (embedding printcraft.vector_cosine_ops);


--
-- Name: idempotency_results_expires_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idempotency_results_expires_at_idx ON public.idempotency_results USING btree (expires_at);


--
-- Name: idempotency_results_user_key_path_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idempotency_results_user_key_path_idx ON public.idempotency_results USING btree (user_id, key, path);


--
-- Name: idx_actors_group_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_actors_group_id ON public.actors USING btree (group_id) WHERE (actor_type = 'group'::text);


--
-- Name: idx_actors_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_actors_type ON public.actors USING btree (actor_type);


--
-- Name: idx_actors_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_actors_user_id ON public.actors USING btree (user_id) WHERE (actor_type = 'user'::text);


--
-- Name: idx_ai_assistants_actor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_assistants_actor_id ON public.ai_assistants USING btree (actor_id);


--
-- Name: idx_ai_assistants_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_assistants_category ON public.ai_assistants USING btree (category);


--
-- Name: idx_ai_assistants_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_assistants_created_at ON public.ai_assistants USING btree (created_at DESC);


--
-- Name: idx_ai_assistants_is_featured; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_assistants_is_featured ON public.ai_assistants USING btree (is_featured) WHERE (is_featured = true);


--
-- Name: idx_ai_assistants_is_public; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_assistants_is_public ON public.ai_assistants USING btree (is_public) WHERE (is_public = true);


--
-- Name: idx_ai_assistants_show_on_profile; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_assistants_show_on_profile ON public.ai_assistants USING btree (user_id, show_on_profile) WHERE (show_on_profile = true);


--
-- Name: idx_ai_assistants_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_assistants_status ON public.ai_assistants USING btree (status);


--
-- Name: idx_ai_assistants_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_assistants_user_id ON public.ai_assistants USING btree (user_id);


--
-- Name: idx_ai_conversations_assistant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_conversations_assistant_id ON public.ai_conversations USING btree (assistant_id);


--
-- Name: idx_ai_conversations_last_message; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_conversations_last_message ON public.ai_conversations USING btree (last_message_at DESC);


--
-- Name: idx_ai_conversations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_conversations_status ON public.ai_conversations USING btree (status);


--
-- Name: idx_ai_conversations_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_conversations_user_id ON public.ai_conversations USING btree (user_id);


--
-- Name: idx_ai_creator_earnings_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_creator_earnings_user_id ON public.ai_creator_earnings USING btree (user_id);


--
-- Name: idx_ai_creator_withdrawals_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_creator_withdrawals_created_at ON public.ai_creator_withdrawals USING btree (created_at DESC);


--
-- Name: idx_ai_creator_withdrawals_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_creator_withdrawals_status ON public.ai_creator_withdrawals USING btree (status);


--
-- Name: idx_ai_creator_withdrawals_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_creator_withdrawals_user_id ON public.ai_creator_withdrawals USING btree (user_id);


--
-- Name: idx_ai_messages_conversation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_messages_conversation_id ON public.ai_messages USING btree (conversation_id);


--
-- Name: idx_ai_messages_cost_tracking; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_messages_cost_tracking ON public.ai_messages USING btree (conversation_id, api_cost_btc, creator_markup_btc);


--
-- Name: idx_ai_messages_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_messages_created_at ON public.ai_messages USING btree (created_at);


--
-- Name: idx_ai_messages_model_used; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_messages_model_used ON public.ai_messages USING btree (model_used);


--
-- Name: idx_asset_availability_asset; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asset_availability_asset ON public.asset_availability USING btree (asset_id);


--
-- Name: idx_asset_availability_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asset_availability_provider ON public.asset_availability USING btree (provider_actor_id);


--
-- Name: idx_assets_is_for_rent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assets_is_for_rent ON public.assets USING btree (is_for_rent) WHERE (is_for_rent = true);


--
-- Name: idx_assets_is_for_sale; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assets_is_for_sale ON public.assets USING btree (is_for_sale) WHERE (is_for_sale = true);


--
-- Name: idx_assets_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assets_owner ON public.assets USING btree (owner_id);


--
-- Name: idx_assets_show_on_profile; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assets_show_on_profile ON public.assets USING btree (actor_id, show_on_profile) WHERE (show_on_profile = true);


--
-- Name: idx_assets_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assets_status ON public.assets USING btree (status);


--
-- Name: idx_assets_type_col; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assets_type_col ON public.assets USING btree (type);


--
-- Name: idx_assets_visibility; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assets_visibility ON public.assets USING btree (public_visibility);


--
-- Name: idx_audit_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action);


--
-- Name: idx_audit_logs_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_entity ON public.audit_logs USING btree (entity_type, entity_id);


--
-- Name: idx_audit_logs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_user ON public.audit_logs USING btree (user_id, created_at DESC);


--
-- Name: idx_availability_slots_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_availability_slots_date ON public.availability_slots USING btree (specific_date);


--
-- Name: idx_availability_slots_day; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_availability_slots_day ON public.availability_slots USING btree (day_of_week);


--
-- Name: idx_availability_slots_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_availability_slots_provider ON public.availability_slots USING btree (provider_actor_id);


--
-- Name: idx_availability_slots_service; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_availability_slots_service ON public.availability_slots USING btree (service_id);


--
-- Name: idx_bookings_bookable; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_bookable ON public.bookings USING btree (bookable_type, bookable_id);


--
-- Name: idx_bookings_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_created_at ON public.bookings USING btree (created_at DESC);


--
-- Name: idx_bookings_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_customer ON public.bookings USING btree (customer_actor_id);


--
-- Name: idx_bookings_customer_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_customer_user ON public.bookings USING btree (customer_user_id);


--
-- Name: idx_bookings_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_provider ON public.bookings USING btree (provider_actor_id);


--
-- Name: idx_bookings_starts_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_starts_at ON public.bookings USING btree (starts_at);


--
-- Name: idx_bookings_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_status ON public.bookings USING btree (status);


--
-- Name: idx_cat_action_log_action_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cat_action_log_action_id ON public.cat_action_log USING btree (action_id);


--
-- Name: idx_cat_action_log_conversation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cat_action_log_conversation ON public.cat_action_log USING btree (conversation_id);


--
-- Name: idx_cat_action_log_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cat_action_log_created_at ON public.cat_action_log USING btree (created_at DESC);


--
-- Name: idx_cat_action_log_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cat_action_log_status ON public.cat_action_log USING btree (status);


--
-- Name: idx_cat_action_log_user_action_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cat_action_log_user_action_date ON public.cat_action_log USING btree (user_id, action_id, created_at DESC);


--
-- Name: idx_cat_action_log_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cat_action_log_user_id ON public.cat_action_log USING btree (user_id);


--
-- Name: idx_cat_conversations_default_per_user; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_cat_conversations_default_per_user ON public.cat_conversations USING btree (user_id) WHERE (is_default = true);


--
-- Name: idx_cat_conversations_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cat_conversations_user_id ON public.cat_conversations USING btree (user_id);


--
-- Name: idx_cat_messages_conversation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cat_messages_conversation_id ON public.cat_messages USING btree (conversation_id, created_at DESC);


--
-- Name: idx_cat_messages_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cat_messages_user_id ON public.cat_messages USING btree (user_id);


--
-- Name: idx_cat_pending_actions_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cat_pending_actions_expires ON public.cat_pending_actions USING btree (expires_at);


--
-- Name: idx_cat_pending_actions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cat_pending_actions_status ON public.cat_pending_actions USING btree (status);


--
-- Name: idx_cat_pending_actions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cat_pending_actions_user_id ON public.cat_pending_actions USING btree (user_id);


--
-- Name: idx_cat_pending_actions_user_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cat_pending_actions_user_pending ON public.cat_pending_actions USING btree (user_id, status) WHERE (status = 'pending'::text);


--
-- Name: idx_cat_permissions_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cat_permissions_action ON public.cat_permissions USING btree (action_id);


--
-- Name: idx_cat_permissions_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cat_permissions_category ON public.cat_permissions USING btree (category);


--
-- Name: idx_cat_permissions_user_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cat_permissions_user_category ON public.cat_permissions USING btree (user_id, category);


--
-- Name: idx_cat_permissions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cat_permissions_user_id ON public.cat_permissions USING btree (user_id);


--
-- Name: idx_channel_waitlist_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_waitlist_created_at ON public.channel_waitlist USING btree (created_at DESC);


--
-- Name: idx_circles_actor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_circles_actor ON public.circles USING btree (actor_id);


--
-- Name: idx_circles_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_circles_category ON public.circles USING btree (category);


--
-- Name: idx_circles_visibility; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_circles_visibility ON public.circles USING btree (visibility) WHERE (visibility = 'public'::text);


--
-- Name: idx_contracts_party_a; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contracts_party_a ON public.contracts USING btree (party_a_actor_id);


--
-- Name: idx_contracts_party_b; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contracts_party_b ON public.contracts USING btree (party_b_actor_id);


--
-- Name: idx_contracts_proposal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contracts_proposal ON public.contracts USING btree (proposal_id);


--
-- Name: idx_contracts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contracts_status ON public.contracts USING btree (status);


--
-- Name: idx_contracts_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contracts_type ON public.contracts USING btree (contract_type);


--
-- Name: idx_contributions_contributor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contributions_contributor ON public.contributions USING btree (contributor_id);


--
-- Name: idx_contributions_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contributions_entity ON public.contributions USING btree (entity_type, entity_id);


--
-- Name: idx_contributions_payment_intent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contributions_payment_intent_id ON public.contributions USING btree (payment_intent_id);


--
-- Name: idx_conversation_participants_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversation_participants_active ON public.conversation_participants USING btree (user_id, is_active) WHERE (is_active = true);


--
-- Name: INDEX idx_conversation_participants_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_conversation_participants_active IS 'Fast lookup of active participants';


--
-- Name: idx_conversation_participants_conversation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversation_participants_conversation_id ON public.conversation_participants USING btree (conversation_id);


--
-- Name: idx_conversation_participants_user_conversation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversation_participants_user_conversation ON public.conversation_participants USING btree (user_id, conversation_id);


--
-- Name: idx_conversation_participants_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversation_participants_user_id ON public.conversation_participants USING btree (user_id);


--
-- Name: idx_conversations_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_created_by ON public.conversations USING btree (created_by);


--
-- Name: idx_conversations_last_message_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_last_message_at ON public.conversations USING btree (last_message_at DESC);


--
-- Name: idx_conversations_last_message_sender_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_last_message_sender_id ON public.conversations USING btree (last_message_sender_id);


--
-- Name: idx_conversations_professional; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_professional ON public.conversations USING btree (professional_slug);


--
-- Name: idx_conversations_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_type ON public.conversations USING btree (conversation_type);


--
-- Name: idx_conversations_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_updated_at ON public.conversations USING btree (updated_at DESC);


--
-- Name: idx_entity_wallets_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entity_wallets_created_by ON public.entity_wallets USING btree (created_by);


--
-- Name: idx_entity_wallets_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entity_wallets_entity ON public.entity_wallets USING btree (entity_type, entity_id);


--
-- Name: idx_entity_wallets_wallet; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entity_wallets_wallet ON public.entity_wallets USING btree (wallet_id);


--
-- Name: idx_event_attendees_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_attendees_event_id ON public.event_attendees USING btree (event_id);


--
-- Name: idx_event_attendees_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_attendees_status ON public.event_attendees USING btree (status);


--
-- Name: idx_event_attendees_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_attendees_user_id ON public.event_attendees USING btree (user_id);


--
-- Name: idx_events_actor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_actor_id ON public.events USING btree (actor_id);


--
-- Name: idx_events_asset_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_asset_id ON public.events USING btree (asset_id);


--
-- Name: idx_events_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_category ON public.events USING btree (category);


--
-- Name: idx_events_fts; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_fts ON public.events USING gin (to_tsvector('english'::regconfig, ((COALESCE(title, ''::text) || ' '::text) || COALESCE(description, ''::text))));


--
-- Name: idx_events_fts2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_fts2 ON public.events USING gin (to_tsvector('english'::regconfig, public.f_unaccent(((COALESCE(title, ''::text) || ' '::text) || COALESCE(description, ''::text)))));


--
-- Name: idx_events_show_on_profile; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_show_on_profile ON public.events USING btree (user_id, show_on_profile) WHERE (show_on_profile = true);


--
-- Name: idx_events_start_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_start_date ON public.events USING btree (start_date);


--
-- Name: idx_events_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_status ON public.events USING btree (status);


--
-- Name: idx_events_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_trgm ON public.events USING gin (public.f_unaccent(COALESCE(title, ''::text)) extensions.gin_trgm_ops);


--
-- Name: idx_events_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_user_id ON public.events USING btree (user_id);


--
-- Name: idx_follows_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_follows_created_at ON public.follows USING btree (created_at);


--
-- Name: idx_follows_follower_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_follows_follower_id ON public.follows USING btree (follower_id);


--
-- Name: idx_follows_following_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_follows_following_id ON public.follows USING btree (following_id);


--
-- Name: idx_group_activities_activity_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_activities_activity_type ON public.group_activities USING btree (activity_type);


--
-- Name: idx_group_activities_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_activities_created_at ON public.group_activities USING btree (created_at DESC);


--
-- Name: idx_group_activities_group_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_activities_group_id ON public.group_activities USING btree (group_id);


--
-- Name: idx_group_activities_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_activities_user_id ON public.group_activities USING btree (user_id);


--
-- Name: idx_group_event_rsvps_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_event_rsvps_event ON public.group_event_rsvps USING btree (event_id);


--
-- Name: idx_group_event_rsvps_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_event_rsvps_status ON public.group_event_rsvps USING btree (status);


--
-- Name: idx_group_event_rsvps_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_event_rsvps_user ON public.group_event_rsvps USING btree (user_id);


--
-- Name: idx_group_events_creator; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_events_creator ON public.group_events USING btree (creator_id);


--
-- Name: idx_group_events_group; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_events_group ON public.group_events USING btree (group_id);


--
-- Name: idx_group_events_starts_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_events_starts_at ON public.group_events USING btree (starts_at);


--
-- Name: idx_group_events_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_events_type ON public.group_events USING btree (event_type);


--
-- Name: idx_group_features_enabled_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_features_enabled_by ON public.group_features USING btree (enabled_by);


--
-- Name: idx_group_features_group; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_features_group ON public.group_features USING btree (group_id);


--
-- Name: idx_group_invitations_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_invitations_email ON public.group_invitations USING btree (email) WHERE (email IS NOT NULL);


--
-- Name: idx_group_invitations_group; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_invitations_group ON public.group_invitations USING btree (group_id);


--
-- Name: idx_group_invitations_invited_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_invitations_invited_by ON public.group_invitations USING btree (invited_by);


--
-- Name: idx_group_invitations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_invitations_status ON public.group_invitations USING btree (status) WHERE (status = 'pending'::text);


--
-- Name: idx_group_invitations_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_invitations_token ON public.group_invitations USING btree (token) WHERE (token IS NOT NULL);


--
-- Name: idx_group_invitations_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_invitations_user ON public.group_invitations USING btree (user_id) WHERE (user_id IS NOT NULL);


--
-- Name: idx_group_members_group; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_members_group ON public.group_members USING btree (group_id);


--
-- Name: idx_group_members_invited_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_members_invited_by ON public.group_members USING btree (invited_by);


--
-- Name: idx_group_members_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_members_role ON public.group_members USING btree (role);


--
-- Name: idx_group_members_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_members_user ON public.group_members USING btree (user_id);


--
-- Name: idx_group_proposals_group; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_proposals_group ON public.group_proposals USING btree (group_id);


--
-- Name: idx_group_proposals_is_public; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_proposals_is_public ON public.group_proposals USING btree (is_public) WHERE (is_public = true);


--
-- Name: idx_group_proposals_proposer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_proposals_proposer_id ON public.group_proposals USING btree (proposer_id);


--
-- Name: idx_group_proposals_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_proposals_status ON public.group_proposals USING btree (status);


--
-- Name: idx_group_votes_proposal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_votes_proposal ON public.group_votes USING btree (proposal_id);


--
-- Name: idx_group_votes_voter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_votes_voter ON public.group_votes USING btree (voter_id);


--
-- Name: idx_group_wallets_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_wallets_created_by ON public.group_wallets USING btree (created_by);


--
-- Name: idx_group_wallets_group; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_wallets_group ON public.group_wallets USING btree (group_id);


--
-- Name: idx_groups_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_groups_created_by ON public.groups USING btree (created_by);


--
-- Name: idx_groups_is_public; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_groups_is_public ON public.groups USING btree (is_public) WHERE (is_public = true);


--
-- Name: idx_groups_label; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_groups_label ON public.groups USING btree (label);


--
-- Name: idx_groups_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_groups_slug ON public.groups USING btree (slug);


--
-- Name: idx_groups_tags; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_groups_tags ON public.groups USING gin (tags);


--
-- Name: idx_investments_actor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_investments_actor_id ON public.investments USING btree (actor_id);


--
-- Name: idx_investments_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_investments_created_at ON public.investments USING btree (created_at DESC);


--
-- Name: idx_investments_investment_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_investments_investment_type ON public.investments USING btree (investment_type);


--
-- Name: idx_investments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_investments_status ON public.investments USING btree (status);


--
-- Name: idx_investments_wallet_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_investments_wallet_id ON public.investments USING btree (wallet_id);


--
-- Name: idx_loan_collateral_asset; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_loan_collateral_asset ON public.loan_collateral USING btree (asset_id);


--
-- Name: idx_loan_collateral_loan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_loan_collateral_loan ON public.loan_collateral USING btree (loan_id);


--
-- Name: idx_loan_collateral_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_loan_collateral_owner ON public.loan_collateral USING btree (owner_id);


--
-- Name: idx_loan_offers_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_loan_offers_expires ON public.loan_offers USING btree (expires_at) WHERE (status = 'pending'::text);


--
-- Name: idx_loan_offers_loan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_loan_offers_loan ON public.loan_offers USING btree (loan_id, created_at DESC);


--
-- Name: idx_loan_offers_offerer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_loan_offers_offerer ON public.loan_offers USING btree (offerer_id, created_at DESC);


--
-- Name: idx_loan_offers_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_loan_offers_status ON public.loan_offers USING btree (status, created_at DESC);


--
-- Name: idx_loan_payments_loan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_loan_payments_loan ON public.loan_payments USING btree (loan_id, created_at DESC);


--
-- Name: idx_loan_payments_offer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_loan_payments_offer ON public.loan_payments USING btree (offer_id) WHERE (offer_id IS NOT NULL);


--
-- Name: idx_loan_payments_payer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_loan_payments_payer ON public.loan_payments USING btree (payer_id, created_at DESC);


--
-- Name: idx_loan_payments_recipient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_loan_payments_recipient ON public.loan_payments USING btree (recipient_id, created_at DESC);


--
-- Name: idx_loan_payments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_loan_payments_status ON public.loan_payments USING btree (status, processed_at DESC);


--
-- Name: idx_loans_actor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_loans_actor_id ON public.loans USING btree (actor_id) WHERE (actor_id IS NOT NULL);


--
-- Name: idx_loans_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_loans_category ON public.loans USING btree (loan_category_id);


--
-- Name: idx_loans_fts2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_loans_fts2 ON public.loans USING gin (to_tsvector('english'::regconfig, public.f_unaccent(((COALESCE(title, ''::text) || ' '::text) || COALESCE(description, ''::text)))));


--
-- Name: idx_loans_public; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_loans_public ON public.loans USING btree (is_public) WHERE (is_public = true);


--
-- Name: idx_loans_remaining_balance; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_loans_remaining_balance ON public.loans USING btree (remaining_balance DESC);


--
-- Name: idx_loans_show_on_profile; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_loans_show_on_profile ON public.loans USING btree (user_id, show_on_profile) WHERE (show_on_profile = true);


--
-- Name: idx_loans_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_loans_status ON public.loans USING btree (status, created_at DESC);


--
-- Name: idx_loans_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_loans_trgm ON public.loans USING gin (public.f_unaccent(COALESCE(title, ''::text)) extensions.gin_trgm_ops);


--
-- Name: idx_loans_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_loans_user ON public.loans USING btree (user_id, created_at DESC);


--
-- Name: idx_loans_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_loans_user_id ON public.loans USING btree (user_id);


--
-- Name: idx_message_read_receipts_message_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_message_read_receipts_message_user ON public.message_read_receipts USING btree (message_id, user_id);


--
-- Name: INDEX idx_message_read_receipts_message_user; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_message_read_receipts_message_user IS 'Fast read receipt lookups';


--
-- Name: idx_message_read_receipts_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_message_read_receipts_user_id ON public.message_read_receipts USING btree (user_id);


--
-- Name: idx_messages_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_active ON public.messages USING btree (conversation_id, created_at DESC) WHERE (is_deleted = false);


--
-- Name: INDEX idx_messages_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_messages_active IS 'Partial index for non-deleted messages only';


--
-- Name: idx_messages_content_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_content_search ON public.messages USING gin (to_tsvector('english'::regconfig, content)) WHERE (is_deleted = false);


--
-- Name: INDEX idx_messages_content_search; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_messages_content_search IS 'Full-text search for message content';


--
-- Name: idx_messages_conversation_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_conversation_created_at ON public.messages USING btree (conversation_id, created_at DESC);


--
-- Name: idx_messages_conversation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_conversation_id ON public.messages USING btree (conversation_id);


--
-- Name: idx_messages_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_created_at ON public.messages USING btree (created_at DESC);


--
-- Name: idx_messages_sender_conversation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_sender_conversation ON public.messages USING btree (sender_id, conversation_id, created_at DESC) WHERE (is_deleted = false);


--
-- Name: INDEX idx_messages_sender_conversation; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_messages_sender_conversation IS 'Optimizes sender-based message queries';


--
-- Name: idx_messages_sender_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_sender_id ON public.messages USING btree (sender_id);


--
-- Name: idx_messages_unread_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_unread_lookup ON public.messages USING btree (conversation_id, sender_id, created_at) WHERE (is_deleted = false);


--
-- Name: idx_notification_email_log_cap; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_email_log_cap ON public.notification_email_log USING btree (user_id, notification_type, sent_at DESC);


--
-- Name: idx_notification_email_log_sent_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_email_log_sent_at ON public.notification_email_log USING btree (sent_at DESC);


--
-- Name: idx_notifications_type_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_type_created ON public.notifications USING btree (type, created_at DESC);


--
-- Name: idx_notifications_user_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_unread ON public.notifications USING btree (user_id, is_read) WHERE (is_read = false);


--
-- Name: idx_orders_buyer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_buyer ON public.orders USING btree (buyer_id);


--
-- Name: idx_orders_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_entity ON public.orders USING btree (entity_type, entity_id);


--
-- Name: idx_orders_payment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_payment ON public.orders USING btree (payment_intent_id);


--
-- Name: idx_orders_seller; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_seller ON public.orders USING btree (seller_id);


--
-- Name: idx_orders_shipping_address_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_shipping_address_id ON public.orders USING btree (shipping_address_id);


--
-- Name: idx_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_status ON public.orders USING btree (status);


--
-- Name: idx_participants_user_conversation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_participants_user_conversation ON public.conversation_participants USING btree (user_id, conversation_id, is_active) WHERE (is_active = true);


--
-- Name: INDEX idx_participants_user_conversation; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_participants_user_conversation IS 'Optimizes participant membership checks';


--
-- Name: idx_payment_intents_buyer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_intents_buyer ON public.payment_intents USING btree (buyer_id);


--
-- Name: idx_payment_intents_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_intents_entity ON public.payment_intents USING btree (entity_type, entity_id);


--
-- Name: idx_payment_intents_seller; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_intents_seller ON public.payment_intents USING btree (seller_id);


--
-- Name: idx_payment_intents_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_intents_status ON public.payment_intents USING btree (status);


--
-- Name: idx_platform_api_usage_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_api_usage_date ON public.platform_api_usage USING btree (usage_date);


--
-- Name: idx_platform_api_usage_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_api_usage_user_date ON public.platform_api_usage USING btree (user_id, usage_date);


--
-- Name: idx_post_visibility_added_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_post_visibility_added_by ON public.post_visibility USING btree (added_by_id);


--
-- Name: idx_post_visibility_post_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_post_visibility_post_id ON public.post_visibility USING btree (post_id);


--
-- Name: idx_post_visibility_timeline_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_post_visibility_timeline_lookup ON public.post_visibility USING btree (timeline_type, timeline_owner_id, added_at DESC);


--
-- Name: idx_profiles_contact_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_contact_email ON public.profiles USING btree (contact_email) WHERE (contact_email IS NOT NULL);


--
-- Name: idx_profiles_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_created_at ON public.profiles USING btree (created_at DESC);


--
-- Name: idx_profiles_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_email ON public.profiles USING btree (email) WHERE (email IS NOT NULL);


--
-- Name: idx_profiles_fts2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_fts2 ON public.profiles USING gin (to_tsvector('english'::regconfig, public.f_unaccent(((((COALESCE(username, ''::text) || ' '::text) || COALESCE(name, ''::text)) || ' '::text) || COALESCE(bio, ''::text)))));


--
-- Name: idx_profiles_location_city; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_location_city ON public.profiles USING btree (location_city) WHERE (location_city IS NOT NULL);


--
-- Name: idx_profiles_location_coords; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_location_coords ON public.profiles USING btree (latitude, longitude) WHERE ((latitude IS NOT NULL) AND (longitude IS NOT NULL));


--
-- Name: idx_profiles_location_country; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_location_country ON public.profiles USING btree (location_country) WHERE (location_country IS NOT NULL);


--
-- Name: idx_profiles_location_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_location_search ON public.profiles USING btree (location_search) WHERE (location_search IS NOT NULL);


--
-- Name: idx_profiles_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_name ON public.profiles USING btree (name);


--
-- Name: idx_profiles_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_status ON public.profiles USING btree (status);


--
-- Name: idx_profiles_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_trgm ON public.profiles USING gin (public.f_unaccent(((COALESCE(username, ''::text) || ' '::text) || COALESCE(name, ''::text))) extensions.gin_trgm_ops);


--
-- Name: idx_profiles_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_updated_at ON public.profiles USING btree (updated_at DESC);


--
-- Name: idx_profiles_verification_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_verification_status ON public.profiles USING btree (verification_status);


--
-- Name: idx_project_favorites_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_favorites_created_at ON public.project_favorites USING btree (created_at DESC);


--
-- Name: idx_project_favorites_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_favorites_project_id ON public.project_favorites USING btree (project_id);


--
-- Name: idx_project_favorites_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_favorites_user_id ON public.project_favorites USING btree (user_id);


--
-- Name: idx_project_media_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_media_project ON public.project_media USING btree (project_id, "position");


--
-- Name: idx_project_support_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_support_created_at ON public.project_support USING btree (created_at DESC);


--
-- Name: idx_project_support_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_support_project_id ON public.project_support USING btree (project_id);


--
-- Name: idx_project_support_project_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_support_project_type ON public.project_support USING btree (project_id, support_type);


--
-- Name: idx_project_support_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_support_type ON public.project_support USING btree (support_type);


--
-- Name: idx_project_support_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_support_user_id ON public.project_support USING btree (user_id);


--
-- Name: idx_project_updates_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_updates_project ON public.project_updates USING btree (project_id, created_at DESC);


--
-- Name: idx_projects_actor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_actor_id ON public.projects USING btree (actor_id) WHERE (actor_id IS NOT NULL);


--
-- Name: idx_projects_bitcoin_address; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_bitcoin_address ON public.projects USING btree (bitcoin_address) WHERE (bitcoin_address IS NOT NULL);


--
-- Name: idx_projects_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_created_at ON public.projects USING btree (created_at DESC);


--
-- Name: idx_projects_creator_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_creator_id ON public.projects USING btree (creator_id);


--
-- Name: idx_projects_fts; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_fts ON public.projects USING gin (to_tsvector('english'::regconfig, ((COALESCE(title, ''::text) || ' '::text) || COALESCE(description, ''::text))));


--
-- Name: idx_projects_fts2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_fts2 ON public.projects USING gin (to_tsvector('english'::regconfig, public.f_unaccent(((COALESCE(title, ''::text) || ' '::text) || COALESCE(description, ''::text)))));


--
-- Name: idx_projects_group_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_group_id ON public.projects USING btree (group_id) WHERE (group_id IS NOT NULL);


--
-- Name: idx_projects_show_on_profile; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_show_on_profile ON public.projects USING btree (user_id, show_on_profile) WHERE (show_on_profile = true);


--
-- Name: idx_projects_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_status ON public.projects USING btree (status);


--
-- Name: idx_projects_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_trgm ON public.projects USING gin (public.f_unaccent(COALESCE(title, ''::text)) extensions.gin_trgm_ops);


--
-- Name: idx_projects_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_user_id ON public.projects USING btree (user_id);


--
-- Name: idx_research_contributions_entity_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_research_contributions_entity_id ON public.research_contributions USING btree (research_entity_id);


--
-- Name: idx_research_contributions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_research_contributions_status ON public.research_contributions USING btree (status);


--
-- Name: idx_research_contributions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_research_contributions_user_id ON public.research_contributions USING btree (user_id);


--
-- Name: idx_research_entities_actor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_research_entities_actor_id ON public.research_entities USING btree (actor_id);


--
-- Name: idx_research_entities_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_research_entities_created_at ON public.research_entities USING btree (created_at DESC);


--
-- Name: idx_research_entities_field; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_research_entities_field ON public.research_entities USING btree (field);


--
-- Name: idx_research_entities_funding_goal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_research_entities_funding_goal ON public.research_entities USING btree (funding_goal_btc);


--
-- Name: idx_research_entities_is_public; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_research_entities_is_public ON public.research_entities USING btree (is_public) WHERE (is_public = true);


--
-- Name: idx_research_entities_show_on_profile; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_research_entities_show_on_profile ON public.research_entities USING btree (user_id, show_on_profile) WHERE (show_on_profile = true);


--
-- Name: idx_research_entities_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_research_entities_status ON public.research_entities USING btree (status);


--
-- Name: idx_research_entities_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_research_entities_user_id ON public.research_entities USING btree (user_id);


--
-- Name: idx_research_progress_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_research_progress_created_at ON public.research_progress_updates USING btree (created_at DESC);


--
-- Name: idx_research_progress_entity_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_research_progress_entity_id ON public.research_progress_updates USING btree (research_entity_id);


--
-- Name: idx_research_votes_entity_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_research_votes_entity_id ON public.research_votes USING btree (research_entity_id);


--
-- Name: idx_research_votes_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_research_votes_user_id ON public.research_votes USING btree (user_id);


--
-- Name: idx_search_queries_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_search_queries_created_at ON public.search_queries USING btree (created_at DESC);


--
-- Name: idx_search_queries_query; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_search_queries_query ON public.search_queries USING btree (query);


--
-- Name: idx_shipping_addresses_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipping_addresses_user ON public.shipping_addresses USING btree (user_id);


--
-- Name: idx_stakeholder_relationships_from_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stakeholder_relationships_from_project ON public.stakeholder_relationships USING btree (from_project_id);


--
-- Name: idx_stakeholder_relationships_kind; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stakeholder_relationships_kind ON public.stakeholder_relationships USING btree (kind);


--
-- Name: idx_stakeholder_relationships_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stakeholder_relationships_owner ON public.stakeholder_relationships USING btree (owner_actor_id);


--
-- Name: idx_stakeholder_relationships_to_actor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stakeholder_relationships_to_actor ON public.stakeholder_relationships USING btree (to_actor_id) WHERE (to_actor_id IS NOT NULL);


--
-- Name: idx_stakeholder_relationships_to_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stakeholder_relationships_to_project ON public.stakeholder_relationships USING btree (to_project_id) WHERE (to_project_id IS NOT NULL);


--
-- Name: idx_stakeholder_relationships_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stakeholder_relationships_updated ON public.stakeholder_relationships USING btree (updated_at DESC);


--
-- Name: idx_task_attention_flags_resolved_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_attention_flags_resolved_by ON public.task_attention_flags USING btree (resolved_by);


--
-- Name: idx_task_attention_flags_resolved_by_completion_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_attention_flags_resolved_by_completion_id ON public.task_attention_flags USING btree (resolved_by_completion_id);


--
-- Name: idx_task_attention_flags_task; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_attention_flags_task ON public.task_attention_flags USING btree (task_id) WHERE (NOT is_resolved);


--
-- Name: idx_task_attention_flags_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_attention_flags_user ON public.task_attention_flags USING btree (flagged_by);


--
-- Name: idx_task_completions_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_completions_date ON public.task_completions USING btree (completed_at DESC);


--
-- Name: idx_task_completions_task; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_completions_task ON public.task_completions USING btree (task_id);


--
-- Name: idx_task_completions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_completions_user ON public.task_completions USING btree (completed_by);


--
-- Name: idx_task_projects_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_projects_created_by ON public.task_projects USING btree (created_by);


--
-- Name: idx_task_projects_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_projects_status ON public.task_projects USING btree (status);


--
-- Name: idx_task_requests_broadcast; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_requests_broadcast ON public.task_requests USING btree (is_broadcast) WHERE (status = 'pending'::text);


--
-- Name: idx_task_requests_completion_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_requests_completion_id ON public.task_requests USING btree (completion_id);


--
-- Name: idx_task_requests_requested_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_requests_requested_by ON public.task_requests USING btree (requested_by);


--
-- Name: idx_task_requests_responded_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_requests_responded_by ON public.task_requests USING btree (responded_by);


--
-- Name: idx_task_requests_task; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_requests_task ON public.task_requests USING btree (task_id);


--
-- Name: idx_task_requests_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_requests_user ON public.task_requests USING btree (requested_user_id) WHERE (status = 'pending'::text);


--
-- Name: idx_tasks_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_category ON public.tasks USING btree (category) WHERE (NOT is_archived);


--
-- Name: idx_tasks_completed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_completed_by ON public.tasks USING btree (completed_by);


--
-- Name: idx_tasks_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_created_by ON public.tasks USING btree (created_by);


--
-- Name: idx_tasks_created_by_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_created_by_due_date ON public.tasks USING btree (created_by, due_date) WHERE ((due_date IS NOT NULL) AND (is_completed = false));


--
-- Name: idx_tasks_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_priority ON public.tasks USING btree (priority) WHERE ((NOT is_archived) AND (current_status <> 'idle'::text));


--
-- Name: idx_tasks_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_project ON public.tasks USING btree (project_id) WHERE (NOT is_archived);


--
-- Name: idx_tasks_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_status ON public.tasks USING btree (current_status) WHERE (NOT is_archived);


--
-- Name: idx_tasks_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_type ON public.tasks USING btree (task_type) WHERE (NOT is_archived);


--
-- Name: idx_timeline_actor_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timeline_actor_time ON public.timeline_events USING btree (actor_id, event_timestamp DESC) WHERE ((actor_id IS NOT NULL) AND (NOT is_deleted));


--
-- Name: idx_timeline_comments_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timeline_comments_event ON public.timeline_comments USING btree (event_id, created_at DESC);


--
-- Name: idx_timeline_comments_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timeline_comments_event_id ON public.timeline_comments USING btree (event_id);


--
-- Name: idx_timeline_comments_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timeline_comments_parent ON public.timeline_comments USING btree (parent_comment_id) WHERE (parent_comment_id IS NOT NULL);


--
-- Name: idx_timeline_comments_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timeline_comments_parent_id ON public.timeline_comments USING btree (parent_comment_id);


--
-- Name: idx_timeline_comments_thread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timeline_comments_thread ON public.timeline_comments USING btree ((
CASE
    WHEN (parent_comment_id IS NULL) THEN id
    ELSE parent_comment_id
END), created_at DESC);


--
-- Name: idx_timeline_comments_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timeline_comments_user ON public.timeline_comments USING btree (user_id, created_at DESC);


--
-- Name: idx_timeline_dislikes_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timeline_dislikes_created_at ON public.timeline_dislikes USING btree (created_at DESC);


--
-- Name: idx_timeline_dislikes_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timeline_dislikes_event ON public.timeline_dislikes USING btree (event_id);


--
-- Name: idx_timeline_dislikes_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timeline_dislikes_user ON public.timeline_dislikes USING btree (user_id, created_at DESC);


--
-- Name: idx_timeline_dislikes_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timeline_dislikes_user_id ON public.timeline_dislikes USING btree (user_id);


--
-- Name: idx_timeline_event_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timeline_event_type ON public.timeline_events USING btree (event_type, event_timestamp DESC) WHERE (NOT is_deleted);


--
-- Name: idx_timeline_event_visibility_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timeline_event_visibility_event_id ON public.timeline_event_visibility USING btree (event_id);


--
-- Name: idx_timeline_event_visibility_type_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timeline_event_visibility_type_owner ON public.timeline_event_visibility USING btree (timeline_type, timeline_owner_id);


--
-- Name: idx_timeline_events_actor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timeline_events_actor_id ON public.timeline_events USING btree (actor_id);


--
-- Name: idx_timeline_events_is_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timeline_events_is_deleted ON public.timeline_events USING btree (is_deleted) WHERE (is_deleted = false);


--
-- Name: idx_timeline_events_quote_replies; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timeline_events_quote_replies ON public.timeline_events USING btree (is_quote_reply, parent_event_id) WHERE ((is_quote_reply = true) AND (NOT is_deleted));


--
-- Name: idx_timeline_events_thread_depth; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timeline_events_thread_depth ON public.timeline_events USING btree (thread_id, thread_depth) WHERE ((thread_id IS NOT NULL) AND (NOT is_deleted));


--
-- Name: idx_timeline_events_visibility; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timeline_events_visibility ON public.timeline_events USING btree (visibility);


--
-- Name: idx_timeline_featured; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timeline_featured ON public.timeline_events USING btree (is_featured, event_timestamp DESC) WHERE ((is_featured = true) AND (NOT is_deleted));


--
-- Name: idx_timeline_interactions_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timeline_interactions_event_id ON public.timeline_interactions USING btree (event_id);


--
-- Name: idx_timeline_interactions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timeline_interactions_user_id ON public.timeline_interactions USING btree (user_id);


--
-- Name: idx_timeline_likes_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timeline_likes_created_at ON public.timeline_likes USING btree (created_at DESC);


--
-- Name: idx_timeline_likes_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timeline_likes_event ON public.timeline_likes USING btree (event_id);


--
-- Name: idx_timeline_likes_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timeline_likes_user ON public.timeline_likes USING btree (user_id, created_at DESC);


--
-- Name: idx_timeline_metadata; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timeline_metadata ON public.timeline_events USING gin (metadata) WHERE (NOT is_deleted);


--
-- Name: idx_timeline_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timeline_parent ON public.timeline_events USING btree (parent_event_id, event_timestamp DESC) WHERE ((parent_event_id IS NOT NULL) AND (NOT is_deleted));


--
-- Name: idx_timeline_shares_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timeline_shares_created_at ON public.timeline_shares USING btree (created_at DESC);


--
-- Name: idx_timeline_shares_original_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timeline_shares_original_event ON public.timeline_shares USING btree (original_event_id);


--
-- Name: idx_timeline_shares_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timeline_shares_user ON public.timeline_shares USING btree (user_id, created_at DESC);


--
-- Name: idx_timeline_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timeline_subject ON public.timeline_events USING btree (subject_type, subject_id, event_timestamp DESC) WHERE ((subject_id IS NOT NULL) AND (NOT is_deleted));


--
-- Name: idx_timeline_tags; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timeline_tags ON public.timeline_events USING gin (tags) WHERE ((array_length(tags, 1) > 0) AND (NOT is_deleted));


--
-- Name: idx_timeline_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timeline_target ON public.timeline_events USING btree (target_type, target_id, event_timestamp DESC) WHERE ((target_id IS NOT NULL) AND (NOT is_deleted));


--
-- Name: idx_timeline_thread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timeline_thread ON public.timeline_events USING btree (thread_id, event_timestamp DESC) WHERE ((thread_id IS NOT NULL) AND (NOT is_deleted));


--
-- Name: idx_timeline_visibility; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timeline_visibility ON public.timeline_events USING btree (visibility, event_timestamp DESC) WHERE (NOT is_deleted);


--
-- Name: idx_transactions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_created_at ON public.transactions USING btree (created_at DESC);


--
-- Name: idx_transactions_from_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_from_entity ON public.transactions USING btree (from_entity_id);


--
-- Name: idx_transactions_to_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_to_entity ON public.transactions USING btree (to_entity_id);


--
-- Name: idx_transactions_to_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_to_status ON public.transactions USING btree (to_entity_type, status);


--
-- Name: idx_transparency_scores_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transparency_scores_score ON public.transparency_scores USING btree (score DESC);


--
-- Name: idx_typing_indicators_conversation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_typing_indicators_conversation ON public.typing_indicators USING btree (conversation_id);


--
-- Name: idx_typing_indicators_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_typing_indicators_expires ON public.typing_indicators USING btree (expires_at);


--
-- Name: idx_user_ai_preferences_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_ai_preferences_user_id ON public.user_ai_preferences USING btree (user_id);


--
-- Name: idx_user_causes_actor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_causes_actor_id ON public.user_causes USING btree (actor_id) WHERE (actor_id IS NOT NULL);


--
-- Name: idx_user_causes_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_causes_category ON public.user_causes USING btree (cause_category);


--
-- Name: idx_user_causes_fts; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_causes_fts ON public.user_causes USING gin (to_tsvector('english'::regconfig, ((COALESCE(title, ''::text) || ' '::text) || COALESCE(description, ''::text))));


--
-- Name: idx_user_causes_fts2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_causes_fts2 ON public.user_causes USING gin (to_tsvector('english'::regconfig, public.f_unaccent(((COALESCE(title, ''::text) || ' '::text) || COALESCE(description, ''::text)))));


--
-- Name: idx_user_causes_show_on_profile; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_causes_show_on_profile ON public.user_causes USING btree (user_id, show_on_profile) WHERE (show_on_profile = true);


--
-- Name: idx_user_causes_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_causes_status ON public.user_causes USING btree (status);


--
-- Name: idx_user_causes_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_causes_trgm ON public.user_causes USING gin (public.f_unaccent(COALESCE(title, ''::text)) extensions.gin_trgm_ops);


--
-- Name: idx_user_causes_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_causes_user_id ON public.user_causes USING btree (user_id);


--
-- Name: idx_user_documents_actor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_documents_actor_id ON public.user_documents USING btree (actor_id);


--
-- Name: idx_user_documents_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_documents_created_at ON public.user_documents USING btree (created_at DESC);


--
-- Name: idx_user_documents_document_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_documents_document_type ON public.user_documents USING btree (document_type);


--
-- Name: idx_user_documents_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_documents_search ON public.user_documents USING gin (to_tsvector('english'::regconfig, ((COALESCE(title, ''::text) || ' '::text) || COALESCE(content, ''::text))));


--
-- Name: idx_user_documents_visibility; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_documents_visibility ON public.user_documents USING btree (visibility);


--
-- Name: idx_user_economic_profile_skills; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_economic_profile_skills ON public.user_economic_profile USING gin (skills);


--
-- Name: idx_user_plans_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_plans_expires_at ON public.user_plans USING btree (expires_at) WHERE (expires_at IS NOT NULL);


--
-- Name: idx_user_presence_last_seen; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_presence_last_seen ON public.user_presence USING btree (last_seen_at);


--
-- Name: idx_user_presence_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_presence_status ON public.user_presence USING btree (status);


--
-- Name: idx_user_products_actor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_products_actor_id ON public.user_products USING btree (actor_id) WHERE (actor_id IS NOT NULL);


--
-- Name: idx_user_products_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_products_category ON public.user_products USING btree (category) WHERE (category IS NOT NULL);


--
-- Name: idx_user_products_featured; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_products_featured ON public.user_products USING btree (is_featured) WHERE (is_featured = true);


--
-- Name: idx_user_products_fts; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_products_fts ON public.user_products USING gin (to_tsvector('english'::regconfig, ((COALESCE(title, ''::text) || ' '::text) || COALESCE(description, ''::text))));


--
-- Name: idx_user_products_fts2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_products_fts2 ON public.user_products USING gin (to_tsvector('english'::regconfig, public.f_unaccent(((COALESCE(title, ''::text) || ' '::text) || COALESCE(description, ''::text)))));


--
-- Name: idx_user_products_group_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_products_group_id ON public.user_products USING btree (group_id) WHERE (group_id IS NOT NULL);


--
-- Name: idx_user_products_show_on_profile; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_products_show_on_profile ON public.user_products USING btree (user_id, show_on_profile) WHERE (show_on_profile = true);


--
-- Name: idx_user_products_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_products_status ON public.user_products USING btree (status);


--
-- Name: idx_user_products_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_products_trgm ON public.user_products USING gin (public.f_unaccent(COALESCE(title, ''::text)) extensions.gin_trgm_ops);


--
-- Name: idx_user_products_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_products_user_id ON public.user_products USING btree (user_id);


--
-- Name: idx_user_services_actor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_services_actor_id ON public.user_services USING btree (actor_id) WHERE (actor_id IS NOT NULL);


--
-- Name: idx_user_services_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_services_category ON public.user_services USING btree (category);


--
-- Name: idx_user_services_fts; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_services_fts ON public.user_services USING gin (to_tsvector('english'::regconfig, ((COALESCE(title, ''::text) || ' '::text) || COALESCE(description, ''::text))));


--
-- Name: idx_user_services_fts2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_services_fts2 ON public.user_services USING gin (to_tsvector('english'::regconfig, public.f_unaccent(((COALESCE(title, ''::text) || ' '::text) || COALESCE(description, ''::text)))));


--
-- Name: idx_user_services_group_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_services_group_id ON public.user_services USING btree (group_id) WHERE (group_id IS NOT NULL);


--
-- Name: idx_user_services_location_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_services_location_type ON public.user_services USING btree (service_location_type);


--
-- Name: idx_user_services_show_on_profile; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_services_show_on_profile ON public.user_services USING btree (user_id, show_on_profile) WHERE (show_on_profile = true);


--
-- Name: idx_user_services_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_services_status ON public.user_services USING btree (status);


--
-- Name: idx_user_services_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_services_trgm ON public.user_services USING gin (public.f_unaccent(COALESCE(title, ''::text)) extensions.gin_trgm_ops);


--
-- Name: idx_user_services_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_services_user_id ON public.user_services USING btree (user_id);


--
-- Name: idx_wallets_profile; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallets_profile ON public.wallets USING btree (profile_id, is_active) WHERE (profile_id IS NOT NULL);


--
-- Name: idx_wallets_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallets_project ON public.wallets USING btree (project_id, is_active) WHERE (project_id IS NOT NULL);


--
-- Name: idx_wallets_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallets_user ON public.wallets USING btree (user_id) WHERE (user_id IS NOT NULL);


--
-- Name: idx_wishlist_contributions_contributor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wishlist_contributions_contributor ON public.wishlist_contributions USING btree (contributor_actor_id);


--
-- Name: idx_wishlist_contributions_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wishlist_contributions_item_id ON public.wishlist_contributions USING btree (wishlist_item_id);


--
-- Name: idx_wishlist_feedback_actor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wishlist_feedback_actor ON public.wishlist_feedback USING btree (actor_id);


--
-- Name: idx_wishlist_feedback_fulfillment_proof_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wishlist_feedback_fulfillment_proof_id ON public.wishlist_feedback USING btree (fulfillment_proof_id);


--
-- Name: idx_wishlist_feedback_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wishlist_feedback_item ON public.wishlist_feedback USING btree (wishlist_item_id);


--
-- Name: idx_wishlist_fulfillment_proofs_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wishlist_fulfillment_proofs_item ON public.wishlist_fulfillment_proofs USING btree (wishlist_item_id);


--
-- Name: idx_wishlist_items_funded; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wishlist_items_funded ON public.wishlist_items USING btree (is_fully_funded, is_fulfilled);


--
-- Name: idx_wishlist_items_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wishlist_items_product_id ON public.wishlist_items USING btree (product_id);


--
-- Name: idx_wishlist_items_service_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wishlist_items_service_id ON public.wishlist_items USING btree (service_id);


--
-- Name: idx_wishlist_items_wishlist_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wishlist_items_wishlist_id ON public.wishlist_items USING btree (wishlist_id);


--
-- Name: idx_wishlists_actor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wishlists_actor_id ON public.wishlists USING btree (actor_id);


--
-- Name: idx_wishlists_show_on_profile; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wishlists_show_on_profile ON public.wishlists USING btree (actor_id, show_on_profile) WHERE (show_on_profile = true);


--
-- Name: idx_wishlists_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wishlists_type ON public.wishlists USING btree (type);


--
-- Name: idx_wishlists_visibility; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wishlists_visibility ON public.wishlists USING btree (visibility) WHERE (is_active = true);


--
-- Name: integration_keys_active_hash_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX integration_keys_active_hash_idx ON public.integration_keys USING btree (key_hash) WHERE (revoked_at IS NULL);


--
-- Name: integration_keys_actor_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX integration_keys_actor_id_idx ON public.integration_keys USING btree (actor_id);


--
-- Name: integration_keys_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX integration_keys_user_id_idx ON public.integration_keys USING btree (user_id);


--
-- Name: oauth_auth_codes_expires_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX oauth_auth_codes_expires_idx ON public.oauth_auth_codes USING btree (expires_at);


--
-- Name: oauth_refresh_tokens_actor_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX oauth_refresh_tokens_actor_idx ON public.oauth_refresh_tokens USING btree (actor_id);


--
-- Name: profiles_username_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX profiles_username_idx ON public.profiles USING btree (username);


--
-- Name: project_roles_project_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX project_roles_project_idx ON public.project_roles USING btree (project_id);


--
-- Name: project_roles_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX project_roles_status_idx ON public.project_roles USING btree (status);


--
-- Name: timeline_events_external_publish_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX timeline_events_external_publish_uidx ON public.timeline_events USING btree (((metadata ->> 'source'::text)), ((metadata ->> 'external_id'::text))) WHERE (metadata ? 'external_id'::text);


--
-- Name: user_api_keys_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_api_keys_order_idx ON public.user_api_keys USING btree (user_id, sort_order);


--
-- Name: user_api_keys_primary_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_api_keys_primary_idx ON public.user_api_keys USING btree (user_id, is_primary) WHERE (is_primary = true);


--
-- Name: user_api_keys_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_api_keys_user_idx ON public.user_api_keys USING btree (user_id);


--
-- Name: user_nudges_user_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_nudges_user_status_idx ON public.user_nudges USING btree (user_id, status);


--
-- Name: webhook_deliveries_due_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX webhook_deliveries_due_idx ON public.webhook_deliveries USING btree (next_attempt_at) WHERE (status = 'pending'::text);


--
-- Name: webhook_deliveries_endpoint_recent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX webhook_deliveries_endpoint_recent_idx ON public.webhook_deliveries USING btree (endpoint_id, created_at DESC);


--
-- Name: webhook_endpoints_actor_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX webhook_endpoints_actor_active_idx ON public.webhook_endpoints USING btree (actor_id) WHERE (revoked_at IS NULL);


--
-- Name: webhook_endpoints_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX webhook_endpoints_user_id_idx ON public.webhook_endpoints USING btree (user_id);


--
-- Name: wishlist_item_with_stats _RETURN; Type: RULE; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW public.wishlist_item_with_stats WITH (security_invoker='true') AS
 SELECT wi.id,
    wi.wishlist_id,
    wi.title,
    wi.description,
    wi.image_url,
    wi.product_id,
    wi.service_id,
    wi.external_url,
    wi.external_source,
    wi.target_amount_btc,
    wi.currency,
    wi.original_amount,
    wi.funded_amount_btc,
    wi.is_fully_funded,
    wi.is_fulfilled,
    wi.dedicated_wallet_address,
    wi.use_dedicated_wallet,
    wi.priority,
    wi.allow_partial_funding,
    wi.quantity_wanted,
    wi.quantity_received,
    wi.created_at,
    wi.updated_at,
    count(DISTINCT wc.id) AS contribution_count,
    count(DISTINCT wc.contributor_actor_id) AS contributor_count,
    count(DISTINCT wf.id) FILTER (WHERE (wf.feedback_type = 'like'::text)) AS like_count,
    count(DISTINCT wf.id) FILTER (WHERE (wf.feedback_type = 'dislike'::text)) AS dislike_count
   FROM ((public.wishlist_items wi
     LEFT JOIN public.wishlist_contributions wc ON (((wc.wishlist_item_id = wi.id) AND (wc.payment_status = 'completed'::text))))
     LEFT JOIN public.wishlist_feedback wf ON ((wf.wishlist_item_id = wi.id)))
  GROUP BY wi.id;


--
-- Name: wishlist_with_stats _RETURN; Type: RULE; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW public.wishlist_with_stats WITH (security_invoker='true') AS
 SELECT w.id,
    w.actor_id,
    w.title,
    w.description,
    w.type,
    w.visibility,
    w.is_active,
    w.event_date,
    w.cover_image_url,
    w.created_at,
    w.updated_at,
    count(DISTINCT wi.id) AS item_count,
    count(DISTINCT wi.id) FILTER (WHERE wi.is_fully_funded) AS funded_item_count,
    count(DISTINCT wi.id) FILTER (WHERE wi.is_fulfilled) AS fulfilled_item_count,
    COALESCE(sum(wi.target_amount_btc), (0)::numeric) AS total_target_btc,
    COALESCE(sum(wi.funded_amount_btc), (0)::numeric) AS total_funded_btc
   FROM (public.wishlists w
     LEFT JOIN public.wishlist_items wi ON ((wi.wishlist_id = w.id)))
  GROUP BY w.id;


--
-- Name: cat_messages cat_messages_update_conversation_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER cat_messages_update_conversation_timestamp AFTER INSERT ON public.cat_messages FOR EACH ROW EXECUTE FUNCTION public.update_cat_conversation_timestamp();


--
-- Name: group_proposals group_proposals_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER group_proposals_updated_at BEFORE UPDATE ON public.group_proposals FOR EACH ROW EXECUTE FUNCTION public.update_groups_updated_at();


--
-- Name: group_wallets group_wallets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER group_wallets_updated_at BEFORE UPDATE ON public.group_wallets FOR EACH ROW EXECUTE FUNCTION public.update_groups_updated_at();


--
-- Name: groups groups_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER groups_updated_at BEFORE UPDATE ON public.groups FOR EACH ROW EXECUTE FUNCTION public.update_groups_updated_at();


--
-- Name: profiles on_profile_created_actor; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_profile_created_actor AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile_actor();


--
-- Name: project_support project_support_stats_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER project_support_stats_trigger AFTER INSERT ON public.project_support FOR EACH ROW EXECUTE FUNCTION public.update_project_support_stats();


--
-- Name: ai_assistants set_ai_assistants_published_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_ai_assistants_published_at BEFORE UPDATE ON public.ai_assistants FOR EACH ROW EXECUTE FUNCTION public.set_ai_assistant_published_at();


--
-- Name: orders set_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: payment_intents set_payment_intents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_payment_intents_updated_at BEFORE UPDATE ON public.payment_intents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: shipping_addresses set_shipping_addresses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_shipping_addresses_updated_at BEFORE UPDATE ON public.shipping_addresses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: wallets set_wallet_user_id_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_wallet_user_id_trigger BEFORE INSERT OR UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.set_wallet_user_id();


--
-- Name: task_completions task_completion_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER task_completion_trigger AFTER INSERT ON public.task_completions FOR EACH ROW EXECUTE FUNCTION public.reset_task_on_completion();


--
-- Name: task_projects task_projects_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER task_projects_updated_at BEFORE UPDATE ON public.task_projects FOR EACH ROW EXECUTE FUNCTION public.update_task_updated_at();


--
-- Name: task_requests task_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER task_requests_updated_at BEFORE UPDATE ON public.task_requests FOR EACH ROW EXECUTE FUNCTION public.update_task_updated_at();


--
-- Name: tasks tasks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_task_updated_at();


--
-- Name: circles trg_circles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_circles_updated_at BEFORE UPDATE ON public.circles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_causes trg_embed_cause_ins; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_embed_cause_ins AFTER INSERT OR DELETE ON public.user_causes FOR EACH ROW EXECUTE FUNCTION public.notify_embedding_reindex('cause');


--
-- Name: user_causes trg_embed_cause_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_embed_cause_upd AFTER UPDATE ON public.user_causes FOR EACH ROW WHEN (((old.title IS DISTINCT FROM new.title) OR (old.description IS DISTINCT FROM new.description) OR (old.status IS DISTINCT FROM new.status))) EXECUTE FUNCTION public.notify_embedding_reindex('cause');


--
-- Name: user_products trg_embed_product_ins; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_embed_product_ins AFTER INSERT OR DELETE ON public.user_products FOR EACH ROW EXECUTE FUNCTION public.notify_embedding_reindex('product');


--
-- Name: user_products trg_embed_product_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_embed_product_upd AFTER UPDATE ON public.user_products FOR EACH ROW WHEN (((old.title IS DISTINCT FROM new.title) OR (old.description IS DISTINCT FROM new.description) OR (old.status IS DISTINCT FROM new.status))) EXECUTE FUNCTION public.notify_embedding_reindex('product');


--
-- Name: profiles trg_embed_profiles_ins; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_embed_profiles_ins AFTER INSERT OR DELETE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.notify_embedding_reindex('profile');


--
-- Name: profiles trg_embed_profiles_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_embed_profiles_upd AFTER UPDATE ON public.profiles FOR EACH ROW WHEN (((old.name IS DISTINCT FROM new.name) OR (old.bio IS DISTINCT FROM new.bio) OR (old.location_city IS DISTINCT FROM new.location_city))) EXECUTE FUNCTION public.notify_embedding_reindex('profile');


--
-- Name: user_services trg_embed_service_ins; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_embed_service_ins AFTER INSERT OR DELETE ON public.user_services FOR EACH ROW EXECUTE FUNCTION public.notify_embedding_reindex('service');


--
-- Name: user_services trg_embed_service_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_embed_service_upd AFTER UPDATE ON public.user_services FOR EACH ROW WHEN (((old.title IS DISTINCT FROM new.title) OR (old.description IS DISTINCT FROM new.description) OR (old.status IS DISTINCT FROM new.status))) EXECUTE FUNCTION public.notify_embedding_reindex('service');


--
-- Name: stakeholder_relationships trg_stakeholder_relationships_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_stakeholder_relationships_updated BEFORE UPDATE ON public.stakeholder_relationships FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_stakeholder_relationships();


--
-- Name: profiles trg_sync_profile_to_actor; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sync_profile_to_actor AFTER UPDATE OF name, username, avatar_url ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.sync_profile_to_actor();


--
-- Name: asset_availability trigger_asset_availability_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_asset_availability_updated_at BEFORE UPDATE ON public.asset_availability FOR EACH ROW EXECUTE FUNCTION public.update_booking_timestamp();


--
-- Name: ai_messages trigger_auto_title_ai_conversation; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_auto_title_ai_conversation AFTER INSERT ON public.ai_messages FOR EACH ROW EXECUTE FUNCTION public.auto_title_ai_conversation();


--
-- Name: availability_slots trigger_availability_slots_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_availability_slots_updated_at BEFORE UPDATE ON public.availability_slots FOR EACH ROW EXECUTE FUNCTION public.update_booking_timestamp();


--
-- Name: bookings trigger_bookings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_booking_timestamp();


--
-- Name: cat_permissions trigger_cat_permissions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_cat_permissions_updated_at BEFORE UPDATE ON public.cat_permissions FOR EACH ROW EXECUTE FUNCTION public.update_cat_permissions_updated_at();


--
-- Name: conversations trigger_conversations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.update_conversation_timestamp();


--
-- Name: messages trigger_messages_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_messages_updated_at BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.update_message_timestamp();


--
-- Name: notification_preferences trigger_notification_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_notification_preferences_updated_at BEFORE UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION public.update_notification_preferences_updated_at();


--
-- Name: ai_messages trigger_update_ai_conversation_stats; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_ai_conversation_stats AFTER INSERT ON public.ai_messages FOR EACH ROW EXECUTE FUNCTION public.update_ai_conversation_stats();


--
-- Name: assets trigger_update_assets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_assets_updated_at BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.update_assets_updated_at();


--
-- Name: loan_offers trigger_update_loan_offers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_loan_offers_updated_at BEFORE UPDATE ON public.loan_offers FOR EACH ROW EXECUTE FUNCTION public.update_loan_offers_updated_at();


--
-- Name: loans trigger_update_loans_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_loans_updated_at BEFORE UPDATE ON public.loans FOR EACH ROW EXECUTE FUNCTION public.update_loans_updated_at();


--
-- Name: timeline_comments trigger_update_timeline_comment_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_timeline_comment_updated_at BEFORE UPDATE ON public.timeline_comments FOR EACH ROW EXECUTE FUNCTION public.update_timeline_comment_updated_at();


--
-- Name: timeline_events trigger_update_timeline_event_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_timeline_event_updated_at BEFORE UPDATE ON public.timeline_events FOR EACH ROW EXECUTE FUNCTION public.update_timeline_event_updated_at();


--
-- Name: user_ai_preferences trigger_update_user_ai_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_user_ai_preferences_updated_at BEFORE UPDATE ON public.user_ai_preferences FOR EACH ROW EXECUTE FUNCTION public.update_user_ai_preferences_updated_at();


--
-- Name: user_documents trigger_user_documents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_user_documents_updated_at BEFORE UPDATE ON public.user_documents FOR EACH ROW EXECUTE FUNCTION public.update_user_documents_updated_at();


--
-- Name: actors update_actors_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_actors_updated_at BEFORE UPDATE ON public.actors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ai_assistants update_ai_assistants_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ai_assistants_updated_at BEFORE UPDATE ON public.ai_assistants FOR EACH ROW EXECUTE FUNCTION public.update_ai_assistant_timestamp();


--
-- Name: events update_events_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_events_updated_at();


--
-- Name: group_event_rsvps update_group_event_rsvps_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_group_event_rsvps_updated_at BEFORE UPDATE ON public.group_event_rsvps FOR EACH ROW EXECUTE FUNCTION public.update_group_event_rsvps_updated_at();


--
-- Name: group_events update_group_events_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_group_events_updated_at BEFORE UPDATE ON public.group_events FOR EACH ROW EXECUTE FUNCTION public.update_group_events_updated_at();


--
-- Name: investments update_investments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_investments_updated_at BEFORE UPDATE ON public.investments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: loans update_loans_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_loans_updated_at BEFORE UPDATE ON public.loans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: timeline_interactions update_timeline_interactions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_timeline_interactions_updated_at BEFORE UPDATE ON public.timeline_interactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: transparency_scores update_transparency_scores_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_transparency_scores_updated_at BEFORE UPDATE ON public.transparency_scores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_causes update_user_causes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_causes_updated_at BEFORE UPDATE ON public.user_causes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_products update_user_products_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_products_updated_at BEFORE UPDATE ON public.user_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_services update_user_services_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_services_updated_at BEFORE UPDATE ON public.user_services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_api_keys user_api_keys_touch_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER user_api_keys_touch_updated_at BEFORE UPDATE ON public.user_api_keys FOR EACH ROW EXECUTE FUNCTION public.user_api_keys_touch_updated_at();


--
-- Name: actors actors_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.actors
    ADD CONSTRAINT actors_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- Name: ai_assistants ai_assistants_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_assistants
    ADD CONSTRAINT ai_assistants_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.actors(id) ON DELETE SET NULL;


--
-- Name: ai_assistants ai_assistants_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_assistants
    ADD CONSTRAINT ai_assistants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: ai_conversations ai_conversations_assistant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_conversations
    ADD CONSTRAINT ai_conversations_assistant_id_fkey FOREIGN KEY (assistant_id) REFERENCES public.ai_assistants(id) ON DELETE CASCADE;


--
-- Name: ai_conversations ai_conversations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_conversations
    ADD CONSTRAINT ai_conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: ai_creator_earnings ai_creator_earnings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_creator_earnings
    ADD CONSTRAINT ai_creator_earnings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: ai_creator_withdrawals ai_creator_withdrawals_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_creator_withdrawals
    ADD CONSTRAINT ai_creator_withdrawals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: ai_messages ai_messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_messages
    ADD CONSTRAINT ai_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.ai_conversations(id) ON DELETE CASCADE;


--
-- Name: asset_availability asset_availability_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_availability
    ADD CONSTRAINT asset_availability_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;


--
-- Name: asset_availability asset_availability_provider_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_availability
    ADD CONSTRAINT asset_availability_provider_actor_id_fkey FOREIGN KEY (provider_actor_id) REFERENCES public.actors(id) ON DELETE CASCADE;


--
-- Name: assets assets_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.actors(id) ON DELETE SET NULL;


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: availability_slots availability_slots_provider_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.availability_slots
    ADD CONSTRAINT availability_slots_provider_actor_id_fkey FOREIGN KEY (provider_actor_id) REFERENCES public.actors(id) ON DELETE CASCADE;


--
-- Name: availability_slots availability_slots_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.availability_slots
    ADD CONSTRAINT availability_slots_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.user_services(id) ON DELETE CASCADE;


--
-- Name: bookings bookings_customer_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_customer_actor_id_fkey FOREIGN KEY (customer_actor_id) REFERENCES public.actors(id) ON DELETE CASCADE;


--
-- Name: bookings bookings_customer_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_customer_user_id_fkey FOREIGN KEY (customer_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: bookings bookings_provider_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_provider_actor_id_fkey FOREIGN KEY (provider_actor_id) REFERENCES public.actors(id) ON DELETE CASCADE;


--
-- Name: cat_action_log cat_action_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat_action_log
    ADD CONSTRAINT cat_action_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: cat_credit_entries cat_credit_entries_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat_credit_entries
    ADD CONSTRAINT cat_credit_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: cat_credit_topups cat_credit_topups_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat_credit_topups
    ADD CONSTRAINT cat_credit_topups_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: cat_memories cat_memories_source_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat_memories
    ADD CONSTRAINT cat_memories_source_conversation_id_fkey FOREIGN KEY (source_conversation_id) REFERENCES public.cat_conversations(id) ON DELETE SET NULL;


--
-- Name: cat_memories cat_memories_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat_memories
    ADD CONSTRAINT cat_memories_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: cat_messages cat_messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat_messages
    ADD CONSTRAINT cat_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.cat_conversations(id) ON DELETE CASCADE;


--
-- Name: cat_messages cat_messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat_messages
    ADD CONSTRAINT cat_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: cat_pending_actions cat_pending_actions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat_pending_actions
    ADD CONSTRAINT cat_pending_actions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: channel_waitlist channel_waitlist_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_waitlist
    ADD CONSTRAINT channel_waitlist_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: circles circles_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.circles
    ADD CONSTRAINT circles_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.actors(id) ON DELETE CASCADE;


--
-- Name: contracts contracts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: contracts contracts_party_a_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_party_a_actor_id_fkey FOREIGN KEY (party_a_actor_id) REFERENCES public.actors(id) ON DELETE CASCADE;


--
-- Name: contracts contracts_party_b_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_party_b_actor_id_fkey FOREIGN KEY (party_b_actor_id) REFERENCES public.actors(id) ON DELETE CASCADE;


--
-- Name: contracts contracts_proposal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_proposal_id_fkey FOREIGN KEY (proposal_id) REFERENCES public.group_proposals(id) ON DELETE SET NULL;


--
-- Name: contributions contributions_payment_intent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contributions
    ADD CONSTRAINT contributions_payment_intent_id_fkey FOREIGN KEY (payment_intent_id) REFERENCES public.payment_intents(id);


--
-- Name: conversation_participants conversation_participants_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT conversation_participants_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: conversation_participants conversation_participants_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT conversation_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: conversations conversations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: conversations conversations_last_message_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_last_message_sender_id_fkey FOREIGN KEY (last_message_sender_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: entity_wallets entity_wallets_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_wallets
    ADD CONSTRAINT entity_wallets_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id) ON DELETE CASCADE;


--
-- Name: event_attendees event_attendees_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_attendees
    ADD CONSTRAINT event_attendees_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: event_attendees event_attendees_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_attendees
    ADD CONSTRAINT event_attendees_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: events events_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.actors(id) ON DELETE SET NULL;


--
-- Name: follows follows_follower_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: follows follows_following_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_following_id_fkey FOREIGN KEY (following_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: github_repo_cache github_repo_cache_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.github_repo_cache
    ADD CONSTRAINT github_repo_cache_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: group_activities group_activities_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_activities
    ADD CONSTRAINT group_activities_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- Name: group_activities group_activities_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_activities
    ADD CONSTRAINT group_activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: group_event_rsvps group_event_rsvps_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_event_rsvps
    ADD CONSTRAINT group_event_rsvps_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.group_events(id) ON DELETE CASCADE;


--
-- Name: group_event_rsvps group_event_rsvps_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_event_rsvps
    ADD CONSTRAINT group_event_rsvps_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: group_events group_events_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_events
    ADD CONSTRAINT group_events_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: group_events group_events_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_events
    ADD CONSTRAINT group_events_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- Name: group_features group_features_enabled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_features
    ADD CONSTRAINT group_features_enabled_by_fkey FOREIGN KEY (enabled_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: group_features group_features_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_features
    ADD CONSTRAINT group_features_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- Name: group_invitations group_invitations_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_invitations
    ADD CONSTRAINT group_invitations_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- Name: group_invitations group_invitations_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_invitations
    ADD CONSTRAINT group_invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: group_invitations group_invitations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_invitations
    ADD CONSTRAINT group_invitations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: group_members group_members_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- Name: group_members group_members_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: group_members group_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: group_proposals group_proposals_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_proposals
    ADD CONSTRAINT group_proposals_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- Name: group_proposals group_proposals_proposer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_proposals
    ADD CONSTRAINT group_proposals_proposer_id_fkey FOREIGN KEY (proposer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: group_votes group_votes_proposal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_votes
    ADD CONSTRAINT group_votes_proposal_id_fkey FOREIGN KEY (proposal_id) REFERENCES public.group_proposals(id) ON DELETE CASCADE;


--
-- Name: group_votes group_votes_voter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_votes
    ADD CONSTRAINT group_votes_voter_id_fkey FOREIGN KEY (voter_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: group_wallets group_wallets_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_wallets
    ADD CONSTRAINT group_wallets_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: group_wallets group_wallets_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_wallets
    ADD CONSTRAINT group_wallets_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- Name: idempotency_results idempotency_results_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.idempotency_results
    ADD CONSTRAINT idempotency_results_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: integration_keys integration_keys_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_keys
    ADD CONSTRAINT integration_keys_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.actors(id) ON DELETE CASCADE;


--
-- Name: integration_keys integration_keys_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_keys
    ADD CONSTRAINT integration_keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: investments investments_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investments
    ADD CONSTRAINT investments_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.actors(id) ON DELETE CASCADE;


--
-- Name: investments investments_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investments
    ADD CONSTRAINT investments_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id) ON DELETE SET NULL;


--
-- Name: loan_collateral loan_collateral_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loan_collateral
    ADD CONSTRAINT loan_collateral_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: loan_offers loan_offers_loan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loan_offers
    ADD CONSTRAINT loan_offers_loan_id_fkey FOREIGN KEY (loan_id) REFERENCES public.loans(id) ON DELETE CASCADE;


--
-- Name: loan_offers loan_offers_offerer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loan_offers
    ADD CONSTRAINT loan_offers_offerer_id_fkey FOREIGN KEY (offerer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: loan_payments loan_payments_loan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loan_payments
    ADD CONSTRAINT loan_payments_loan_id_fkey FOREIGN KEY (loan_id) REFERENCES public.loans(id) ON DELETE CASCADE;


--
-- Name: loan_payments loan_payments_offer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loan_payments
    ADD CONSTRAINT loan_payments_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES public.loan_offers(id) ON DELETE SET NULL;


--
-- Name: loan_payments loan_payments_payer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loan_payments
    ADD CONSTRAINT loan_payments_payer_id_fkey FOREIGN KEY (payer_id) REFERENCES public.profiles(id);


--
-- Name: loan_payments loan_payments_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loan_payments
    ADD CONSTRAINT loan_payments_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.profiles(id);


--
-- Name: loans loans_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loans
    ADD CONSTRAINT loans_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.actors(id) ON DELETE SET NULL;


--
-- Name: loans loans_loan_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loans
    ADD CONSTRAINT loans_loan_category_id_fkey FOREIGN KEY (loan_category_id) REFERENCES public.loan_categories(id);


--
-- Name: loans loans_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loans
    ADD CONSTRAINT loans_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: message_read_receipts message_read_receipts_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_read_receipts
    ADD CONSTRAINT message_read_receipts_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;


--
-- Name: message_read_receipts message_read_receipts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_read_receipts
    ADD CONSTRAINT message_read_receipts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: messages messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: notification_email_log notification_email_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_email_log
    ADD CONSTRAINT notification_email_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: orders orders_buyer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES auth.users(id);


--
-- Name: orders orders_payment_intent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_payment_intent_id_fkey FOREIGN KEY (payment_intent_id) REFERENCES public.payment_intents(id);


--
-- Name: orders orders_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES auth.users(id);


--
-- Name: orders orders_shipping_address_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_shipping_address_id_fkey FOREIGN KEY (shipping_address_id) REFERENCES public.shipping_addresses(id);


--
-- Name: platform_api_usage platform_api_usage_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_api_usage
    ADD CONSTRAINT platform_api_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: post_visibility post_visibility_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_visibility
    ADD CONSTRAINT post_visibility_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.timeline_events(id) ON DELETE CASCADE;


--
-- Name: project_favorites project_favorites_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_favorites
    ADD CONSTRAINT project_favorites_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_media project_media_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_media
    ADD CONSTRAINT project_media_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_roles project_roles_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_roles
    ADD CONSTRAINT project_roles_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_support project_support_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_support
    ADD CONSTRAINT project_support_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_support_stats project_support_stats_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_support_stats
    ADD CONSTRAINT project_support_stats_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_support project_support_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_support
    ADD CONSTRAINT project_support_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: project_updates project_updates_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_updates
    ADD CONSTRAINT project_updates_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: projects projects_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.actors(id) ON DELETE SET NULL;


--
-- Name: projects projects_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE SET NULL;


--
-- Name: research_contributions research_contributions_research_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_contributions
    ADD CONSTRAINT research_contributions_research_entity_id_fkey FOREIGN KEY (research_entity_id) REFERENCES public.research_entities(id) ON DELETE CASCADE;


--
-- Name: research_contributions research_contributions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_contributions
    ADD CONSTRAINT research_contributions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: research_entities research_entities_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_entities
    ADD CONSTRAINT research_entities_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.actors(id) ON DELETE SET NULL;


--
-- Name: research_entities research_entities_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_entities
    ADD CONSTRAINT research_entities_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: research_progress_updates research_progress_updates_research_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_progress_updates
    ADD CONSTRAINT research_progress_updates_research_entity_id_fkey FOREIGN KEY (research_entity_id) REFERENCES public.research_entities(id) ON DELETE CASCADE;


--
-- Name: research_progress_updates research_progress_updates_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_progress_updates
    ADD CONSTRAINT research_progress_updates_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: research_votes research_votes_research_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_votes
    ADD CONSTRAINT research_votes_research_entity_id_fkey FOREIGN KEY (research_entity_id) REFERENCES public.research_entities(id) ON DELETE CASCADE;


--
-- Name: research_votes research_votes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_votes
    ADD CONSTRAINT research_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: shipping_addresses shipping_addresses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_addresses
    ADD CONSTRAINT shipping_addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: stakeholder_relationships stakeholder_relationships_from_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stakeholder_relationships
    ADD CONSTRAINT stakeholder_relationships_from_project_id_fkey FOREIGN KEY (from_project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: stakeholder_relationships stakeholder_relationships_owner_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stakeholder_relationships
    ADD CONSTRAINT stakeholder_relationships_owner_actor_id_fkey FOREIGN KEY (owner_actor_id) REFERENCES public.actors(id) ON DELETE CASCADE;


--
-- Name: stakeholder_relationships stakeholder_relationships_to_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stakeholder_relationships
    ADD CONSTRAINT stakeholder_relationships_to_actor_id_fkey FOREIGN KEY (to_actor_id) REFERENCES public.actors(id) ON DELETE CASCADE;


--
-- Name: stakeholder_relationships stakeholder_relationships_to_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stakeholder_relationships
    ADD CONSTRAINT stakeholder_relationships_to_project_id_fkey FOREIGN KEY (to_project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: task_attention_flags task_attention_flags_resolved_by_completion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_attention_flags
    ADD CONSTRAINT task_attention_flags_resolved_by_completion_id_fkey FOREIGN KEY (resolved_by_completion_id) REFERENCES public.task_completions(id);


--
-- Name: task_attention_flags task_attention_flags_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_attention_flags
    ADD CONSTRAINT task_attention_flags_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES auth.users(id);


--
-- Name: task_attention_flags task_attention_flags_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_attention_flags
    ADD CONSTRAINT task_attention_flags_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: task_completions task_completions_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_completions
    ADD CONSTRAINT task_completions_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: task_projects task_projects_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_projects
    ADD CONSTRAINT task_projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: task_requests task_requests_completion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_requests
    ADD CONSTRAINT task_requests_completion_id_fkey FOREIGN KEY (completion_id) REFERENCES public.task_completions(id);


--
-- Name: task_requests task_requests_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_requests
    ADD CONSTRAINT task_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES auth.users(id);


--
-- Name: task_requests task_requests_requested_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_requests
    ADD CONSTRAINT task_requests_requested_user_id_fkey FOREIGN KEY (requested_user_id) REFERENCES auth.users(id);


--
-- Name: task_requests task_requests_responded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_requests
    ADD CONSTRAINT task_requests_responded_by_fkey FOREIGN KEY (responded_by) REFERENCES auth.users(id);


--
-- Name: task_requests task_requests_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_requests
    ADD CONSTRAINT task_requests_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.task_projects(id) ON DELETE SET NULL;


--
-- Name: timeline_comments timeline_comments_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timeline_comments
    ADD CONSTRAINT timeline_comments_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.timeline_events(id) ON DELETE CASCADE;


--
-- Name: timeline_comments timeline_comments_parent_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timeline_comments
    ADD CONSTRAINT timeline_comments_parent_comment_id_fkey FOREIGN KEY (parent_comment_id) REFERENCES public.timeline_comments(id) ON DELETE CASCADE;


--
-- Name: timeline_comments timeline_comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timeline_comments
    ADD CONSTRAINT timeline_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: timeline_dislikes timeline_dislikes_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timeline_dislikes
    ADD CONSTRAINT timeline_dislikes_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.timeline_events(id) ON DELETE CASCADE;


--
-- Name: timeline_dislikes timeline_dislikes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timeline_dislikes
    ADD CONSTRAINT timeline_dislikes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: timeline_event_stats timeline_event_stats_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timeline_event_stats
    ADD CONSTRAINT timeline_event_stats_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.timeline_events(id) ON DELETE CASCADE;


--
-- Name: timeline_event_visibility timeline_event_visibility_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timeline_event_visibility
    ADD CONSTRAINT timeline_event_visibility_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.timeline_events(id) ON DELETE CASCADE;


--
-- Name: timeline_events timeline_events_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timeline_events
    ADD CONSTRAINT timeline_events_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: timeline_events timeline_events_parent_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timeline_events
    ADD CONSTRAINT timeline_events_parent_event_id_fkey FOREIGN KEY (parent_event_id) REFERENCES public.timeline_events(id) ON DELETE CASCADE;


--
-- Name: timeline_events timeline_events_thread_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timeline_events
    ADD CONSTRAINT timeline_events_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.timeline_events(id) ON DELETE CASCADE;


--
-- Name: timeline_interactions timeline_interactions_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timeline_interactions
    ADD CONSTRAINT timeline_interactions_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.timeline_events(id) ON DELETE CASCADE;


--
-- Name: timeline_interactions timeline_interactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timeline_interactions
    ADD CONSTRAINT timeline_interactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: timeline_likes timeline_likes_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timeline_likes
    ADD CONSTRAINT timeline_likes_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.timeline_events(id) ON DELETE CASCADE;


--
-- Name: timeline_likes timeline_likes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timeline_likes
    ADD CONSTRAINT timeline_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: timeline_shares timeline_shares_original_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timeline_shares
    ADD CONSTRAINT timeline_shares_original_event_id_fkey FOREIGN KEY (original_event_id) REFERENCES public.timeline_events(id) ON DELETE CASCADE;


--
-- Name: timeline_shares timeline_shares_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timeline_shares
    ADD CONSTRAINT timeline_shares_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: typing_indicators typing_indicators_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.typing_indicators
    ADD CONSTRAINT typing_indicators_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: typing_indicators typing_indicators_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.typing_indicators
    ADD CONSTRAINT typing_indicators_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_api_keys user_api_keys_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_api_keys
    ADD CONSTRAINT user_api_keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_causes user_causes_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_causes
    ADD CONSTRAINT user_causes_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.actors(id) ON DELETE SET NULL;


--
-- Name: user_documents user_documents_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_documents
    ADD CONSTRAINT user_documents_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.actors(id) ON DELETE CASCADE;


--
-- Name: user_economic_profile user_economic_profile_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_economic_profile
    ADD CONSTRAINT user_economic_profile_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_presence user_presence_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_presence
    ADD CONSTRAINT user_presence_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_products user_products_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_products
    ADD CONSTRAINT user_products_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.actors(id) ON DELETE SET NULL;


--
-- Name: user_products user_products_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_products
    ADD CONSTRAINT user_products_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE SET NULL;


--
-- Name: user_services user_services_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_services
    ADD CONSTRAINT user_services_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.actors(id) ON DELETE SET NULL;


--
-- Name: user_services user_services_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_services
    ADD CONSTRAINT user_services_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE SET NULL;


--
-- Name: wallets wallets_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: wallets wallets_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: webhook_deliveries webhook_deliveries_endpoint_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_deliveries
    ADD CONSTRAINT webhook_deliveries_endpoint_id_fkey FOREIGN KEY (endpoint_id) REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE;


--
-- Name: webhook_endpoints webhook_endpoints_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_endpoints
    ADD CONSTRAINT webhook_endpoints_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.actors(id) ON DELETE CASCADE;


--
-- Name: webhook_endpoints webhook_endpoints_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_endpoints
    ADD CONSTRAINT webhook_endpoints_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: wishlist_contributions wishlist_contributions_contributor_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlist_contributions
    ADD CONSTRAINT wishlist_contributions_contributor_actor_id_fkey FOREIGN KEY (contributor_actor_id) REFERENCES public.actors(id) ON DELETE SET NULL;


--
-- Name: wishlist_contributions wishlist_contributions_wishlist_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlist_contributions
    ADD CONSTRAINT wishlist_contributions_wishlist_item_id_fkey FOREIGN KEY (wishlist_item_id) REFERENCES public.wishlist_items(id) ON DELETE CASCADE;


--
-- Name: wishlist_feedback wishlist_feedback_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlist_feedback
    ADD CONSTRAINT wishlist_feedback_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.actors(id) ON DELETE CASCADE;


--
-- Name: wishlist_feedback wishlist_feedback_fulfillment_proof_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlist_feedback
    ADD CONSTRAINT wishlist_feedback_fulfillment_proof_id_fkey FOREIGN KEY (fulfillment_proof_id) REFERENCES public.wishlist_fulfillment_proofs(id) ON DELETE CASCADE;


--
-- Name: wishlist_feedback wishlist_feedback_wishlist_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlist_feedback
    ADD CONSTRAINT wishlist_feedback_wishlist_item_id_fkey FOREIGN KEY (wishlist_item_id) REFERENCES public.wishlist_items(id) ON DELETE CASCADE;


--
-- Name: wishlist_fulfillment_proofs wishlist_fulfillment_proofs_wishlist_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlist_fulfillment_proofs
    ADD CONSTRAINT wishlist_fulfillment_proofs_wishlist_item_id_fkey FOREIGN KEY (wishlist_item_id) REFERENCES public.wishlist_items(id) ON DELETE CASCADE;


--
-- Name: wishlist_items wishlist_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlist_items
    ADD CONSTRAINT wishlist_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.user_products(id) ON DELETE SET NULL;


--
-- Name: wishlist_items wishlist_items_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlist_items
    ADD CONSTRAINT wishlist_items_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.user_services(id) ON DELETE SET NULL;


--
-- Name: wishlist_items wishlist_items_wishlist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlist_items
    ADD CONSTRAINT wishlist_items_wishlist_id_fkey FOREIGN KEY (wishlist_id) REFERENCES public.wishlists(id) ON DELETE CASCADE;


--
-- Name: wishlists wishlists_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlists
    ADD CONSTRAINT wishlists_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.actors(id) ON DELETE CASCADE;


--
-- Name: ai_assistants AI assistants viewable if public or owned; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "AI assistants viewable if public or owned" ON public.ai_assistants FOR SELECT USING ((((status = 'active'::public.ai_assistant_status) AND (is_public = true)) OR (( SELECT auth.uid() AS uid) = user_id)));


--
-- Name: actors Actors are viewable by appropriate users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Actors are viewable by appropriate users" ON public.actors FOR SELECT USING (((actor_type = 'user'::text) OR ((actor_type = 'group'::text) AND ((group_id IN ( SELECT groups.id
   FROM public.groups
  WHERE (groups.is_public = true))) OR (group_id IN ( SELECT group_members.group_id
   FROM public.group_members
  WHERE (group_members.user_id = ( SELECT auth.uid() AS uid))))))));


--
-- Name: actors Actors can be created by users or group admins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Actors can be created by users or group admins" ON public.actors FOR INSERT WITH CHECK ((((actor_type = 'user'::text) AND (user_id = ( SELECT auth.uid() AS uid))) OR ((actor_type = 'group'::text) AND (group_id IN ( SELECT group_members.group_id
   FROM public.group_members
  WHERE ((group_members.user_id = ( SELECT auth.uid() AS uid)) AND (group_members.role = ANY (ARRAY['founder'::text, 'admin'::text]))))))));


--
-- Name: group_invitations Admins can create invitations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can create invitations" ON public.group_invitations FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.group_members
  WHERE ((group_members.group_id = group_invitations.group_id) AND (group_members.user_id = auth.uid()) AND (group_members.role = ANY (ARRAY['founder'::text, 'admin'::text]))))));


--
-- Name: group_invitations Admins can revoke invitations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can revoke invitations" ON public.group_invitations FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.group_members
  WHERE ((group_members.group_id = group_invitations.group_id) AND (group_members.user_id = auth.uid()) AND (group_members.role = ANY (ARRAY['founder'::text, 'admin'::text]))))));


--
-- Name: group_invitations Admins can view group invitations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view group invitations" ON public.group_invitations FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.group_members
  WHERE ((group_members.group_id = group_invitations.group_id) AND (group_members.user_id = auth.uid()) AND (group_members.role = ANY (ARRAY['founder'::text, 'admin'::text]))))));


--
-- Name: asset_availability Anyone can view asset availability; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view asset availability" ON public.asset_availability FOR SELECT USING ((is_available = true));


--
-- Name: availability_slots Anyone can view available slots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view available slots" ON public.availability_slots FOR SELECT USING ((is_available = true));


--
-- Name: timeline_dislikes Anyone can view dislikes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view dislikes" ON public.timeline_dislikes FOR SELECT USING (true);


--
-- Name: timeline_event_stats Anyone can view event stats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view event stats" ON public.timeline_event_stats FOR SELECT USING (true);


--
-- Name: timeline_likes Anyone can view likes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view likes" ON public.timeline_likes FOR SELECT USING (true);


--
-- Name: timeline_event_visibility Anyone can view timeline event visibility; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view timeline event visibility" ON public.timeline_event_visibility FOR SELECT USING (true);


--
-- Name: ai_conversations Assistant owners can view conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Assistant owners can view conversations" ON public.ai_conversations FOR SELECT USING ((assistant_id IN ( SELECT ai_assistants.id
   FROM public.ai_assistants
  WHERE (ai_assistants.user_id = auth.uid()))));


--
-- Name: ai_messages Assistant owners can view messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Assistant owners can view messages" ON public.ai_messages FOR SELECT USING ((conversation_id IN ( SELECT c.id
   FROM (public.ai_conversations c
     JOIN public.ai_assistants a ON ((c.assistant_id = a.id)))
  WHERE (a.user_id = auth.uid()))));


--
-- Name: groups Authenticated users can create groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create groups" ON public.groups FOR INSERT WITH CHECK ((( SELECT auth.uid() AS uid) IS NOT NULL));


--
-- Name: task_projects Authenticated users can create projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create projects" ON public.task_projects FOR INSERT WITH CHECK (((( SELECT auth.uid() AS uid) IS NOT NULL) AND (created_by = ( SELECT auth.uid() AS uid))));


--
-- Name: project_support Authenticated users can create support; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create support" ON public.project_support FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: contributions Authenticated users create contributions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users create contributions" ON public.contributions FOR INSERT WITH CHECK ((contributor_id = ( SELECT auth.uid() AS uid)));


--
-- Name: orders Authenticated users create orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users create orders" ON public.orders FOR INSERT WITH CHECK ((buyer_id = ( SELECT auth.uid() AS uid)));


--
-- Name: payment_intents Authenticated users create payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users create payments" ON public.payment_intents FOR INSERT WITH CHECK ((buyer_id = ( SELECT auth.uid() AS uid)));


--
-- Name: payment_intents Buyers update own payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Buyers update own payments" ON public.payment_intents FOR UPDATE USING ((buyer_id = ( SELECT auth.uid() AS uid)));


--
-- Name: contributions Contributions viewable by contributors, owners, or if public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Contributions viewable by contributors, owners, or if public" ON public.contributions FOR SELECT USING (((is_anonymous = false) OR (contributor_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.actors a
  WHERE ((a.user_id = ( SELECT auth.uid() AS uid)) AND (((contributions.entity_type = 'project'::text) AND (EXISTS ( SELECT 1
           FROM public.projects
          WHERE ((projects.id = contributions.entity_id) AND (projects.actor_id = a.id))))) OR ((contributions.entity_type = 'cause'::text) AND (EXISTS ( SELECT 1
           FROM public.user_causes
          WHERE ((user_causes.id = contributions.entity_id) AND (user_causes.actor_id = a.id))))) OR ((contributions.entity_type = 'research'::text) AND (EXISTS ( SELECT 1
           FROM public.research_entities
          WHERE ((research_entities.id = contributions.entity_id) AND (research_entities.user_id = ( SELECT auth.uid() AS uid))))))))))));


--
-- Name: messages Conversation participants can send messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Conversation participants can send messages" ON public.messages FOR INSERT WITH CHECK (((( SELECT auth.uid() AS uid) = sender_id) AND (EXISTS ( SELECT 1
   FROM public.conversation_participants cp
  WHERE ((cp.conversation_id = messages.conversation_id) AND (cp.user_id = ( SELECT auth.uid() AS uid)) AND (cp.is_active = true))))));


--
-- Name: conversations Conversation participants can update conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Conversation participants can update conversations" ON public.conversations FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.conversation_participants cp
  WHERE ((cp.conversation_id = conversations.id) AND (cp.user_id = ( SELECT auth.uid() AS uid)) AND (cp.is_active = true)))));


--
-- Name: messages Conversation participants can view messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Conversation participants can view messages" ON public.messages FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.conversation_participants cp
  WHERE ((cp.conversation_id = messages.conversation_id) AND (cp.user_id = ( SELECT auth.uid() AS uid)) AND (cp.is_active = true)))));


--
-- Name: message_read_receipts Conversation participants can view read receipts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Conversation participants can view read receipts" ON public.message_read_receipts FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.conversation_participants cp
  WHERE ((cp.conversation_id = ( SELECT m.conversation_id
           FROM public.messages m
          WHERE (m.id = message_read_receipts.message_id))) AND (cp.user_id = ( SELECT auth.uid() AS uid)) AND (cp.is_active = true)))));


--
-- Name: task_projects Creator can update projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Creator can update projects" ON public.task_projects FOR UPDATE USING ((created_by = ( SELECT auth.uid() AS uid)));


--
-- Name: group_events Creators and admins can delete events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Creators and admins can delete events" ON public.group_events FOR DELETE USING (((creator_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.group_members
  WHERE ((group_members.group_id = group_events.group_id) AND (group_members.user_id = ( SELECT auth.uid() AS uid)) AND (group_members.role = ANY (ARRAY['founder'::text, 'admin'::text])))))));


--
-- Name: group_events Creators and admins can update events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Creators and admins can update events" ON public.group_events FOR UPDATE USING (((creator_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.group_members
  WHERE ((group_members.group_id = group_events.group_id) AND (group_members.user_id = ( SELECT auth.uid() AS uid)) AND (group_members.role = ANY (ARRAY['founder'::text, 'admin'::text])))))));


--
-- Name: bookings Customers can create bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers can create bookings" ON public.bookings FOR INSERT WITH CHECK ((customer_user_id = auth.uid()));


--
-- Name: bookings Customers can update their bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers can update their bookings" ON public.bookings FOR UPDATE USING (((customer_user_id = auth.uid()) AND (status = ANY (ARRAY['pending'::text, 'confirmed'::text])))) WITH CHECK ((customer_user_id = auth.uid()));


--
-- Name: bookings Customers can view their bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers can view their bookings" ON public.bookings FOR SELECT USING ((customer_user_id = auth.uid()));


--
-- Name: user_documents Documents viewable if public or owned; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Documents viewable if public or owned" ON public.user_documents FOR SELECT USING (((visibility = 'public'::public.document_visibility) OR (actor_id IN ( SELECT actors.id
   FROM public.actors
  WHERE (actors.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: entity_wallets Entity wallet links viewable by creator or wallet owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Entity wallet links viewable by creator or wallet owner" ON public.entity_wallets FOR SELECT USING (((created_by = ( SELECT auth.uid() AS uid)) OR (wallet_id IN ( SELECT wallets.id
   FROM public.wallets
  WHERE (wallets.profile_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: events Events viewable if published or owned; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Events viewable if published or owned" ON public.events FOR SELECT USING (((status = ANY (ARRAY['published'::text, 'open'::text, 'full'::text, 'ongoing'::text, 'completed'::text])) OR (( SELECT auth.uid() AS uid) = user_id)));


--
-- Name: groups Founders can delete groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Founders can delete groups" ON public.groups FOR DELETE USING ((public.is_group_member(id, auth.uid()) AND (public.get_user_group_role(id, auth.uid()) = 'founder'::text)));


--
-- Name: group_activities Group members can create activities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Group members can create activities" ON public.group_activities FOR INSERT WITH CHECK (((group_id IN ( SELECT gm.group_id
   FROM public.group_members gm
  WHERE (gm.user_id = ( SELECT auth.uid() AS uid)))) AND (user_id = ( SELECT auth.uid() AS uid))));


--
-- Name: group_activities Group members can view activities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Group members can view activities" ON public.group_activities FOR SELECT USING ((group_id IN ( SELECT gm.group_id
   FROM public.group_members gm
  WHERE (gm.user_id = ( SELECT auth.uid() AS uid)))));


--
-- Name: investments Investments viewable if public or owned; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Investments viewable if public or owned" ON public.investments FOR SELECT USING ((((is_public = true) AND (status = ANY (ARRAY['open'::text, 'funded'::text, 'active'::text]))) OR (actor_id IN ( SELECT actors.id
   FROM public.actors
  WHERE (actors.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: loan_categories Loan categories are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Loan categories are viewable by everyone" ON public.loan_categories FOR SELECT USING (true);


--
-- Name: loan_offers Loan offers updatable by loan owner or offerer; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Loan offers updatable by loan owner or offerer" ON public.loan_offers FOR UPDATE USING (((( SELECT auth.uid() AS uid) IN ( SELECT loans.user_id
   FROM public.loans
  WHERE (loans.id = loan_offers.loan_id))) OR (( SELECT auth.uid() AS uid) = offerer_id)));


--
-- Name: loan_offers Loan owners and offerers can view offers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Loan owners and offerers can view offers" ON public.loan_offers FOR SELECT USING ((( SELECT auth.uid() AS uid) IN ( SELECT loans.user_id
   FROM public.loans
  WHERE (loans.id = loan_offers.loan_id)
UNION
 SELECT loan_offers_1.offerer_id
   FROM public.loan_offers loan_offers_1
  WHERE (loan_offers_1.id = loan_offers_1.id))));


--
-- Name: loans Loans viewable if public or owned; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Loans viewable if public or owned" ON public.loans FOR SELECT USING (((is_public = true) OR (( SELECT auth.uid() AS uid) = user_id)));


--
-- Name: group_events Members can create events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members can create events" ON public.group_events FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.group_members
  WHERE ((group_members.group_id = group_events.group_id) AND (group_members.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: group_proposals Members can create proposals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members can create proposals" ON public.group_proposals FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.group_members
  WHERE ((group_members.group_id = group_proposals.group_id) AND (group_members.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: groups Members can update their groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members can update their groups" ON public.groups FOR UPDATE USING ((public.is_group_member(id, auth.uid()) AND (public.get_user_group_role(id, auth.uid()) = ANY (ARRAY['founder'::text, 'admin'::text]))));


--
-- Name: group_proposals Members can view proposals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members can view proposals" ON public.group_proposals FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.group_members
  WHERE ((group_members.group_id = group_proposals.group_id) AND (group_members.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: groups Members can view their groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members can view their groups" ON public.groups FOR SELECT USING (public.is_group_member(id, auth.uid()));


--
-- Name: group_votes Members can view votes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members can view votes" ON public.group_votes FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.group_members
  WHERE ((group_members.group_id = ( SELECT group_proposals.group_id
           FROM public.group_proposals
          WHERE (group_proposals.id = group_votes.proposal_id))) AND (group_members.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: group_votes Members can vote; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members can vote" ON public.group_votes FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.group_members
  WHERE ((group_members.group_id = ( SELECT group_proposals.group_id
           FROM public.group_proposals
          WHERE (group_proposals.id = group_votes.proposal_id))) AND (group_members.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: messages Message senders can update their messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Message senders can update their messages" ON public.messages FOR UPDATE USING (((( SELECT auth.uid() AS uid) = sender_id) AND (EXISTS ( SELECT 1
   FROM public.conversation_participants cp
  WHERE ((cp.conversation_id = messages.conversation_id) AND (cp.user_id = ( SELECT auth.uid() AS uid)) AND (cp.is_active = true))))));


--
-- Name: project_support_stats Only system can update stats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only system can update stats" ON public.project_support_stats FOR UPDATE USING (false);


--
-- Name: orders Orders updatable by buyer or seller; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Orders updatable by buyer or seller" ON public.orders FOR UPDATE USING (((buyer_id = ( SELECT auth.uid() AS uid)) OR (seller_id = ( SELECT auth.uid() AS uid))));


--
-- Name: orders Orders viewable by buyer or seller; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Orders viewable by buyer or seller" ON public.orders FOR SELECT USING (((buyer_id = ( SELECT auth.uid() AS uid)) OR (seller_id = ( SELECT auth.uid() AS uid))));


--
-- Name: investments Owner can create investments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owner can create investments" ON public.investments FOR INSERT WITH CHECK ((actor_id IN ( SELECT actors.id
   FROM public.actors
  WHERE (actors.user_id = ( SELECT auth.uid() AS uid)))));


--
-- Name: investments Owner can delete draft investments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owner can delete draft investments" ON public.investments FOR DELETE USING (((actor_id IN ( SELECT actors.id
   FROM public.actors
  WHERE (actors.user_id = ( SELECT auth.uid() AS uid)))) AND (status = 'draft'::text)));


--
-- Name: investments Owner can update own investments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owner can update own investments" ON public.investments FOR UPDATE USING ((actor_id IN ( SELECT actors.id
   FROM public.actors
  WHERE (actors.user_id = ( SELECT auth.uid() AS uid)))));


--
-- Name: payment_intents Payment intents viewable by buyer or seller; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Payment intents viewable by buyer or seller" ON public.payment_intents FOR SELECT USING (((buyer_id = ( SELECT auth.uid() AS uid)) OR (seller_id = ( SELECT auth.uid() AS uid))));


--
-- Name: loan_payments Payment parties can view payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Payment parties can view payments" ON public.loan_payments FOR SELECT USING (((( SELECT auth.uid() AS uid) = payer_id) OR (( SELECT auth.uid() AS uid) = recipient_id)));


--
-- Name: user_presence Presence is public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Presence is public" ON public.user_presence FOR SELECT USING (true);


--
-- Name: group_proposals Proposers can update their proposals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Proposers can update their proposals" ON public.group_proposals FOR UPDATE USING ((proposer_id = ( SELECT auth.uid() AS uid)));


--
-- Name: asset_availability Providers can manage asset availability; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Providers can manage asset availability" ON public.asset_availability USING ((provider_actor_id IN ( SELECT actors.id
   FROM public.actors
  WHERE (actors.user_id = auth.uid()))));


--
-- Name: availability_slots Providers can manage their slots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Providers can manage their slots" ON public.availability_slots USING ((provider_actor_id IN ( SELECT actors.id
   FROM public.actors
  WHERE (actors.user_id = auth.uid()))));


--
-- Name: bookings Providers can update bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Providers can update bookings" ON public.bookings FOR UPDATE USING ((provider_actor_id IN ( SELECT actors.id
   FROM public.actors
  WHERE (actors.user_id = auth.uid()))));


--
-- Name: bookings Providers can view their bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Providers can view their bookings" ON public.bookings FOR SELECT USING ((provider_actor_id IN ( SELECT actors.id
   FROM public.actors
  WHERE (actors.user_id = auth.uid()))));


--
-- Name: group_proposals Public can view public proposals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view public proposals" ON public.group_proposals FOR SELECT USING ((is_public = true));


--
-- Name: user_causes Public causes are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public causes are viewable by everyone" ON public.user_causes FOR SELECT USING (((status = 'active'::text) OR (actor_id IN ( SELECT actors.id
   FROM public.actors
  WHERE (actors.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: group_events Public events are viewable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public events are viewable" ON public.group_events FOR SELECT USING (((is_public = true) OR (EXISTS ( SELECT 1
   FROM public.group_members
  WHERE ((group_members.group_id = group_events.group_id) AND (group_members.user_id = ( SELECT auth.uid() AS uid)))))));


--
-- Name: follows Public follows are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public follows are viewable by everyone" ON public.follows FOR SELECT USING (true);


--
-- Name: profiles Public profiles are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);


--
-- Name: project_support Public support is viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public support is viewable by everyone" ON public.project_support FOR SELECT USING (((is_anonymous = false) OR (user_id = auth.uid())));


--
-- Name: research_entities Research entities viewable if public or owned; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Research entities viewable if public or owned" ON public.research_entities FOR SELECT USING (((is_public = true) OR (( SELECT auth.uid() AS uid) = user_id)));


--
-- Name: task_attention_flags Staff can create attention flags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can create attention flags" ON public.task_attention_flags FOR INSERT WITH CHECK (((( SELECT auth.uid() AS uid) IS NOT NULL) AND (flagged_by = ( SELECT auth.uid() AS uid))));


--
-- Name: task_completions Staff can create completions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can create completions" ON public.task_completions FOR INSERT WITH CHECK (((( SELECT auth.uid() AS uid) IS NOT NULL) AND (completed_by = ( SELECT auth.uid() AS uid))));


--
-- Name: task_requests Staff can create requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can create requests" ON public.task_requests FOR INSERT WITH CHECK (((( SELECT auth.uid() AS uid) IS NOT NULL) AND (requested_by = ( SELECT auth.uid() AS uid))));


--
-- Name: task_attention_flags Staff can update attention flags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can update attention flags" ON public.task_attention_flags FOR UPDATE USING ((( SELECT auth.uid() AS uid) IS NOT NULL));


--
-- Name: task_attention_flags Staff can view attention flags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view attention flags" ON public.task_attention_flags FOR SELECT USING ((( SELECT auth.uid() AS uid) IS NOT NULL));


--
-- Name: task_completions Staff can view completions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view completions" ON public.task_completions FOR SELECT USING ((( SELECT auth.uid() AS uid) IS NOT NULL));


--
-- Name: task_projects Staff can view projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view projects" ON public.task_projects FOR SELECT USING ((( SELECT auth.uid() AS uid) IS NOT NULL));


--
-- Name: project_support_stats Support stats are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Support stats are viewable by everyone" ON public.project_support_stats FOR SELECT USING (true);


--
-- Name: timeline_comments Timeline comments viewable if not deleted or own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Timeline comments viewable if not deleted or own" ON public.timeline_comments FOR SELECT USING (((is_deleted = false) OR (( SELECT auth.uid() AS uid) = user_id)));


--
-- Name: timeline_events Timeline events viewable by visibility rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Timeline events viewable by visibility rules" ON public.timeline_events FOR SELECT USING (((NOT is_deleted) AND ((visibility = 'public'::text) OR ((visibility = 'followers'::text) AND (EXISTS ( SELECT 1
   FROM public.follows
  WHERE ((follows.follower_id = ( SELECT auth.uid() AS uid)) AND (follows.following_id = timeline_events.actor_id))))) OR ((visibility = 'private'::text) AND (actor_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: timeline_interactions Timeline interactions are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Timeline interactions are viewable by everyone" ON public.timeline_interactions FOR SELECT USING (true);


--
-- Name: timeline_shares Timeline shares viewable by visibility rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Timeline shares viewable by visibility rules" ON public.timeline_shares FOR SELECT USING (((visibility = 'public'::text) OR ((visibility = 'followers'::text) AND (EXISTS ( SELECT 1
   FROM public.follows
  WHERE ((follows.follower_id = ( SELECT auth.uid() AS uid)) AND (follows.following_id = timeline_shares.user_id))))) OR ((visibility = 'private'::text) AND (( SELECT auth.uid() AS uid) = user_id))));


--
-- Name: group_invitations Token invitations are viewable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Token invitations are viewable" ON public.group_invitations FOR SELECT USING (((token IS NOT NULL) AND (status = 'pending'::text)));


--
-- Name: ai_messages Users can add messages to own conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can add messages to own conversations" ON public.ai_messages FOR INSERT WITH CHECK ((conversation_id IN ( SELECT ai_conversations.id
   FROM public.ai_conversations
  WHERE (ai_conversations.user_id = auth.uid()))));


--
-- Name: post_visibility Users can add visibility to own posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can add visibility to own posts" ON public.post_visibility FOR INSERT WITH CHECK (((added_by_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM public.timeline_events te
  WHERE ((te.id = post_visibility.post_id) AND (te.actor_id = ( SELECT auth.uid() AS uid)))))));


--
-- Name: ai_assistants Users can create AI assistants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create AI assistants" ON public.ai_assistants FOR INSERT WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: timeline_comments Users can create comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create comments" ON public.timeline_comments FOR INSERT WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: contracts Users can create contracts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create contracts" ON public.contracts FOR INSERT WITH CHECK ((created_by = auth.uid()));


--
-- Name: ai_conversations Users can create conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create conversations" ON public.ai_conversations FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: conversations Users can create conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create conversations" ON public.conversations FOR INSERT WITH CHECK ((( SELECT auth.uid() AS uid) = created_by));


--
-- Name: events Users can create events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create events" ON public.events FOR INSERT WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: loan_offers Users can create offers on public loans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create offers on public loans" ON public.loan_offers FOR INSERT WITH CHECK (((( SELECT auth.uid() AS uid) = offerer_id) AND (EXISTS ( SELECT 1
   FROM public.loans
  WHERE ((loans.id = loan_offers.loan_id) AND (loans.is_public = true) AND (loans.status = 'active'::text) AND (loans.user_id <> ( SELECT auth.uid() AS uid)))))));


--
-- Name: cat_permissions Users can create own cat permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own cat permissions" ON public.cat_permissions FOR INSERT WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: user_documents Users can create own documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own documents" ON public.user_documents FOR INSERT WITH CHECK ((actor_id IN ( SELECT actors.id
   FROM public.actors
  WHERE (actors.user_id = ( SELECT auth.uid() AS uid)))));


--
-- Name: loan_payments Users can create payments they are involved in; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create payments they are involved in" ON public.loan_payments FOR INSERT WITH CHECK (((( SELECT auth.uid() AS uid) = payer_id) OR (( SELECT auth.uid() AS uid) = recipient_id)));


--
-- Name: message_read_receipts Users can create read receipts for themselves; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create read receipts for themselves" ON public.message_read_receipts FOR INSERT WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: research_entities Users can create research entities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create research entities" ON public.research_entities FOR INSERT WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: timeline_dislikes Users can create their own dislikes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own dislikes" ON public.timeline_dislikes FOR INSERT WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: follows Users can create their own follows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own follows" ON public.follows FOR INSERT WITH CHECK ((( SELECT auth.uid() AS uid) = follower_id));


--
-- Name: timeline_likes Users can create their own likes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own likes" ON public.timeline_likes FOR INSERT WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: loans Users can create their own loans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own loans" ON public.loans FOR INSERT WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: timeline_shares Users can create their own shares; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own shares" ON public.timeline_shares FOR INSERT WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: timeline_events Users can create timeline events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create timeline events" ON public.timeline_events FOR INSERT WITH CHECK (((( SELECT auth.uid() AS uid) = actor_id) OR (actor_type = 'system'::text)));


--
-- Name: user_ai_preferences Users can delete own AI preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own AI preferences" ON public.user_ai_preferences FOR DELETE USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: cat_permissions Users can delete own cat permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own cat permissions" ON public.cat_permissions FOR DELETE USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: ai_conversations Users can delete own conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own conversations" ON public.ai_conversations FOR DELETE USING ((user_id = auth.uid()));


--
-- Name: user_documents Users can delete own documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own documents" ON public.user_documents FOR DELETE USING ((actor_id IN ( SELECT actors.id
   FROM public.actors
  WHERE (actors.user_id = ( SELECT auth.uid() AS uid)))));


--
-- Name: ai_assistants Users can delete their own AI assistants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own AI assistants" ON public.ai_assistants FOR DELETE USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: user_causes Users can delete their own causes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own causes" ON public.user_causes FOR DELETE USING ((actor_id IN ( SELECT actors.id
   FROM public.actors
  WHERE (actors.user_id = ( SELECT auth.uid() AS uid)))));


--
-- Name: timeline_comments Users can delete their own comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own comments" ON public.timeline_comments FOR DELETE USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: timeline_dislikes Users can delete their own dislikes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own dislikes" ON public.timeline_dislikes FOR DELETE USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: events Users can delete their own draft events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own draft events" ON public.events FOR DELETE USING (((( SELECT auth.uid() AS uid) = user_id) AND (status = 'draft'::text)));


--
-- Name: follows Users can delete their own follows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own follows" ON public.follows FOR DELETE USING ((( SELECT auth.uid() AS uid) = follower_id));


--
-- Name: timeline_interactions Users can delete their own interactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own interactions" ON public.timeline_interactions FOR DELETE USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: timeline_likes Users can delete their own likes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own likes" ON public.timeline_likes FOR DELETE USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: loans Users can delete their own loans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own loans" ON public.loans FOR DELETE USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: research_entities Users can delete their own research entities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own research entities" ON public.research_entities FOR DELETE USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: timeline_shares Users can delete their own shares; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own shares" ON public.timeline_shares FOR DELETE USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: project_support Users can delete their own support; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own support" ON public.project_support FOR DELETE USING ((user_id = auth.uid()));


--
-- Name: timeline_events Users can delete their own timeline events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own timeline events" ON public.timeline_events FOR DELETE USING ((( SELECT auth.uid() AS uid) = actor_id));


--
-- Name: user_ai_preferences Users can insert own AI preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own AI preferences" ON public.user_ai_preferences FOR INSERT WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: notification_preferences Users can insert own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own preferences" ON public.notification_preferences FOR INSERT WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: user_causes Users can insert their own causes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own causes" ON public.user_causes FOR INSERT WITH CHECK ((actor_id IN ( SELECT actors.id
   FROM public.actors
  WHERE (actors.user_id = ( SELECT auth.uid() AS uid)))));


--
-- Name: timeline_interactions Users can insert their own interactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own interactions" ON public.timeline_interactions FOR INSERT WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: user_presence Users can modify their own presence; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can modify their own presence" ON public.user_presence FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: post_visibility Users can read post visibility; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read post visibility" ON public.post_visibility FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.timeline_events te
  WHERE ((te.id = post_visibility.post_id) AND (te.visibility = 'public'::text) AND (te.is_deleted = false)))));


--
-- Name: typing_indicators Users can remove their own typing status; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can remove their own typing status" ON public.typing_indicators FOR DELETE USING ((user_id = auth.uid()));


--
-- Name: post_visibility Users can remove visibility from own posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can remove visibility from own posts" ON public.post_visibility FOR DELETE USING ((added_by_id = ( SELECT auth.uid() AS uid)));


--
-- Name: ai_creator_withdrawals Users can request withdrawals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can request withdrawals" ON public.ai_creator_withdrawals FOR INSERT WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: task_requests Users can respond to requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can respond to requests" ON public.task_requests FOR UPDATE USING (((( SELECT auth.uid() AS uid) IS NOT NULL) AND ((requested_user_id = ( SELECT auth.uid() AS uid)) OR (requested_user_id IS NULL))));


--
-- Name: group_invitations Users can respond to their invitations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can respond to their invitations" ON public.group_invitations FOR UPDATE USING (((user_id = auth.uid()) AND (status = 'pending'::text)));


--
-- Name: typing_indicators Users can see typing in their conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can see typing in their conversations" ON public.typing_indicators FOR SELECT USING ((conversation_id IN ( SELECT conversation_participants.conversation_id
   FROM public.conversation_participants
  WHERE ((conversation_participants.user_id = auth.uid()) AND (conversation_participants.is_active = true)))));


--
-- Name: user_ai_preferences Users can update own AI preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own AI preferences" ON public.user_ai_preferences FOR UPDATE USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: cat_permissions Users can update own cat permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own cat permissions" ON public.cat_permissions FOR UPDATE USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: ai_conversations Users can update own conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own conversations" ON public.ai_conversations FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: user_documents Users can update own documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own documents" ON public.user_documents FOR UPDATE USING ((actor_id IN ( SELECT actors.id
   FROM public.actors
  WHERE (actors.user_id = ( SELECT auth.uid() AS uid))))) WITH CHECK ((actor_id IN ( SELECT actors.id
   FROM public.actors
  WHERE (actors.user_id = ( SELECT auth.uid() AS uid)))));


--
-- Name: notifications Users can update own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: cat_pending_actions Users can update own pending cat actions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own pending cat actions" ON public.cat_pending_actions FOR UPDATE USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: notification_preferences Users can update own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own preferences" ON public.notification_preferences FOR UPDATE USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: contracts Users can update their contracts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their contracts" ON public.contracts FOR UPDATE USING (((created_by = auth.uid()) AND (status = 'draft'::text)));


--
-- Name: ai_assistants Users can update their own AI assistants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own AI assistants" ON public.ai_assistants FOR UPDATE USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: user_causes Users can update their own causes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own causes" ON public.user_causes FOR UPDATE USING ((actor_id IN ( SELECT actors.id
   FROM public.actors
  WHERE (actors.user_id = ( SELECT auth.uid() AS uid)))));


--
-- Name: timeline_comments Users can update their own comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own comments" ON public.timeline_comments FOR UPDATE USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: events Users can update their own events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own events" ON public.events FOR UPDATE USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: loans Users can update their own loans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own loans" ON public.loans FOR UPDATE USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: user_presence Users can update their own presence; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own presence" ON public.user_presence FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: research_entities Users can update their own research entities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own research entities" ON public.research_entities FOR UPDATE USING ((( SELECT auth.uid() AS uid) = user_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: timeline_shares Users can update their own shares; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own shares" ON public.timeline_shares FOR UPDATE USING ((( SELECT auth.uid() AS uid) = user_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: project_support Users can update their own support; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own support" ON public.project_support FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: timeline_events Users can update their own timeline events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own timeline events" ON public.timeline_events FOR UPDATE USING ((( SELECT auth.uid() AS uid) = actor_id));


--
-- Name: typing_indicators Users can update their own typing status; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own typing status" ON public.typing_indicators FOR INSERT WITH CHECK (((user_id = auth.uid()) AND (conversation_id IN ( SELECT conversation_participants.conversation_id
   FROM public.conversation_participants
  WHERE ((conversation_participants.user_id = auth.uid()) AND (conversation_participants.is_active = true))))));


--
-- Name: typing_indicators Users can upsert their own typing status; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can upsert their own typing status" ON public.typing_indicators FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: conversations Users can view conversations they participate in; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view conversations they participate in" ON public.conversations FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.conversation_participants cp
  WHERE ((cp.conversation_id = conversations.id) AND (cp.user_id = ( SELECT auth.uid() AS uid)) AND (cp.is_active = true)))));


--
-- Name: ai_messages Users can view messages in own conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view messages in own conversations" ON public.ai_messages FOR SELECT USING ((conversation_id IN ( SELECT ai_conversations.id
   FROM public.ai_conversations
  WHERE (ai_conversations.user_id = auth.uid()))));


--
-- Name: user_ai_preferences Users can view own AI preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own AI preferences" ON public.user_ai_preferences FOR SELECT USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: cat_action_log Users can view own cat action log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own cat action log" ON public.cat_action_log FOR SELECT USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: cat_permissions Users can view own cat permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own cat permissions" ON public.cat_permissions FOR SELECT USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: ai_conversations Users can view own conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own conversations" ON public.ai_conversations FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: ai_creator_earnings Users can view own earnings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own earnings" ON public.ai_creator_earnings FOR SELECT USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: notification_email_log Users can view own email log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own email log" ON public.notification_email_log FOR SELECT USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: notifications Users can view own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: cat_pending_actions Users can view own pending cat actions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own pending cat actions" ON public.cat_pending_actions FOR SELECT USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: platform_api_usage Users can view own platform usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own platform usage" ON public.platform_api_usage FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: notification_preferences Users can view own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own preferences" ON public.notification_preferences FOR SELECT USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: ai_creator_withdrawals Users can view own withdrawals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own withdrawals" ON public.ai_creator_withdrawals FOR SELECT USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: contracts Users can view their contracts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their contracts" ON public.contracts FOR SELECT USING (((party_a_actor_id IN ( SELECT actors.id
   FROM public.actors
  WHERE (actors.user_id = auth.uid()))) OR (party_b_actor_id IN ( SELECT actors.id
   FROM public.actors
  WHERE (actors.user_id = auth.uid()))) OR (party_a_actor_id IN ( SELECT actors.id
   FROM public.actors
  WHERE (actors.group_id IN ( SELECT group_members.group_id
           FROM public.group_members
          WHERE (group_members.user_id = auth.uid()))))) OR (party_b_actor_id IN ( SELECT actors.id
   FROM public.actors
  WHERE (actors.group_id IN ( SELECT group_members.group_id
           FROM public.group_members
          WHERE (group_members.user_id = auth.uid())))))));


--
-- Name: group_invitations Users can view their invitations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their invitations" ON public.group_invitations FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: task_requests Users can view their requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their requests" ON public.task_requests FOR SELECT USING (((( SELECT auth.uid() AS uid) IS NOT NULL) AND ((requested_user_id = ( SELECT auth.uid() AS uid)) OR (requested_user_id IS NULL) OR (requested_by = ( SELECT auth.uid() AS uid)))));


--
-- Name: integration_keys Users create own integration keys; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users create own integration keys" ON public.integration_keys FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: shipping_addresses Users manage own addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users manage own addresses" ON public.shipping_addresses USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: user_plans Users read own plan; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users read own plan" ON public.user_plans FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: integration_keys Users revoke own integration keys; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users revoke own integration keys" ON public.integration_keys FOR UPDATE USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: integration_keys Users view own integration keys; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users view own integration keys" ON public.integration_keys FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: entity_wallets Wallet owners can create links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Wallet owners can create links" ON public.entity_wallets FOR INSERT WITH CHECK ((wallet_id IN ( SELECT wallets.id
   FROM public.wallets
  WHERE (wallets.profile_id = ( SELECT auth.uid() AS uid)))));


--
-- Name: entity_wallets Wallet owners can delete links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Wallet owners can delete links" ON public.entity_wallets FOR DELETE USING ((wallet_id IN ( SELECT wallets.id
   FROM public.wallets
  WHERE (wallets.profile_id = ( SELECT auth.uid() AS uid)))));


--
-- Name: actors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.actors ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_assistants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_assistants ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_conversations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_creator_earnings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_creator_earnings ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_creator_withdrawals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_creator_withdrawals ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: channel_waitlist anyone can join the waitlist; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "anyone can join the waitlist" ON public.channel_waitlist FOR INSERT WITH CHECK (true);


--
-- Name: audit_logs append own audit rows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "append own audit rows" ON public.audit_logs FOR INSERT WITH CHECK (((user_id = auth.uid()) OR (auth.uid() IS NULL)));


--
-- Name: asset_availability; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.asset_availability ENABLE ROW LEVEL SECURITY;

--
-- Name: assets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

--
-- Name: assets assets_owner_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY assets_owner_delete ON public.assets FOR DELETE USING ((( SELECT auth.uid() AS uid) = owner_id));


--
-- Name: assets assets_owner_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY assets_owner_insert ON public.assets FOR INSERT WITH CHECK ((( SELECT auth.uid() AS uid) = owner_id));


--
-- Name: assets assets_owner_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY assets_owner_select ON public.assets FOR SELECT USING ((( SELECT auth.uid() AS uid) = owner_id));


--
-- Name: assets assets_owner_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY assets_owner_update ON public.assets FOR UPDATE USING ((( SELECT auth.uid() AS uid) = owner_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = owner_id));


--
-- Name: assets assets_public_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY assets_public_select ON public.assets FOR SELECT USING ((status = 'active'::text));


--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: availability_slots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;

--
-- Name: bookings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

--
-- Name: cat_action_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cat_action_log ENABLE ROW LEVEL SECURITY;

--
-- Name: cat_conversations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cat_conversations ENABLE ROW LEVEL SECURITY;

--
-- Name: cat_conversations cat_conversations_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cat_conversations_delete ON public.cat_conversations FOR DELETE USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: cat_conversations cat_conversations_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cat_conversations_insert ON public.cat_conversations FOR INSERT WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: cat_conversations cat_conversations_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cat_conversations_select ON public.cat_conversations FOR SELECT USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: cat_conversations cat_conversations_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cat_conversations_update ON public.cat_conversations FOR UPDATE USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: cat_credit_entries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cat_credit_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: cat_credit_entries cat_credit_entries_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cat_credit_entries_select_own ON public.cat_credit_entries FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: cat_credit_topups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cat_credit_topups ENABLE ROW LEVEL SECURITY;

--
-- Name: cat_credit_topups cat_credit_topups_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cat_credit_topups_select_own ON public.cat_credit_topups FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: cat_memories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cat_memories ENABLE ROW LEVEL SECURITY;

--
-- Name: cat_memories cat_memories_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cat_memories_delete_own ON public.cat_memories FOR DELETE USING ((user_id = auth.uid()));


--
-- Name: cat_memories cat_memories_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cat_memories_insert_own ON public.cat_memories FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: cat_memories cat_memories_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cat_memories_select_own ON public.cat_memories FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: cat_memories cat_memories_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cat_memories_update_own ON public.cat_memories FOR UPDATE USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: cat_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cat_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: cat_messages cat_messages_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cat_messages_insert ON public.cat_messages FOR INSERT WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: cat_messages cat_messages_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cat_messages_select ON public.cat_messages FOR SELECT USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: cat_pending_actions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cat_pending_actions ENABLE ROW LEVEL SECURITY;

--
-- Name: cat_permissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cat_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: channel_waitlist; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.channel_waitlist ENABLE ROW LEVEL SECURITY;

--
-- Name: circles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.circles ENABLE ROW LEVEL SECURITY;

--
-- Name: circles circles owner delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "circles owner delete" ON public.circles FOR DELETE USING ((actor_id IN ( SELECT actors.id
   FROM public.actors
  WHERE (actors.user_id = auth.uid()))));


--
-- Name: circles circles owner insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "circles owner insert" ON public.circles FOR INSERT WITH CHECK ((actor_id IN ( SELECT actors.id
   FROM public.actors
  WHERE (actors.user_id = auth.uid()))));


--
-- Name: circles circles owner update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "circles owner update" ON public.circles FOR UPDATE USING ((actor_id IN ( SELECT actors.id
   FROM public.actors
  WHERE (actors.user_id = auth.uid()))));


--
-- Name: circles circles public or owner read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "circles public or owner read" ON public.circles FOR SELECT USING (((visibility = 'public'::text) OR (actor_id IN ( SELECT actors.id
   FROM public.actors
  WHERE (actors.user_id = auth.uid())))));


--
-- Name: contracts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

--
-- Name: contributions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;

--
-- Name: conversation_participants conv_participants_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY conv_participants_delete_own ON public.conversation_participants FOR DELETE USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: conversation_participants conv_participants_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY conv_participants_insert_own ON public.conversation_participants FOR INSERT WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: conversation_participants conv_participants_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY conv_participants_select_own ON public.conversation_participants FOR SELECT USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: conversation_participants conv_participants_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY conv_participants_update_own ON public.conversation_participants FOR UPDATE USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: conversation_participants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

--
-- Name: conversations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

--
-- Name: entity_wallets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.entity_wallets ENABLE ROW LEVEL SECURITY;

--
-- Name: event_attendees; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;

--
-- Name: event_attendees event_attendees_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY event_attendees_delete ON public.event_attendees FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.events
  WHERE ((events.id = event_attendees.event_id) AND (events.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: event_attendees event_attendees_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY event_attendees_insert ON public.event_attendees FOR INSERT WITH CHECK (((( SELECT auth.uid() AS uid) = user_id) OR (EXISTS ( SELECT 1
   FROM public.events
  WHERE ((events.id = event_attendees.event_id) AND (events.user_id = ( SELECT auth.uid() AS uid)))))));


--
-- Name: event_attendees event_attendees_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY event_attendees_select ON public.event_attendees FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.events
  WHERE ((events.id = event_attendees.event_id) AND ((events.status = ANY (ARRAY['published'::text, 'open'::text, 'full'::text, 'ongoing'::text, 'completed'::text])) OR (events.user_id = ( SELECT auth.uid() AS uid)))))));


--
-- Name: event_attendees event_attendees_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY event_attendees_update ON public.event_attendees FOR UPDATE USING (((( SELECT auth.uid() AS uid) = user_id) OR (EXISTS ( SELECT 1
   FROM public.events
  WHERE ((events.id = event_attendees.event_id) AND (events.user_id = ( SELECT auth.uid() AS uid)))))));


--
-- Name: events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

--
-- Name: wishlist_feedback feedback_create_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY feedback_create_own ON public.wishlist_feedback FOR INSERT WITH CHECK ((actor_id IN ( SELECT actors.id
   FROM public.actors
  WHERE (actors.user_id = ( SELECT auth.uid() AS uid)))));


--
-- Name: wishlist_feedback feedback_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY feedback_delete_own ON public.wishlist_feedback FOR DELETE USING ((actor_id IN ( SELECT actors.id
   FROM public.actors
  WHERE (actors.user_id = ( SELECT auth.uid() AS uid)))));


--
-- Name: wishlist_feedback feedback_view; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY feedback_view ON public.wishlist_feedback FOR SELECT USING ((wishlist_item_id IN ( SELECT wi.id
   FROM (public.wishlist_items wi
     JOIN public.wishlists w ON ((w.id = wi.wishlist_id)))
  WHERE (((w.visibility = 'public'::text) OR (w.visibility = 'unlisted'::text)) AND (w.is_active = true)))));


--
-- Name: follows; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

--
-- Name: wishlist_fulfillment_proofs fulfillment_proofs_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fulfillment_proofs_delete ON public.wishlist_fulfillment_proofs FOR DELETE USING ((wishlist_item_id IN ( SELECT wi.id
   FROM (public.wishlist_items wi
     JOIN public.wishlists w ON ((w.id = wi.wishlist_id)))
  WHERE (w.actor_id IN ( SELECT actors.id
           FROM public.actors
          WHERE (actors.user_id = ( SELECT auth.uid() AS uid)))))));


--
-- Name: wishlist_fulfillment_proofs fulfillment_proofs_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fulfillment_proofs_insert ON public.wishlist_fulfillment_proofs FOR INSERT WITH CHECK ((wishlist_item_id IN ( SELECT wi.id
   FROM (public.wishlist_items wi
     JOIN public.wishlists w ON ((w.id = wi.wishlist_id)))
  WHERE (w.actor_id IN ( SELECT actors.id
           FROM public.actors
          WHERE (actors.user_id = ( SELECT auth.uid() AS uid)))))));


--
-- Name: wishlist_fulfillment_proofs fulfillment_proofs_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fulfillment_proofs_select ON public.wishlist_fulfillment_proofs FOR SELECT USING (((wishlist_item_id IN ( SELECT wi.id
   FROM (public.wishlist_items wi
     JOIN public.wishlists w ON ((w.id = wi.wishlist_id)))
  WHERE (w.actor_id IN ( SELECT actors.id
           FROM public.actors
          WHERE (actors.user_id = ( SELECT auth.uid() AS uid)))))) OR (wishlist_item_id IN ( SELECT wi.id
   FROM (public.wishlist_items wi
     JOIN public.wishlists w ON ((w.id = wi.wishlist_id)))
  WHERE (((w.visibility = 'public'::text) OR (w.visibility = 'unlisted'::text)) AND (w.is_active = true))))));


--
-- Name: wishlist_fulfillment_proofs fulfillment_proofs_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fulfillment_proofs_update ON public.wishlist_fulfillment_proofs FOR UPDATE USING ((wishlist_item_id IN ( SELECT wi.id
   FROM (public.wishlist_items wi
     JOIN public.wishlists w ON ((w.id = wi.wishlist_id)))
  WHERE (w.actor_id IN ( SELECT actors.id
           FROM public.actors
          WHERE (actors.user_id = ( SELECT auth.uid() AS uid)))))));


--
-- Name: github_repo_cache; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.github_repo_cache ENABLE ROW LEVEL SECURITY;

--
-- Name: github_repo_cache github_repo_cache_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY github_repo_cache_owner ON public.github_repo_cache TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: group_activities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.group_activities ENABLE ROW LEVEL SECURITY;

--
-- Name: group_event_rsvps; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.group_event_rsvps ENABLE ROW LEVEL SECURITY;

--
-- Name: group_event_rsvps group_event_rsvps_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY group_event_rsvps_delete ON public.group_event_rsvps FOR DELETE USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: group_event_rsvps group_event_rsvps_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY group_event_rsvps_insert ON public.group_event_rsvps FOR INSERT WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: group_event_rsvps group_event_rsvps_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY group_event_rsvps_select ON public.group_event_rsvps FOR SELECT USING (((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.group_events
  WHERE ((group_events.id = group_event_rsvps.event_id) AND ((group_events.is_public = true) OR (EXISTS ( SELECT 1
           FROM public.group_members
          WHERE ((group_members.group_id = group_events.group_id) AND (group_members.user_id = ( SELECT auth.uid() AS uid)))))))))));


--
-- Name: group_event_rsvps group_event_rsvps_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY group_event_rsvps_update ON public.group_event_rsvps FOR UPDATE USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: group_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.group_events ENABLE ROW LEVEL SECURITY;

--
-- Name: group_features; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.group_features ENABLE ROW LEVEL SECURITY;

--
-- Name: group_features group_features_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY group_features_delete ON public.group_features FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.group_members
  WHERE ((group_members.group_id = group_features.group_id) AND (group_members.user_id = ( SELECT auth.uid() AS uid)) AND (group_members.role = ANY (ARRAY['founder'::text, 'admin'::text]))))));


--
-- Name: group_features group_features_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY group_features_insert ON public.group_features FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.group_members
  WHERE ((group_members.group_id = group_features.group_id) AND (group_members.user_id = ( SELECT auth.uid() AS uid)) AND (group_members.role = ANY (ARRAY['founder'::text, 'admin'::text]))))));


--
-- Name: group_features group_features_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY group_features_select ON public.group_features FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.group_members
  WHERE ((group_members.group_id = group_features.group_id) AND (group_members.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: group_features group_features_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY group_features_update ON public.group_features FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.group_members
  WHERE ((group_members.group_id = group_features.group_id) AND (group_members.user_id = ( SELECT auth.uid() AS uid)) AND (group_members.role = ANY (ARRAY['founder'::text, 'admin'::text]))))));


--
-- Name: group_invitations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.group_invitations ENABLE ROW LEVEL SECURITY;

--
-- Name: group_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

--
-- Name: group_members group_members_delete_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY group_members_delete_auth ON public.group_members FOR DELETE TO authenticated USING ((((user_id = ( SELECT auth.uid() AS uid)) AND (public.get_user_group_role(group_id, ( SELECT auth.uid() AS uid)) <> 'founder'::text)) OR (public.get_user_group_role(group_id, ( SELECT auth.uid() AS uid)) = ANY (ARRAY['founder'::text, 'admin'::text]))));


--
-- Name: group_members group_members_insert_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY group_members_insert_auth ON public.group_members FOR INSERT TO authenticated WITH CHECK ((((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM public.groups g
  WHERE ((g.id = group_members.group_id) AND (g.created_by = ( SELECT auth.uid() AS uid)))))) OR (public.is_group_member(group_id, ( SELECT auth.uid() AS uid)) AND (public.get_user_group_role(group_id, ( SELECT auth.uid() AS uid)) = ANY (ARRAY['founder'::text, 'admin'::text])))));


--
-- Name: group_members group_members_select_anon; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY group_members_select_anon ON public.group_members FOR SELECT TO anon USING ((EXISTS ( SELECT 1
   FROM public.groups
  WHERE ((groups.id = group_members.group_id) AND (groups.is_public = true)))));


--
-- Name: group_members group_members_select_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY group_members_select_auth ON public.group_members FOR SELECT TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.groups
  WHERE ((groups.id = group_members.group_id) AND (groups.is_public = true)))) OR public.is_group_member(group_id, ( SELECT auth.uid() AS uid))));


--
-- Name: group_members group_members_update_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY group_members_update_auth ON public.group_members FOR UPDATE TO authenticated USING ((public.is_group_member(group_id, ( SELECT auth.uid() AS uid)) AND (public.get_user_group_role(group_id, ( SELECT auth.uid() AS uid)) = ANY (ARRAY['founder'::text, 'admin'::text]))));


--
-- Name: group_proposals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.group_proposals ENABLE ROW LEVEL SECURITY;

--
-- Name: group_votes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.group_votes ENABLE ROW LEVEL SECURITY;

--
-- Name: group_wallets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.group_wallets ENABLE ROW LEVEL SECURITY;

--
-- Name: group_wallets group_wallets_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY group_wallets_delete ON public.group_wallets FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.group_members
  WHERE ((group_members.group_id = group_wallets.group_id) AND (group_members.user_id = ( SELECT auth.uid() AS uid)) AND (group_members.role = ANY (ARRAY['founder'::text, 'admin'::text]))))));


--
-- Name: group_wallets group_wallets_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY group_wallets_insert ON public.group_wallets FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.group_members
  WHERE ((group_members.group_id = group_wallets.group_id) AND (group_members.user_id = ( SELECT auth.uid() AS uid)) AND (group_members.role = ANY (ARRAY['founder'::text, 'admin'::text]))))));


--
-- Name: group_wallets group_wallets_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY group_wallets_select ON public.group_wallets FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.group_members
  WHERE ((group_members.group_id = group_wallets.group_id) AND (group_members.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: group_wallets group_wallets_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY group_wallets_update ON public.group_wallets FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.group_members
  WHERE ((group_members.group_id = group_wallets.group_id) AND (group_members.user_id = ( SELECT auth.uid() AS uid)) AND (group_members.role = ANY (ARRAY['founder'::text, 'admin'::text]))))));


--
-- Name: groups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

--
-- Name: groups groups_delete_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY groups_delete_auth ON public.groups FOR DELETE TO authenticated USING ((public.is_group_member(id, ( SELECT auth.uid() AS uid)) AND (public.get_user_group_role(id, ( SELECT auth.uid() AS uid)) = 'founder'::text)));


--
-- Name: groups groups_select_anon; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY groups_select_anon ON public.groups FOR SELECT TO anon USING ((is_public = true));


--
-- Name: groups groups_select_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY groups_select_auth ON public.groups FOR SELECT TO authenticated USING (((is_public = true) OR (created_by = ( SELECT auth.uid() AS uid)) OR public.is_group_member(id, ( SELECT auth.uid() AS uid))));


--
-- Name: groups groups_update_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY groups_update_auth ON public.groups FOR UPDATE TO authenticated USING ((public.is_group_member(id, ( SELECT auth.uid() AS uid)) AND (public.get_user_group_role(id, ( SELECT auth.uid() AS uid)) = ANY (ARRAY['founder'::text, 'admin'::text]))));


--
-- Name: idempotency_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.idempotency_results ENABLE ROW LEVEL SECURITY;

--
-- Name: integration_keys; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.integration_keys ENABLE ROW LEVEL SECURITY;

--
-- Name: investments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

--
-- Name: loan_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.loan_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: loan_collateral; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.loan_collateral ENABLE ROW LEVEL SECURITY;

--
-- Name: loan_offers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.loan_offers ENABLE ROW LEVEL SECURITY;

--
-- Name: loan_payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.loan_payments ENABLE ROW LEVEL SECURITY;

--
-- Name: loans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

--
-- Name: project_media media_delete_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY media_delete_owner ON public.project_media FOR DELETE USING ((( SELECT auth.uid() AS uid) = ( SELECT projects.user_id
   FROM public.projects
  WHERE (projects.id = project_media.project_id))));


--
-- Name: project_media media_insert_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY media_insert_owner ON public.project_media FOR INSERT WITH CHECK ((( SELECT auth.uid() AS uid) = ( SELECT projects.user_id
   FROM public.projects
  WHERE (projects.id = project_media.project_id))));


--
-- Name: project_media media_select_public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY media_select_public ON public.project_media FOR SELECT USING (true);


--
-- Name: project_media media_update_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY media_update_owner ON public.project_media FOR UPDATE USING ((( SELECT auth.uid() AS uid) = ( SELECT projects.user_id
   FROM public.projects
  WHERE (projects.id = project_media.project_id))));


--
-- Name: message_read_receipts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.message_read_receipts ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_email_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_email_log ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: oauth_auth_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.oauth_auth_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: oauth_clients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.oauth_clients ENABLE ROW LEVEL SECURITY;

--
-- Name: oauth_refresh_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.oauth_refresh_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: oauth_user_grants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.oauth_user_grants ENABLE ROW LEVEL SECURITY;

--
-- Name: orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

--
-- Name: loan_collateral owner pledges own collateral; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "owner pledges own collateral" ON public.loan_collateral FOR INSERT WITH CHECK ((owner_id = auth.uid()));


--
-- Name: loan_collateral owner reads own collateral; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "owner reads own collateral" ON public.loan_collateral FOR SELECT USING ((owner_id = auth.uid()));


--
-- Name: loan_collateral owner updates own collateral; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "owner updates own collateral" ON public.loan_collateral FOR UPDATE USING ((owner_id = auth.uid()));


--
-- Name: payment_intents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;

--
-- Name: platform_api_usage; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.platform_api_usage ENABLE ROW LEVEL SECURITY;

--
-- Name: post_visibility; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.post_visibility ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_delete_own ON public.profiles FOR DELETE USING ((( SELECT auth.uid() AS uid) = id));


--
-- Name: profiles profiles_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT WITH CHECK ((( SELECT auth.uid() AS uid) = id));


--
-- Name: profiles profiles_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE USING ((( SELECT auth.uid() AS uid) = id)) WITH CHECK ((( SELECT auth.uid() AS uid) = id));


--
-- Name: project_updates project owner posts updates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "project owner posts updates" ON public.project_updates FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.projects p
     JOIN public.actors a ON ((a.id = p.actor_id)))
  WHERE ((p.id = project_updates.project_id) AND (a.user_id = auth.uid())))));


--
-- Name: project_updates project updates public read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "project updates public read" ON public.project_updates FOR SELECT USING (true);


--
-- Name: project_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: project_categories project_categories_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY project_categories_public_read ON public.project_categories FOR SELECT USING (true);


--
-- Name: project_favorites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_favorites ENABLE ROW LEVEL SECURITY;

--
-- Name: project_favorites project_favorites_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY project_favorites_delete_own ON public.project_favorites FOR DELETE USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: project_favorites project_favorites_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY project_favorites_insert_own ON public.project_favorites FOR INSERT WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: project_favorites project_favorites_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY project_favorites_select_own ON public.project_favorites FOR SELECT USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: project_media; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_media ENABLE ROW LEVEL SECURITY;

--
-- Name: project_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: project_roles project_roles_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY project_roles_read ON public.project_roles FOR SELECT USING (((status = 'open'::text) OR (EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = project_roles.project_id) AND (p.user_id = auth.uid()))))));


--
-- Name: project_roles project_roles_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY project_roles_write ON public.project_roles USING ((EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = project_roles.project_id) AND (p.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = project_roles.project_id) AND (p.user_id = auth.uid())))));


--
-- Name: project_support; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_support ENABLE ROW LEVEL SECURITY;

--
-- Name: project_support_stats; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_support_stats ENABLE ROW LEVEL SECURITY;

--
-- Name: project_updates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_updates ENABLE ROW LEVEL SECURITY;

--
-- Name: projects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

--
-- Name: projects projects_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY projects_delete_own ON public.projects FOR DELETE USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: projects projects_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY projects_insert_own ON public.projects FOR INSERT WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: projects projects_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY projects_public_read ON public.projects FOR SELECT USING (((status = 'active'::text) OR (status = 'completed'::text) OR (user_id = ( SELECT auth.uid() AS uid))));


--
-- Name: projects projects_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY projects_update_own ON public.projects FOR UPDATE USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: research_contributions research_contrib insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "research_contrib insert" ON public.research_contributions FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.research_entities
  WHERE ((research_entities.id = research_contributions.research_entity_id) AND (research_entities.is_public = true)))));


--
-- Name: research_contributions research_contrib own update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "research_contrib own update" ON public.research_contributions FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: research_contributions research_contrib read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "research_contrib read" ON public.research_contributions FOR SELECT USING (((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM public.research_entities
  WHERE ((research_entities.id = research_contributions.research_entity_id) AND (research_entities.user_id = auth.uid()))))));


--
-- Name: research_contributions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.research_contributions ENABLE ROW LEVEL SECURITY;

--
-- Name: research_entities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.research_entities ENABLE ROW LEVEL SECURITY;

--
-- Name: research_progress_updates research_progress owner write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "research_progress owner write" ON public.research_progress_updates FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.research_entities
  WHERE ((research_entities.id = research_progress_updates.research_entity_id) AND (research_entities.user_id = auth.uid())))));


--
-- Name: research_progress_updates research_progress public read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "research_progress public read" ON public.research_progress_updates FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.research_entities
  WHERE ((research_entities.id = research_progress_updates.research_entity_id) AND (research_entities.is_public = true)))) OR (EXISTS ( SELECT 1
   FROM public.research_entities
  WHERE ((research_entities.id = research_progress_updates.research_entity_id) AND (research_entities.user_id = auth.uid()))))));


--
-- Name: research_progress_updates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.research_progress_updates ENABLE ROW LEVEL SECURITY;

--
-- Name: research_votes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.research_votes ENABLE ROW LEVEL SECURITY;

--
-- Name: research_votes research_votes auth insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "research_votes auth insert" ON public.research_votes FOR INSERT WITH CHECK (((auth.uid() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.research_entities
  WHERE ((research_entities.id = research_votes.research_entity_id) AND (research_entities.is_public = true))))));


--
-- Name: research_votes research_votes own update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "research_votes own update" ON public.research_votes FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: research_votes research_votes public read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "research_votes public read" ON public.research_votes FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.research_entities
  WHERE ((research_entities.id = research_votes.research_entity_id) AND (research_entities.is_public = true)))));


--
-- Name: search_queries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.search_queries ENABLE ROW LEVEL SECURITY;

--
-- Name: shipping_addresses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shipping_addresses ENABLE ROW LEVEL SECURITY;

--
-- Name: stakeholder_relationships; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stakeholder_relationships ENABLE ROW LEVEL SECURITY;

--
-- Name: stakeholder_relationships stakeholder_relationships_owner_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stakeholder_relationships_owner_delete ON public.stakeholder_relationships FOR DELETE USING ((owner_actor_id IN ( SELECT actors.id
   FROM public.actors
  WHERE (actors.user_id = ( SELECT auth.uid() AS uid)))));


--
-- Name: stakeholder_relationships stakeholder_relationships_owner_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stakeholder_relationships_owner_insert ON public.stakeholder_relationships FOR INSERT WITH CHECK ((owner_actor_id IN ( SELECT actors.id
   FROM public.actors
  WHERE (actors.user_id = ( SELECT auth.uid() AS uid)))));


--
-- Name: stakeholder_relationships stakeholder_relationships_owner_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stakeholder_relationships_owner_select ON public.stakeholder_relationships FOR SELECT USING ((owner_actor_id IN ( SELECT actors.id
   FROM public.actors
  WHERE (actors.user_id = ( SELECT auth.uid() AS uid)))));


--
-- Name: stakeholder_relationships stakeholder_relationships_owner_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stakeholder_relationships_owner_update ON public.stakeholder_relationships FOR UPDATE USING ((owner_actor_id IN ( SELECT actors.id
   FROM public.actors
  WHERE (actors.user_id = ( SELECT auth.uid() AS uid)))));


--
-- Name: task_attention_flags; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.task_attention_flags ENABLE ROW LEVEL SECURITY;

--
-- Name: task_completions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;

--
-- Name: task_projects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.task_projects ENABLE ROW LEVEL SECURITY;

--
-- Name: task_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.task_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: tasks tasks_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tasks_insert_own ON public.tasks FOR INSERT WITH CHECK (((( SELECT auth.uid() AS uid) IS NOT NULL) AND (created_by = ( SELECT auth.uid() AS uid))));


--
-- Name: tasks tasks_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tasks_select ON public.tasks FOR SELECT USING ((((( SELECT auth.uid() AS uid) IS NOT NULL) AND (NOT is_archived)) OR ((created_by = ( SELECT auth.uid() AS uid)) AND (is_archived = true))));


--
-- Name: tasks tasks_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tasks_update ON public.tasks FOR UPDATE USING ((( SELECT auth.uid() AS uid) IS NOT NULL));


--
-- Name: timeline_comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.timeline_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: timeline_dislikes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.timeline_dislikes ENABLE ROW LEVEL SECURITY;

--
-- Name: timeline_event_stats; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.timeline_event_stats ENABLE ROW LEVEL SECURITY;

--
-- Name: timeline_event_visibility; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.timeline_event_visibility ENABLE ROW LEVEL SECURITY;

--
-- Name: timeline_event_visibility timeline_event_visibility_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY timeline_event_visibility_delete ON public.timeline_event_visibility FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.timeline_events
  WHERE ((timeline_events.id = timeline_event_visibility.event_id) AND (timeline_events.actor_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: timeline_event_visibility timeline_event_visibility_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY timeline_event_visibility_insert ON public.timeline_event_visibility FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.timeline_events
  WHERE ((timeline_events.id = timeline_event_visibility.event_id) AND (timeline_events.actor_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: timeline_event_visibility timeline_event_visibility_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY timeline_event_visibility_update ON public.timeline_event_visibility FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.timeline_events
  WHERE ((timeline_events.id = timeline_event_visibility.event_id) AND (timeline_events.actor_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: timeline_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;

--
-- Name: timeline_interactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.timeline_interactions ENABLE ROW LEVEL SECURITY;

--
-- Name: timeline_likes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.timeline_likes ENABLE ROW LEVEL SECURITY;

--
-- Name: timeline_shares; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.timeline_shares ENABLE ROW LEVEL SECURITY;

--
-- Name: transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: transactions transactions_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY transactions_insert ON public.transactions FOR INSERT TO authenticated WITH CHECK (((from_entity_id = ( SELECT auth.uid() AS uid)) OR (from_entity_id IN ( SELECT w.project_id
   FROM public.wallets w
  WHERE ((w.user_id = ( SELECT auth.uid() AS uid)) AND (w.project_id IS NOT NULL))))));


--
-- Name: transactions transactions_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY transactions_select ON public.transactions FOR SELECT USING (((public_visibility = true) OR (from_entity_id = ( SELECT auth.uid() AS uid)) OR (to_entity_id = ( SELECT auth.uid() AS uid)) OR (from_entity_id IN ( SELECT w.project_id
   FROM public.wallets w
  WHERE ((w.user_id = ( SELECT auth.uid() AS uid)) AND (w.project_id IS NOT NULL)))) OR (to_entity_id IN ( SELECT w.project_id
   FROM public.wallets w
  WHERE ((w.user_id = ( SELECT auth.uid() AS uid)) AND (w.project_id IS NOT NULL))))));


--
-- Name: transactions transactions_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY transactions_update ON public.transactions FOR UPDATE TO authenticated USING (((from_entity_id = ( SELECT auth.uid() AS uid)) OR (from_entity_id IN ( SELECT w.project_id
   FROM public.wallets w
  WHERE ((w.user_id = ( SELECT auth.uid() AS uid)) AND (w.project_id IS NOT NULL))))));


--
-- Name: transparency_scores; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.transparency_scores ENABLE ROW LEVEL SECURITY;

--
-- Name: transparency_scores transparency_scores_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY transparency_scores_public_read ON public.transparency_scores FOR SELECT USING (true);


--
-- Name: typing_indicators; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

--
-- Name: user_ai_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_ai_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: user_api_keys; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;

--
-- Name: user_api_keys user_api_keys_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_api_keys_delete_own ON public.user_api_keys FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: user_api_keys user_api_keys_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_api_keys_insert_own ON public.user_api_keys FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_api_keys user_api_keys_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_api_keys_select_own ON public.user_api_keys FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_api_keys user_api_keys_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_api_keys_update_own ON public.user_api_keys FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_causes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_causes ENABLE ROW LEVEL SECURITY;

--
-- Name: user_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: user_economic_profile; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_economic_profile ENABLE ROW LEVEL SECURITY;

--
-- Name: user_economic_profile user_economic_profile_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_economic_profile_delete ON public.user_economic_profile FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: user_economic_profile user_economic_profile_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_economic_profile_insert ON public.user_economic_profile FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_economic_profile user_economic_profile_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_economic_profile_select ON public.user_economic_profile FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_economic_profile user_economic_profile_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_economic_profile_update ON public.user_economic_profile FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: user_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: user_presence; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

--
-- Name: user_products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_products ENABLE ROW LEVEL SECURITY;

--
-- Name: user_products user_products_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_products_delete_own ON public.user_products FOR DELETE USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: user_products user_products_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_products_insert_own ON public.user_products FOR INSERT WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: user_products user_products_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_products_select_policy ON public.user_products FOR SELECT USING (((status = 'active'::text) OR (( SELECT auth.uid() AS uid) = user_id)));


--
-- Name: user_products user_products_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_products_update_own ON public.user_products FOR UPDATE USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: user_services; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_services ENABLE ROW LEVEL SECURITY;

--
-- Name: user_services user_services_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_services_delete_own ON public.user_services FOR DELETE USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: user_services user_services_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_services_insert_own ON public.user_services FOR INSERT WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: user_services user_services_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_services_select_policy ON public.user_services FOR SELECT USING (((status = 'active'::text) OR (( SELECT auth.uid() AS uid) = user_id)));


--
-- Name: user_services user_services_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_services_update_own ON public.user_services FOR UPDATE USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: wallets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

--
-- Name: wallets wallets_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wallets_delete_own ON public.wallets FOR DELETE USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: wallets wallets_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wallets_insert_own ON public.wallets FOR INSERT WITH CHECK (((( SELECT auth.uid() AS uid) = profile_id) OR (( SELECT auth.uid() AS uid) = ( SELECT projects.user_id
   FROM public.projects
  WHERE (projects.id = wallets.project_id)))));


--
-- Name: wallets wallets_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wallets_select ON public.wallets FOR SELECT USING (((( SELECT auth.uid() AS uid) = user_id) OR ((is_active = true) AND (((project_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.projects
  WHERE ((projects.id = wallets.project_id) AND (projects.status = 'active'::text))))) OR ((profile_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE (profiles.id = wallets.profile_id))))))));


--
-- Name: wallets wallets_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wallets_update_own ON public.wallets FOR UPDATE USING ((( SELECT auth.uid() AS uid) = user_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: webhook_deliveries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

--
-- Name: webhook_endpoints; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;

--
-- Name: wishlist_contributions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wishlist_contributions ENABLE ROW LEVEL SECURITY;

--
-- Name: wishlist_contributions wishlist_contributions_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wishlist_contributions_insert ON public.wishlist_contributions FOR INSERT WITH CHECK ((wishlist_item_id IN ( SELECT wi.id
   FROM (public.wishlist_items wi
     JOIN public.wishlists w ON ((w.id = wi.wishlist_id)))
  WHERE (((w.visibility = 'public'::text) OR (w.visibility = 'unlisted'::text)) AND (w.is_active = true)))));


--
-- Name: wishlist_contributions wishlist_contributions_view_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wishlist_contributions_view_own ON public.wishlist_contributions FOR SELECT USING (((contributor_actor_id IN ( SELECT actors.id
   FROM public.actors
  WHERE (actors.user_id = ( SELECT auth.uid() AS uid)))) OR (wishlist_item_id IN ( SELECT wi.id
   FROM (public.wishlist_items wi
     JOIN public.wishlists w ON ((w.id = wi.wishlist_id)))
  WHERE (w.actor_id IN ( SELECT actors.id
           FROM public.actors
          WHERE (actors.user_id = ( SELECT auth.uid() AS uid))))))));


--
-- Name: wishlist_feedback; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wishlist_feedback ENABLE ROW LEVEL SECURITY;

--
-- Name: wishlist_fulfillment_proofs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wishlist_fulfillment_proofs ENABLE ROW LEVEL SECURITY;

--
-- Name: wishlist_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;

--
-- Name: wishlist_items wishlist_items_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wishlist_items_delete ON public.wishlist_items FOR DELETE USING ((wishlist_id IN ( SELECT wishlists.id
   FROM public.wishlists
  WHERE (wishlists.actor_id IN ( SELECT actors.id
           FROM public.actors
          WHERE (actors.user_id = ( SELECT auth.uid() AS uid)))))));


--
-- Name: wishlist_items wishlist_items_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wishlist_items_insert ON public.wishlist_items FOR INSERT WITH CHECK ((wishlist_id IN ( SELECT wishlists.id
   FROM public.wishlists
  WHERE (wishlists.actor_id IN ( SELECT actors.id
           FROM public.actors
          WHERE (actors.user_id = ( SELECT auth.uid() AS uid)))))));


--
-- Name: wishlist_items wishlist_items_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wishlist_items_select ON public.wishlist_items FOR SELECT USING (((wishlist_id IN ( SELECT wishlists.id
   FROM public.wishlists
  WHERE (wishlists.actor_id IN ( SELECT actors.id
           FROM public.actors
          WHERE (actors.user_id = ( SELECT auth.uid() AS uid)))))) OR (wishlist_id IN ( SELECT wishlists.id
   FROM public.wishlists
  WHERE (((wishlists.visibility = 'public'::text) OR (wishlists.visibility = 'unlisted'::text)) AND (wishlists.is_active = true))))));


--
-- Name: wishlist_items wishlist_items_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wishlist_items_update ON public.wishlist_items FOR UPDATE USING ((wishlist_id IN ( SELECT wishlists.id
   FROM public.wishlists
  WHERE (wishlists.actor_id IN ( SELECT actors.id
           FROM public.actors
          WHERE (actors.user_id = ( SELECT auth.uid() AS uid)))))));


--
-- Name: wishlists; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

--
-- Name: wishlists wishlists_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wishlists_delete ON public.wishlists FOR DELETE USING ((actor_id IN ( SELECT actors.id
   FROM public.actors
  WHERE (actors.user_id = ( SELECT auth.uid() AS uid)))));


--
-- Name: wishlists wishlists_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wishlists_insert ON public.wishlists FOR INSERT WITH CHECK ((actor_id IN ( SELECT actors.id
   FROM public.actors
  WHERE (actors.user_id = ( SELECT auth.uid() AS uid)))));


--
-- Name: wishlists wishlists_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wishlists_select ON public.wishlists FOR SELECT USING (((actor_id IN ( SELECT actors.id
   FROM public.actors
  WHERE (actors.user_id = ( SELECT auth.uid() AS uid)))) OR ((visibility = ANY (ARRAY['public'::text, 'unlisted'::text])) AND (is_active = true))));


--
-- Name: wishlists wishlists_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wishlists_update ON public.wishlists FOR UPDATE USING ((actor_id IN ( SELECT actors.id
   FROM public.actors
  WHERE (actors.user_id = ( SELECT auth.uid() AS uid)))));


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION accept_group_invitation(invitation_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.accept_group_invitation(invitation_id uuid) TO anon;
GRANT ALL ON FUNCTION public.accept_group_invitation(invitation_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.accept_group_invitation(invitation_id uuid) TO service_role;


--
-- Name: FUNCTION add_timeline_comment(p_event_id uuid, p_user_id uuid, p_content text, p_parent_comment_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.add_timeline_comment(p_event_id uuid, p_user_id uuid, p_content text, p_parent_comment_id uuid) TO anon;
GRANT ALL ON FUNCTION public.add_timeline_comment(p_event_id uuid, p_user_id uuid, p_content text, p_parent_comment_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.add_timeline_comment(p_event_id uuid, p_user_id uuid, p_content text, p_parent_comment_id uuid) TO service_role;


--
-- Name: FUNCTION auto_title_ai_conversation(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.auto_title_ai_conversation() TO anon;
GRANT ALL ON FUNCTION public.auto_title_ai_conversation() TO authenticated;
GRANT ALL ON FUNCTION public.auto_title_ai_conversation() TO service_role;


--
-- Name: FUNCTION cancel_ai_withdrawal(p_withdrawal_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.cancel_ai_withdrawal(p_withdrawal_id uuid) TO anon;
GRANT ALL ON FUNCTION public.cancel_ai_withdrawal(p_withdrawal_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.cancel_ai_withdrawal(p_withdrawal_id uuid) TO service_role;


--
-- Name: FUNCTION cat_credit_append(p_user_id uuid, p_kind text, p_amount_btc numeric, p_ref text, p_metadata jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.cat_credit_append(p_user_id uuid, p_kind text, p_amount_btc numeric, p_ref text, p_metadata jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.cat_credit_append(p_user_id uuid, p_kind text, p_amount_btc numeric, p_ref text, p_metadata jsonb) TO service_role;


--
-- Name: FUNCTION cat_credit_balance(p_user_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.cat_credit_balance(p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.cat_credit_balance(p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.cat_credit_balance(p_user_id uuid) TO service_role;


--
-- Name: FUNCTION check_booking_conflict(p_bookable_type text, p_bookable_id uuid, p_starts_at timestamp with time zone, p_ends_at timestamp with time zone, p_exclude_booking_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.check_booking_conflict(p_bookable_type text, p_bookable_id uuid, p_starts_at timestamp with time zone, p_ends_at timestamp with time zone, p_exclude_booking_id uuid) TO anon;
GRANT ALL ON FUNCTION public.check_booking_conflict(p_bookable_type text, p_bookable_id uuid, p_starts_at timestamp with time zone, p_ends_at timestamp with time zone, p_exclude_booking_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.check_booking_conflict(p_bookable_type text, p_bookable_id uuid, p_starts_at timestamp with time zone, p_ends_at timestamp with time zone, p_exclude_booking_id uuid) TO service_role;


--
-- Name: FUNCTION check_cat_permission(p_user_id uuid, p_action_id text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.check_cat_permission(p_user_id uuid, p_action_id text) TO anon;
GRANT ALL ON FUNCTION public.check_cat_permission(p_user_id uuid, p_action_id text) TO authenticated;
GRANT ALL ON FUNCTION public.check_cat_permission(p_user_id uuid, p_action_id text) TO service_role;


--
-- Name: FUNCTION check_platform_limit(p_user_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.check_platform_limit(p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.check_platform_limit(p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.check_platform_limit(p_user_id uuid) TO service_role;


--
-- Name: FUNCTION cleanup_expired_invitations(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.cleanup_expired_invitations() TO anon;
GRANT ALL ON FUNCTION public.cleanup_expired_invitations() TO authenticated;
GRANT ALL ON FUNCTION public.cleanup_expired_invitations() TO service_role;


--
-- Name: FUNCTION complete_ai_withdrawal(p_withdrawal_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.complete_ai_withdrawal(p_withdrawal_id uuid) TO anon;
GRANT ALL ON FUNCTION public.complete_ai_withdrawal(p_withdrawal_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.complete_ai_withdrawal(p_withdrawal_id uuid) TO service_role;


--
-- Name: FUNCTION create_direct_conversation(participant1_id uuid, participant2_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.create_direct_conversation(participant1_id uuid, participant2_id uuid) TO anon;
GRANT ALL ON FUNCTION public.create_direct_conversation(participant1_id uuid, participant2_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.create_direct_conversation(participant1_id uuid, participant2_id uuid) TO service_role;


--
-- Name: FUNCTION create_group_conversation(p_created_by uuid, p_participant_ids uuid[], p_title text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.create_group_conversation(p_created_by uuid, p_participant_ids uuid[], p_title text) TO anon;
GRANT ALL ON FUNCTION public.create_group_conversation(p_created_by uuid, p_participant_ids uuid[], p_title text) TO authenticated;
GRANT ALL ON FUNCTION public.create_group_conversation(p_created_by uuid, p_participant_ids uuid[], p_title text) TO service_role;


--
-- Name: FUNCTION create_loan_offer(p_loan_id uuid, p_offerer_id uuid, p_offer_type text, p_offer_amount numeric, p_interest_rate numeric, p_term_months integer, p_terms text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.create_loan_offer(p_loan_id uuid, p_offerer_id uuid, p_offer_type text, p_offer_amount numeric, p_interest_rate numeric, p_term_months integer, p_terms text) TO anon;
GRANT ALL ON FUNCTION public.create_loan_offer(p_loan_id uuid, p_offerer_id uuid, p_offer_type text, p_offer_amount numeric, p_interest_rate numeric, p_term_months integer, p_terms text) TO authenticated;
GRANT ALL ON FUNCTION public.create_loan_offer(p_loan_id uuid, p_offerer_id uuid, p_offer_type text, p_offer_amount numeric, p_interest_rate numeric, p_term_months integer, p_terms text) TO service_role;


--
-- Name: FUNCTION create_post_with_visibility(p_event_type text, p_actor_id uuid, p_subject_type text, p_subject_id uuid, p_title text, p_description text, p_visibility text, p_metadata jsonb, p_timeline_contexts jsonb); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.create_post_with_visibility(p_event_type text, p_actor_id uuid, p_subject_type text, p_subject_id uuid, p_title text, p_description text, p_visibility text, p_metadata jsonb, p_timeline_contexts jsonb) TO anon;
GRANT ALL ON FUNCTION public.create_post_with_visibility(p_event_type text, p_actor_id uuid, p_subject_type text, p_subject_id uuid, p_title text, p_description text, p_visibility text, p_metadata jsonb, p_timeline_contexts jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.create_post_with_visibility(p_event_type text, p_actor_id uuid, p_subject_type text, p_subject_id uuid, p_title text, p_description text, p_visibility text, p_metadata jsonb, p_timeline_contexts jsonb) TO service_role;


--
-- Name: FUNCTION create_quote_reply(p_parent_event_id uuid, p_actor_id uuid, p_content text, p_quoted_content text, p_visibility text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.create_quote_reply(p_parent_event_id uuid, p_actor_id uuid, p_content text, p_quoted_content text, p_visibility text) TO anon;
GRANT ALL ON FUNCTION public.create_quote_reply(p_parent_event_id uuid, p_actor_id uuid, p_content text, p_quoted_content text, p_visibility text) TO authenticated;
GRANT ALL ON FUNCTION public.create_quote_reply(p_parent_event_id uuid, p_actor_id uuid, p_content text, p_quoted_content text, p_visibility text) TO service_role;


--
-- Name: FUNCTION create_task_broadcast_notification(p_exclude_user_id uuid, p_type text, p_title text, p_message text, p_task_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.create_task_broadcast_notification(p_exclude_user_id uuid, p_type text, p_title text, p_message text, p_task_id uuid) TO anon;
GRANT ALL ON FUNCTION public.create_task_broadcast_notification(p_exclude_user_id uuid, p_type text, p_title text, p_message text, p_task_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.create_task_broadcast_notification(p_exclude_user_id uuid, p_type text, p_title text, p_message text, p_task_id uuid) TO service_role;


--
-- Name: FUNCTION create_task_notification(p_recipient_user_id uuid, p_type text, p_title text, p_message text, p_task_id uuid, p_source_user_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.create_task_notification(p_recipient_user_id uuid, p_type text, p_title text, p_message text, p_task_id uuid, p_source_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.create_task_notification(p_recipient_user_id uuid, p_type text, p_title text, p_message text, p_task_id uuid, p_source_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.create_task_notification(p_recipient_user_id uuid, p_type text, p_title text, p_message text, p_task_id uuid, p_source_user_id uuid) TO service_role;


--
-- Name: FUNCTION decline_group_invitation(invitation_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.decline_group_invitation(invitation_id uuid) TO anon;
GRANT ALL ON FUNCTION public.decline_group_invitation(invitation_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.decline_group_invitation(invitation_id uuid) TO service_role;


--
-- Name: FUNCTION decrement_inventory(p_entity_type text, p_entity_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.decrement_inventory(p_entity_type text, p_entity_id uuid) TO anon;
GRANT ALL ON FUNCTION public.decrement_inventory(p_entity_type text, p_entity_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.decrement_inventory(p_entity_type text, p_entity_id uuid) TO service_role;


--
-- Name: FUNCTION delete_timeline_comment(p_comment_id uuid, p_user_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.delete_timeline_comment(p_comment_id uuid, p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.delete_timeline_comment(p_comment_id uuid, p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.delete_timeline_comment(p_comment_id uuid, p_user_id uuid) TO service_role;


--
-- Name: FUNCTION dislike_timeline_event(p_event_id uuid, p_user_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.dislike_timeline_event(p_event_id uuid, p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.dislike_timeline_event(p_event_id uuid, p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.dislike_timeline_event(p_event_id uuid, p_user_id uuid) TO service_role;


--
-- Name: FUNCTION expire_cat_pending_actions(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.expire_cat_pending_actions() TO anon;
GRANT ALL ON FUNCTION public.expire_cat_pending_actions() TO authenticated;
GRANT ALL ON FUNCTION public.expire_cat_pending_actions() TO service_role;


--
-- Name: FUNCTION f_score(doc text, needle text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.f_score(doc text, needle text) TO anon;
GRANT ALL ON FUNCTION public.f_score(doc text, needle text) TO authenticated;
GRANT ALL ON FUNCTION public.f_score(doc text, needle text) TO service_role;


--
-- Name: FUNCTION f_unaccent(text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.f_unaccent(text) TO anon;
GRANT ALL ON FUNCTION public.f_unaccent(text) TO authenticated;
GRANT ALL ON FUNCTION public.f_unaccent(text) TO service_role;


--
-- Name: FUNCTION fail_ai_withdrawal(p_withdrawal_id uuid, p_reason text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fail_ai_withdrawal(p_withdrawal_id uuid, p_reason text) TO anon;
GRANT ALL ON FUNCTION public.fail_ai_withdrawal(p_withdrawal_id uuid, p_reason text) TO authenticated;
GRANT ALL ON FUNCTION public.fail_ai_withdrawal(p_withdrawal_id uuid, p_reason text) TO service_role;


--
-- Name: FUNCTION generate_invitation_token(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.generate_invitation_token() TO anon;
GRANT ALL ON FUNCTION public.generate_invitation_token() TO authenticated;
GRANT ALL ON FUNCTION public.generate_invitation_token() TO service_role;


--
-- Name: TABLE loans; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.loans TO anon;
GRANT ALL ON TABLE public.loans TO authenticated;
GRANT ALL ON TABLE public.loans TO service_role;


--
-- Name: FUNCTION get_available_loans(p_limit integer, p_offset integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_available_loans(p_limit integer, p_offset integer) TO anon;
GRANT ALL ON FUNCTION public.get_available_loans(p_limit integer, p_offset integer) TO authenticated;
GRANT ALL ON FUNCTION public.get_available_loans(p_limit integer, p_offset integer) TO service_role;


--
-- Name: FUNCTION get_cat_action_daily_usage(p_user_id uuid, p_action_id text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_cat_action_daily_usage(p_user_id uuid, p_action_id text) TO anon;
GRANT ALL ON FUNCTION public.get_cat_action_daily_usage(p_user_id uuid, p_action_id text) TO authenticated;
GRANT ALL ON FUNCTION public.get_cat_action_daily_usage(p_user_id uuid, p_action_id text) TO service_role;


--
-- Name: FUNCTION get_comment_replies(p_comment_id uuid, p_limit integer, p_offset integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_comment_replies(p_comment_id uuid, p_limit integer, p_offset integer) TO anon;
GRANT ALL ON FUNCTION public.get_comment_replies(p_comment_id uuid, p_limit integer, p_offset integer) TO authenticated;
GRANT ALL ON FUNCTION public.get_comment_replies(p_comment_id uuid, p_limit integer, p_offset integer) TO service_role;


--
-- Name: FUNCTION get_comment_reply_count(comment_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_comment_reply_count(comment_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_comment_reply_count(comment_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_comment_reply_count(comment_id uuid) TO service_role;


--
-- Name: FUNCTION get_enriched_timeline_feed(p_user_id uuid, p_limit integer, p_offset integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_enriched_timeline_feed(p_user_id uuid, p_limit integer, p_offset integer) TO anon;
GRANT ALL ON FUNCTION public.get_enriched_timeline_feed(p_user_id uuid, p_limit integer, p_offset integer) TO authenticated;
GRANT ALL ON FUNCTION public.get_enriched_timeline_feed(p_user_id uuid, p_limit integer, p_offset integer) TO service_role;


--
-- Name: FUNCTION get_event_comment_count(event_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_event_comment_count(event_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_event_comment_count(event_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_event_comment_count(event_id uuid) TO service_role;


--
-- Name: FUNCTION get_event_comments(p_event_id uuid, p_limit integer, p_offset integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_event_comments(p_event_id uuid, p_limit integer, p_offset integer) TO anon;
GRANT ALL ON FUNCTION public.get_event_comments(p_event_id uuid, p_limit integer, p_offset integer) TO authenticated;
GRANT ALL ON FUNCTION public.get_event_comments(p_event_id uuid, p_limit integer, p_offset integer) TO service_role;


--
-- Name: FUNCTION get_event_dislike_count(event_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_event_dislike_count(event_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_event_dislike_count(event_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_event_dislike_count(event_id uuid) TO service_role;


--
-- Name: FUNCTION get_event_like_count(event_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_event_like_count(event_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_event_like_count(event_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_event_like_count(event_id uuid) TO service_role;


--
-- Name: FUNCTION get_event_share_count(event_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_event_share_count(event_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_event_share_count(event_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_event_share_count(event_id uuid) TO service_role;


--
-- Name: TABLE timeline_events; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.timeline_events TO anon;
GRANT ALL ON TABLE public.timeline_events TO authenticated;
GRANT ALL ON TABLE public.timeline_events TO service_role;


--
-- Name: FUNCTION get_following_feed(p_user_id uuid, p_limit integer, p_offset integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_following_feed(p_user_id uuid, p_limit integer, p_offset integer) TO anon;
GRANT ALL ON FUNCTION public.get_following_feed(p_user_id uuid, p_limit integer, p_offset integer) TO authenticated;
GRANT ALL ON FUNCTION public.get_following_feed(p_user_id uuid, p_limit integer, p_offset integer) TO service_role;


--
-- Name: FUNCTION get_group_member_count(group_uuid uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_group_member_count(group_uuid uuid) TO anon;
GRANT ALL ON FUNCTION public.get_group_member_count(group_uuid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_group_member_count(group_uuid uuid) TO service_role;


--
-- Name: FUNCTION get_group_role(user_uuid uuid, group_uuid uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_group_role(user_uuid uuid, group_uuid uuid) TO anon;
GRANT ALL ON FUNCTION public.get_group_role(user_uuid uuid, group_uuid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_group_role(user_uuid uuid, group_uuid uuid) TO service_role;


--
-- Name: TABLE user_ai_preferences; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.user_ai_preferences TO anon;
GRANT ALL ON TABLE public.user_ai_preferences TO authenticated;
GRANT ALL ON TABLE public.user_ai_preferences TO service_role;


--
-- Name: FUNCTION get_or_create_user_ai_preferences(p_user_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_or_create_user_ai_preferences(p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_or_create_user_ai_preferences(p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_or_create_user_ai_preferences(p_user_id uuid) TO service_role;


--
-- Name: FUNCTION get_thread_posts(p_thread_id uuid, p_limit integer, p_offset integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_thread_posts(p_thread_id uuid, p_limit integer, p_offset integer) TO anon;
GRANT ALL ON FUNCTION public.get_thread_posts(p_thread_id uuid, p_limit integer, p_offset integer) TO authenticated;
GRANT ALL ON FUNCTION public.get_thread_posts(p_thread_id uuid, p_limit integer, p_offset integer) TO service_role;


--
-- Name: FUNCTION get_total_unread_count(p_user_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_total_unread_count(p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_total_unread_count(p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_total_unread_count(p_user_id uuid) TO service_role;


--
-- Name: FUNCTION get_unread_counts(p_user_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_unread_counts(p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_unread_counts(p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_unread_counts(p_user_id uuid) TO service_role;


--
-- Name: FUNCTION get_user_conversations(p_user_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_user_conversations(p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_user_conversations(p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_user_conversations(p_user_id uuid) TO service_role;


--
-- Name: FUNCTION get_user_group_role(p_group_id uuid, p_user_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_user_group_role(p_group_id uuid, p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_user_group_role(p_group_id uuid, p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_user_group_role(p_group_id uuid, p_user_id uuid) TO service_role;


--
-- Name: FUNCTION get_user_groups(user_uuid uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_user_groups(user_uuid uuid) TO anon;
GRANT ALL ON FUNCTION public.get_user_groups(user_uuid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_user_groups(user_uuid uuid) TO service_role;


--
-- Name: FUNCTION get_user_loans(p_user_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_user_loans(p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_user_loans(p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_user_loans(p_user_id uuid) TO service_role;


--
-- Name: FUNCTION get_user_pending_invitations(user_uuid uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_user_pending_invitations(user_uuid uuid) TO anon;
GRANT ALL ON FUNCTION public.get_user_pending_invitations(user_uuid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_user_pending_invitations(user_uuid uuid) TO service_role;


--
-- Name: FUNCTION get_user_timeline_feed(p_user_id uuid, p_limit integer, p_offset integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_user_timeline_feed(p_user_id uuid, p_limit integer, p_offset integer) TO anon;
GRANT ALL ON FUNCTION public.get_user_timeline_feed(p_user_id uuid, p_limit integer, p_offset integer) TO authenticated;
GRANT ALL ON FUNCTION public.get_user_timeline_feed(p_user_id uuid, p_limit integer, p_offset integer) TO service_role;


--
-- Name: FUNCTION global_search(p_query text, p_limit integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.global_search(p_query text, p_limit integer) TO anon;
GRANT ALL ON FUNCTION public.global_search(p_query text, p_limit integer) TO authenticated;
GRANT ALL ON FUNCTION public.global_search(p_query text, p_limit integer) TO service_role;


--
-- Name: FUNCTION handle_new_profile_actor(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.handle_new_profile_actor() TO anon;
GRANT ALL ON FUNCTION public.handle_new_profile_actor() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_profile_actor() TO service_role;


--
-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.handle_new_user() TO anon;
GRANT ALL ON FUNCTION public.handle_new_user() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;


--
-- Name: FUNCTION handle_new_user_plan(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.handle_new_user_plan() TO anon;
GRANT ALL ON FUNCTION public.handle_new_user_plan() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_user_plan() TO service_role;


--
-- Name: FUNCTION handle_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.handle_updated_at() TO anon;
GRANT ALL ON FUNCTION public.handle_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.handle_updated_at() TO service_role;


--
-- Name: FUNCTION has_user_disliked_event(p_event_id uuid, p_user_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.has_user_disliked_event(p_event_id uuid, p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.has_user_disliked_event(p_event_id uuid, p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.has_user_disliked_event(p_event_id uuid, p_user_id uuid) TO service_role;


--
-- Name: FUNCTION has_user_liked_event(p_event_id uuid, p_user_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.has_user_liked_event(p_event_id uuid, p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.has_user_liked_event(p_event_id uuid, p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.has_user_liked_event(p_event_id uuid, p_user_id uuid) TO service_role;


--
-- Name: FUNCTION has_user_shared_event(p_event_id uuid, p_user_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.has_user_shared_event(p_event_id uuid, p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.has_user_shared_event(p_event_id uuid, p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.has_user_shared_event(p_event_id uuid, p_user_id uuid) TO service_role;


--
-- Name: FUNCTION increment_ai_revenue(p_assistant_id uuid, p_creator_id uuid, p_amount numeric); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.increment_ai_revenue(p_assistant_id uuid, p_creator_id uuid, p_amount numeric) TO anon;
GRANT ALL ON FUNCTION public.increment_ai_revenue(p_assistant_id uuid, p_creator_id uuid, p_amount numeric) TO authenticated;
GRANT ALL ON FUNCTION public.increment_ai_revenue(p_assistant_id uuid, p_creator_id uuid, p_amount numeric) TO service_role;


--
-- Name: FUNCTION increment_platform_usage(p_user_id uuid, p_request_count integer, p_token_count bigint); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.increment_platform_usage(p_user_id uuid, p_request_count integer, p_token_count bigint) TO anon;
GRANT ALL ON FUNCTION public.increment_platform_usage(p_user_id uuid, p_request_count integer, p_token_count bigint) TO authenticated;
GRANT ALL ON FUNCTION public.increment_platform_usage(p_user_id uuid, p_request_count integer, p_token_count bigint) TO service_role;


--
-- Name: FUNCTION is_group_member(p_group_id uuid, p_user_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.is_group_member(p_group_id uuid, p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.is_group_member(p_group_id uuid, p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.is_group_member(p_group_id uuid, p_user_id uuid) TO service_role;


--
-- Name: FUNCTION like_timeline_event(p_event_id uuid, p_user_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.like_timeline_event(p_event_id uuid, p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.like_timeline_event(p_event_id uuid, p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.like_timeline_event(p_event_id uuid, p_user_id uuid) TO service_role;


--
-- Name: FUNCTION mark_conversation_read(p_conversation_id uuid, p_user_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.mark_conversation_read(p_conversation_id uuid, p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.mark_conversation_read(p_conversation_id uuid, p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.mark_conversation_read(p_conversation_id uuid, p_user_id uuid) TO service_role;


--
-- Name: FUNCTION match_cat_memories(p_user_id uuid, query_embedding printcraft.vector, match_count integer, min_similarity double precision); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.match_cat_memories(p_user_id uuid, query_embedding printcraft.vector, match_count integer, min_similarity double precision) TO anon;
GRANT ALL ON FUNCTION public.match_cat_memories(p_user_id uuid, query_embedding printcraft.vector, match_count integer, min_similarity double precision) TO authenticated;
GRANT ALL ON FUNCTION public.match_cat_memories(p_user_id uuid, query_embedding printcraft.vector, match_count integer, min_similarity double precision) TO service_role;


--
-- Name: FUNCTION match_content(query_embedding printcraft.vector, match_count integer, filter_type text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.match_content(query_embedding printcraft.vector, match_count integer, filter_type text) TO anon;
GRANT ALL ON FUNCTION public.match_content(query_embedding printcraft.vector, match_count integer, filter_type text) TO authenticated;
GRANT ALL ON FUNCTION public.match_content(query_embedding printcraft.vector, match_count integer, filter_type text) TO service_role;


--
-- Name: FUNCTION match_content(query_embedding printcraft.vector, match_count integer, filter_type text, min_similarity double precision); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.match_content(query_embedding printcraft.vector, match_count integer, filter_type text, min_similarity double precision) TO anon;
GRANT ALL ON FUNCTION public.match_content(query_embedding printcraft.vector, match_count integer, filter_type text, min_similarity double precision) TO authenticated;
GRANT ALL ON FUNCTION public.match_content(query_embedding printcraft.vector, match_count integer, filter_type text, min_similarity double precision) TO service_role;


--
-- Name: FUNCTION notify_embedding_reindex(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.notify_embedding_reindex() TO anon;
GRANT ALL ON FUNCTION public.notify_embedding_reindex() TO authenticated;
GRANT ALL ON FUNCTION public.notify_embedding_reindex() TO service_role;


--
-- Name: FUNCTION request_ai_withdrawal(p_creator_id uuid, p_amount numeric, p_destination text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.request_ai_withdrawal(p_creator_id uuid, p_amount numeric, p_destination text) TO anon;
GRANT ALL ON FUNCTION public.request_ai_withdrawal(p_creator_id uuid, p_amount numeric, p_destination text) TO authenticated;
GRANT ALL ON FUNCTION public.request_ai_withdrawal(p_creator_id uuid, p_amount numeric, p_destination text) TO service_role;


--
-- Name: FUNCTION reset_task_on_completion(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.reset_task_on_completion() TO anon;
GRANT ALL ON FUNCTION public.reset_task_on_completion() TO authenticated;
GRANT ALL ON FUNCTION public.reset_task_on_completion() TO service_role;


--
-- Name: FUNCTION search_profiles_fts(p_query text, p_limit integer, p_offset integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.search_profiles_fts(p_query text, p_limit integer, p_offset integer) TO anon;
GRANT ALL ON FUNCTION public.search_profiles_fts(p_query text, p_limit integer, p_offset integer) TO authenticated;
GRANT ALL ON FUNCTION public.search_profiles_fts(p_query text, p_limit integer, p_offset integer) TO service_role;


--
-- Name: FUNCTION search_profiles_nearby(p_lat double precision, p_lng double precision, p_radius_km double precision, p_query text, p_limit integer, p_offset integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.search_profiles_nearby(p_lat double precision, p_lng double precision, p_radius_km double precision, p_query text, p_limit integer, p_offset integer) TO anon;
GRANT ALL ON FUNCTION public.search_profiles_nearby(p_lat double precision, p_lng double precision, p_radius_km double precision, p_query text, p_limit integer, p_offset integer) TO authenticated;
GRANT ALL ON FUNCTION public.search_profiles_nearby(p_lat double precision, p_lng double precision, p_radius_km double precision, p_query text, p_limit integer, p_offset integer) TO service_role;


--
-- Name: FUNCTION search_projects_fts(p_query text, p_limit integer, p_offset integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.search_projects_fts(p_query text, p_limit integer, p_offset integer) TO anon;
GRANT ALL ON FUNCTION public.search_projects_fts(p_query text, p_limit integer, p_offset integer) TO authenticated;
GRANT ALL ON FUNCTION public.search_projects_fts(p_query text, p_limit integer, p_offset integer) TO service_role;


--
-- Name: FUNCTION search_projects_nearby(p_lat double precision, p_lng double precision, p_radius_km double precision, p_query text, p_limit integer, p_offset integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.search_projects_nearby(p_lat double precision, p_lng double precision, p_radius_km double precision, p_query text, p_limit integer, p_offset integer) TO anon;
GRANT ALL ON FUNCTION public.search_projects_nearby(p_lat double precision, p_lng double precision, p_radius_km double precision, p_query text, p_limit integer, p_offset integer) TO authenticated;
GRANT ALL ON FUNCTION public.search_projects_nearby(p_lat double precision, p_lng double precision, p_radius_km double precision, p_query text, p_limit integer, p_offset integer) TO service_role;


--
-- Name: FUNCTION send_message(p_conversation_id uuid, p_sender_id uuid, p_content text, p_message_type text, p_metadata jsonb); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.send_message(p_conversation_id uuid, p_sender_id uuid, p_content text, p_message_type text, p_metadata jsonb) TO anon;
GRANT ALL ON FUNCTION public.send_message(p_conversation_id uuid, p_sender_id uuid, p_content text, p_message_type text, p_metadata jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.send_message(p_conversation_id uuid, p_sender_id uuid, p_content text, p_message_type text, p_metadata jsonb) TO service_role;


--
-- Name: FUNCTION set_ai_assistant_published_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.set_ai_assistant_published_at() TO anon;
GRANT ALL ON FUNCTION public.set_ai_assistant_published_at() TO authenticated;
GRANT ALL ON FUNCTION public.set_ai_assistant_published_at() TO service_role;


--
-- Name: FUNCTION set_updated_at_stakeholder_relationships(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.set_updated_at_stakeholder_relationships() TO anon;
GRANT ALL ON FUNCTION public.set_updated_at_stakeholder_relationships() TO authenticated;
GRANT ALL ON FUNCTION public.set_updated_at_stakeholder_relationships() TO service_role;


--
-- Name: FUNCTION set_wallet_user_id(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.set_wallet_user_id() TO anon;
GRANT ALL ON FUNCTION public.set_wallet_user_id() TO authenticated;
GRANT ALL ON FUNCTION public.set_wallet_user_id() TO service_role;


--
-- Name: FUNCTION share_timeline_event(p_original_event_id uuid, p_user_id uuid, p_share_text text, p_visibility text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.share_timeline_event(p_original_event_id uuid, p_user_id uuid, p_share_text text, p_visibility text) TO anon;
GRANT ALL ON FUNCTION public.share_timeline_event(p_original_event_id uuid, p_user_id uuid, p_share_text text, p_visibility text) TO authenticated;
GRANT ALL ON FUNCTION public.share_timeline_event(p_original_event_id uuid, p_user_id uuid, p_share_text text, p_visibility text) TO service_role;


--
-- Name: FUNCTION soft_delete_timeline_event(event_id uuid, reason text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.soft_delete_timeline_event(event_id uuid, reason text) TO anon;
GRANT ALL ON FUNCTION public.soft_delete_timeline_event(event_id uuid, reason text) TO authenticated;
GRANT ALL ON FUNCTION public.soft_delete_timeline_event(event_id uuid, reason text) TO service_role;


--
-- Name: FUNCTION sync_profile_to_actor(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.sync_profile_to_actor() TO anon;
GRANT ALL ON FUNCTION public.sync_profile_to_actor() TO authenticated;
GRANT ALL ON FUNCTION public.sync_profile_to_actor() TO service_role;


--
-- Name: FUNCTION sync_project_funding(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.sync_project_funding() TO anon;
GRANT ALL ON FUNCTION public.sync_project_funding() TO authenticated;
GRANT ALL ON FUNCTION public.sync_project_funding() TO service_role;


--
-- Name: FUNCTION transfer_between_wallets(p_from_wallet_id uuid, p_to_wallet_id uuid, p_amount_btc numeric, p_transaction_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.transfer_between_wallets(p_from_wallet_id uuid, p_to_wallet_id uuid, p_amount_btc numeric, p_transaction_id uuid) TO anon;
GRANT ALL ON FUNCTION public.transfer_between_wallets(p_from_wallet_id uuid, p_to_wallet_id uuid, p_amount_btc numeric, p_transaction_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.transfer_between_wallets(p_from_wallet_id uuid, p_to_wallet_id uuid, p_amount_btc numeric, p_transaction_id uuid) TO service_role;


--
-- Name: FUNCTION undislike_timeline_event(p_event_id uuid, p_user_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.undislike_timeline_event(p_event_id uuid, p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.undislike_timeline_event(p_event_id uuid, p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.undislike_timeline_event(p_event_id uuid, p_user_id uuid) TO service_role;


--
-- Name: FUNCTION unlike_timeline_event(p_event_id uuid, p_user_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.unlike_timeline_event(p_event_id uuid, p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.unlike_timeline_event(p_event_id uuid, p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.unlike_timeline_event(p_event_id uuid, p_user_id uuid) TO service_role;


--
-- Name: FUNCTION update_ai_assistant_timestamp(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_ai_assistant_timestamp() TO anon;
GRANT ALL ON FUNCTION public.update_ai_assistant_timestamp() TO authenticated;
GRANT ALL ON FUNCTION public.update_ai_assistant_timestamp() TO service_role;


--
-- Name: FUNCTION update_ai_conversation_stats(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_ai_conversation_stats() TO anon;
GRANT ALL ON FUNCTION public.update_ai_conversation_stats() TO authenticated;
GRANT ALL ON FUNCTION public.update_ai_conversation_stats() TO service_role;


--
-- Name: FUNCTION update_assets_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_assets_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_assets_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_assets_updated_at() TO service_role;


--
-- Name: FUNCTION update_association_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_association_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_association_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_association_updated_at() TO service_role;


--
-- Name: FUNCTION update_booking_timestamp(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_booking_timestamp() TO anon;
GRANT ALL ON FUNCTION public.update_booking_timestamp() TO authenticated;
GRANT ALL ON FUNCTION public.update_booking_timestamp() TO service_role;


--
-- Name: FUNCTION update_cat_conversation_timestamp(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_cat_conversation_timestamp() TO anon;
GRANT ALL ON FUNCTION public.update_cat_conversation_timestamp() TO authenticated;
GRANT ALL ON FUNCTION public.update_cat_conversation_timestamp() TO service_role;


--
-- Name: FUNCTION update_cat_permissions_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_cat_permissions_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_cat_permissions_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_cat_permissions_updated_at() TO service_role;


--
-- Name: FUNCTION update_conversation_timestamp(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_conversation_timestamp() TO anon;
GRANT ALL ON FUNCTION public.update_conversation_timestamp() TO authenticated;
GRANT ALL ON FUNCTION public.update_conversation_timestamp() TO service_role;


--
-- Name: FUNCTION update_events_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_events_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_events_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_events_updated_at() TO service_role;


--
-- Name: FUNCTION update_group_event_rsvps_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_group_event_rsvps_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_group_event_rsvps_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_group_event_rsvps_updated_at() TO service_role;


--
-- Name: FUNCTION update_group_events_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_group_events_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_group_events_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_group_events_updated_at() TO service_role;


--
-- Name: FUNCTION update_groups_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_groups_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_groups_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_groups_updated_at() TO service_role;


--
-- Name: FUNCTION update_key_usage(p_key_id uuid, p_tokens_used bigint); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_key_usage(p_key_id uuid, p_tokens_used bigint) TO anon;
GRANT ALL ON FUNCTION public.update_key_usage(p_key_id uuid, p_tokens_used bigint) TO authenticated;
GRANT ALL ON FUNCTION public.update_key_usage(p_key_id uuid, p_tokens_used bigint) TO service_role;


--
-- Name: FUNCTION update_loan_offers_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_loan_offers_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_loan_offers_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_loan_offers_updated_at() TO service_role;


--
-- Name: FUNCTION update_loans_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_loans_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_loans_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_loans_updated_at() TO service_role;


--
-- Name: FUNCTION update_message_timestamp(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_message_timestamp() TO anon;
GRANT ALL ON FUNCTION public.update_message_timestamp() TO authenticated;
GRANT ALL ON FUNCTION public.update_message_timestamp() TO service_role;


--
-- Name: FUNCTION update_notification_preferences_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_notification_preferences_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_notification_preferences_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_notification_preferences_updated_at() TO service_role;


--
-- Name: FUNCTION update_project_support_stats(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_project_support_stats() TO anon;
GRANT ALL ON FUNCTION public.update_project_support_stats() TO authenticated;
GRANT ALL ON FUNCTION public.update_project_support_stats() TO service_role;


--
-- Name: FUNCTION update_task_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_task_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_task_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_task_updated_at() TO service_role;


--
-- Name: FUNCTION update_timeline_comment(p_comment_id uuid, p_user_id uuid, p_content text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_timeline_comment(p_comment_id uuid, p_user_id uuid, p_content text) TO anon;
GRANT ALL ON FUNCTION public.update_timeline_comment(p_comment_id uuid, p_user_id uuid, p_content text) TO authenticated;
GRANT ALL ON FUNCTION public.update_timeline_comment(p_comment_id uuid, p_user_id uuid, p_content text) TO service_role;


--
-- Name: FUNCTION update_timeline_comment_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_timeline_comment_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_timeline_comment_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_timeline_comment_updated_at() TO service_role;


--
-- Name: FUNCTION update_timeline_event_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_timeline_event_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_timeline_event_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_timeline_event_updated_at() TO service_role;


--
-- Name: FUNCTION update_treasury_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_treasury_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_treasury_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_treasury_updated_at() TO service_role;


--
-- Name: FUNCTION update_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_updated_at() TO service_role;


--
-- Name: FUNCTION update_updated_at_column(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_updated_at_column() TO anon;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO service_role;


--
-- Name: FUNCTION update_user_ai_preferences_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_user_ai_preferences_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_user_ai_preferences_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_user_ai_preferences_updated_at() TO service_role;


--
-- Name: FUNCTION update_user_documents_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_user_documents_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_user_documents_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_user_documents_updated_at() TO service_role;


--
-- Name: FUNCTION user_api_keys_touch_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.user_api_keys_touch_updated_at() TO anon;
GRANT ALL ON FUNCTION public.user_api_keys_touch_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.user_api_keys_touch_updated_at() TO service_role;


--
-- Name: FUNCTION user_is_participant(p_conversation_id uuid, p_user_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.user_is_participant(p_conversation_id uuid, p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.user_is_participant(p_conversation_id uuid, p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.user_is_participant(p_conversation_id uuid, p_user_id uuid) TO service_role;


--
-- Name: TABLE _backup_cat_conversations_20260703; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public._backup_cat_conversations_20260703 TO anon;
GRANT ALL ON TABLE public._backup_cat_conversations_20260703 TO authenticated;
GRANT ALL ON TABLE public._backup_cat_conversations_20260703 TO service_role;


--
-- Name: TABLE _backup_cat_messages_20260703; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public._backup_cat_messages_20260703 TO anon;
GRANT ALL ON TABLE public._backup_cat_messages_20260703 TO authenticated;
GRANT ALL ON TABLE public._backup_cat_messages_20260703 TO service_role;


--
-- Name: TABLE actors; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.actors TO anon;
GRANT ALL ON TABLE public.actors TO authenticated;
GRANT ALL ON TABLE public.actors TO service_role;


--
-- Name: TABLE ai_assistants; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.ai_assistants TO anon;
GRANT ALL ON TABLE public.ai_assistants TO authenticated;
GRANT ALL ON TABLE public.ai_assistants TO service_role;


--
-- Name: TABLE ai_conversations; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.ai_conversations TO anon;
GRANT ALL ON TABLE public.ai_conversations TO authenticated;
GRANT ALL ON TABLE public.ai_conversations TO service_role;


--
-- Name: TABLE ai_messages; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.ai_messages TO anon;
GRANT ALL ON TABLE public.ai_messages TO authenticated;
GRANT ALL ON TABLE public.ai_messages TO service_role;


--
-- Name: TABLE ai_cost_analytics; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.ai_cost_analytics TO anon;
GRANT ALL ON TABLE public.ai_cost_analytics TO authenticated;
GRANT ALL ON TABLE public.ai_cost_analytics TO service_role;


--
-- Name: TABLE ai_creator_earnings; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.ai_creator_earnings TO anon;
GRANT ALL ON TABLE public.ai_creator_earnings TO authenticated;
GRANT ALL ON TABLE public.ai_creator_earnings TO service_role;


--
-- Name: TABLE ai_creator_withdrawals; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.ai_creator_withdrawals TO anon;
GRANT ALL ON TABLE public.ai_creator_withdrawals TO authenticated;
GRANT ALL ON TABLE public.ai_creator_withdrawals TO service_role;


--
-- Name: TABLE asset_availability; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.asset_availability TO anon;
GRANT ALL ON TABLE public.asset_availability TO authenticated;
GRANT ALL ON TABLE public.asset_availability TO service_role;


--
-- Name: TABLE assets; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.assets TO anon;
GRANT ALL ON TABLE public.assets TO authenticated;
GRANT ALL ON TABLE public.assets TO service_role;


--
-- Name: TABLE audit_logs; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.audit_logs TO anon;
GRANT ALL ON TABLE public.audit_logs TO authenticated;
GRANT ALL ON TABLE public.audit_logs TO service_role;


--
-- Name: TABLE availability_slots; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.availability_slots TO anon;
GRANT ALL ON TABLE public.availability_slots TO authenticated;
GRANT ALL ON TABLE public.availability_slots TO service_role;


--
-- Name: TABLE bookings; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.bookings TO anon;
GRANT ALL ON TABLE public.bookings TO authenticated;
GRANT ALL ON TABLE public.bookings TO service_role;


--
-- Name: TABLE cat_action_log; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.cat_action_log TO anon;
GRANT ALL ON TABLE public.cat_action_log TO authenticated;
GRANT ALL ON TABLE public.cat_action_log TO service_role;


--
-- Name: TABLE cat_conversations; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.cat_conversations TO anon;
GRANT ALL ON TABLE public.cat_conversations TO authenticated;
GRANT ALL ON TABLE public.cat_conversations TO service_role;


--
-- Name: TABLE cat_credit_entries; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.cat_credit_entries TO anon;
GRANT ALL ON TABLE public.cat_credit_entries TO authenticated;
GRANT ALL ON TABLE public.cat_credit_entries TO service_role;


--
-- Name: SEQUENCE cat_credit_entries_seq_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.cat_credit_entries_seq_seq TO anon;
GRANT ALL ON SEQUENCE public.cat_credit_entries_seq_seq TO authenticated;
GRANT ALL ON SEQUENCE public.cat_credit_entries_seq_seq TO service_role;


--
-- Name: TABLE cat_credit_topups; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.cat_credit_topups TO anon;
GRANT ALL ON TABLE public.cat_credit_topups TO authenticated;
GRANT ALL ON TABLE public.cat_credit_topups TO service_role;


--
-- Name: TABLE cat_memories; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.cat_memories TO anon;
GRANT ALL ON TABLE public.cat_memories TO authenticated;
GRANT ALL ON TABLE public.cat_memories TO service_role;


--
-- Name: TABLE cat_messages; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.cat_messages TO anon;
GRANT ALL ON TABLE public.cat_messages TO authenticated;
GRANT ALL ON TABLE public.cat_messages TO service_role;


--
-- Name: TABLE cat_pending_actions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.cat_pending_actions TO anon;
GRANT ALL ON TABLE public.cat_pending_actions TO authenticated;
GRANT ALL ON TABLE public.cat_pending_actions TO service_role;


--
-- Name: TABLE cat_permissions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.cat_permissions TO anon;
GRANT ALL ON TABLE public.cat_permissions TO authenticated;
GRANT ALL ON TABLE public.cat_permissions TO service_role;


--
-- Name: TABLE channel_waitlist; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.channel_waitlist TO anon;
GRANT ALL ON TABLE public.channel_waitlist TO authenticated;
GRANT ALL ON TABLE public.channel_waitlist TO service_role;


--
-- Name: TABLE circles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.circles TO anon;
GRANT ALL ON TABLE public.circles TO authenticated;
GRANT ALL ON TABLE public.circles TO service_role;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;


--
-- Name: TABLE projects; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.projects TO anon;
GRANT ALL ON TABLE public.projects TO authenticated;
GRANT ALL ON TABLE public.projects TO service_role;


--
-- Name: TABLE timeline_comments; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.timeline_comments TO anon;
GRANT ALL ON TABLE public.timeline_comments TO authenticated;
GRANT ALL ON TABLE public.timeline_comments TO service_role;


--
-- Name: TABLE timeline_likes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.timeline_likes TO anon;
GRANT ALL ON TABLE public.timeline_likes TO authenticated;
GRANT ALL ON TABLE public.timeline_likes TO service_role;


--
-- Name: TABLE timeline_shares; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.timeline_shares TO anon;
GRANT ALL ON TABLE public.timeline_shares TO authenticated;
GRANT ALL ON TABLE public.timeline_shares TO service_role;


--
-- Name: TABLE community_timeline_no_duplicates; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.community_timeline_no_duplicates TO anon;
GRANT ALL ON TABLE public.community_timeline_no_duplicates TO authenticated;
GRANT ALL ON TABLE public.community_timeline_no_duplicates TO service_role;


--
-- Name: TABLE content_embeddings; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.content_embeddings TO anon;
GRANT ALL ON TABLE public.content_embeddings TO authenticated;
GRANT ALL ON TABLE public.content_embeddings TO service_role;


--
-- Name: TABLE contracts; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.contracts TO anon;
GRANT ALL ON TABLE public.contracts TO authenticated;
GRANT ALL ON TABLE public.contracts TO service_role;


--
-- Name: TABLE contributions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.contributions TO anon;
GRANT ALL ON TABLE public.contributions TO authenticated;
GRANT ALL ON TABLE public.contributions TO service_role;


--
-- Name: TABLE conversation_participants; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.conversation_participants TO anon;
GRANT ALL ON TABLE public.conversation_participants TO authenticated;
GRANT ALL ON TABLE public.conversation_participants TO service_role;


--
-- Name: TABLE conversations; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.conversations TO anon;
GRANT ALL ON TABLE public.conversations TO authenticated;
GRANT ALL ON TABLE public.conversations TO service_role;


--
-- Name: TABLE messages; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.messages TO anon;
GRANT ALL ON TABLE public.messages TO authenticated;
GRANT ALL ON TABLE public.messages TO service_role;


--
-- Name: TABLE conversation_details; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.conversation_details TO anon;
GRANT ALL ON TABLE public.conversation_details TO authenticated;
GRANT ALL ON TABLE public.conversation_details TO service_role;


--
-- Name: TABLE enriched_timeline_events; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.enriched_timeline_events TO anon;
GRANT ALL ON TABLE public.enriched_timeline_events TO authenticated;
GRANT ALL ON TABLE public.enriched_timeline_events TO service_role;


--
-- Name: TABLE entity_wallets; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.entity_wallets TO anon;
GRANT ALL ON TABLE public.entity_wallets TO authenticated;
GRANT ALL ON TABLE public.entity_wallets TO service_role;


--
-- Name: TABLE event_attendees; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.event_attendees TO anon;
GRANT ALL ON TABLE public.event_attendees TO authenticated;
GRANT ALL ON TABLE public.event_attendees TO service_role;


--
-- Name: TABLE events; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.events TO anon;
GRANT ALL ON TABLE public.events TO authenticated;
GRANT ALL ON TABLE public.events TO service_role;


--
-- Name: TABLE follows; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.follows TO anon;
GRANT ALL ON TABLE public.follows TO authenticated;
GRANT ALL ON TABLE public.follows TO service_role;


--
-- Name: TABLE github_repo_cache; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.github_repo_cache TO anon;
GRANT ALL ON TABLE public.github_repo_cache TO authenticated;
GRANT ALL ON TABLE public.github_repo_cache TO service_role;


--
-- Name: TABLE group_activities; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.group_activities TO anon;
GRANT ALL ON TABLE public.group_activities TO authenticated;
GRANT ALL ON TABLE public.group_activities TO service_role;


--
-- Name: TABLE group_event_rsvps; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.group_event_rsvps TO anon;
GRANT ALL ON TABLE public.group_event_rsvps TO authenticated;
GRANT ALL ON TABLE public.group_event_rsvps TO service_role;


--
-- Name: TABLE group_events; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.group_events TO anon;
GRANT ALL ON TABLE public.group_events TO authenticated;
GRANT ALL ON TABLE public.group_events TO service_role;


--
-- Name: TABLE group_features; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.group_features TO anon;
GRANT ALL ON TABLE public.group_features TO authenticated;
GRANT ALL ON TABLE public.group_features TO service_role;


--
-- Name: TABLE group_invitations; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.group_invitations TO anon;
GRANT ALL ON TABLE public.group_invitations TO authenticated;
GRANT ALL ON TABLE public.group_invitations TO service_role;


--
-- Name: TABLE group_members; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.group_members TO anon;
GRANT ALL ON TABLE public.group_members TO authenticated;
GRANT ALL ON TABLE public.group_members TO service_role;


--
-- Name: TABLE group_proposals; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.group_proposals TO anon;
GRANT ALL ON TABLE public.group_proposals TO authenticated;
GRANT ALL ON TABLE public.group_proposals TO service_role;


--
-- Name: TABLE group_votes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.group_votes TO anon;
GRANT ALL ON TABLE public.group_votes TO authenticated;
GRANT ALL ON TABLE public.group_votes TO service_role;


--
-- Name: TABLE group_wallets; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.group_wallets TO anon;
GRANT ALL ON TABLE public.group_wallets TO authenticated;
GRANT ALL ON TABLE public.group_wallets TO service_role;


--
-- Name: TABLE groups; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.groups TO anon;
GRANT ALL ON TABLE public.groups TO authenticated;
GRANT ALL ON TABLE public.groups TO service_role;


--
-- Name: TABLE idempotency_results; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.idempotency_results TO anon;
GRANT ALL ON TABLE public.idempotency_results TO authenticated;
GRANT ALL ON TABLE public.idempotency_results TO service_role;


--
-- Name: TABLE integration_keys; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.integration_keys TO anon;
GRANT ALL ON TABLE public.integration_keys TO authenticated;
GRANT ALL ON TABLE public.integration_keys TO service_role;


--
-- Name: TABLE investments; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.investments TO anon;
GRANT ALL ON TABLE public.investments TO authenticated;
GRANT ALL ON TABLE public.investments TO service_role;


--
-- Name: TABLE loan_categories; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.loan_categories TO anon;
GRANT ALL ON TABLE public.loan_categories TO authenticated;
GRANT ALL ON TABLE public.loan_categories TO service_role;


--
-- Name: TABLE loan_collateral; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.loan_collateral TO anon;
GRANT ALL ON TABLE public.loan_collateral TO authenticated;
GRANT ALL ON TABLE public.loan_collateral TO service_role;


--
-- Name: TABLE loan_offers; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.loan_offers TO anon;
GRANT ALL ON TABLE public.loan_offers TO authenticated;
GRANT ALL ON TABLE public.loan_offers TO service_role;


--
-- Name: TABLE loan_payments; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.loan_payments TO anon;
GRANT ALL ON TABLE public.loan_payments TO authenticated;
GRANT ALL ON TABLE public.loan_payments TO service_role;


--
-- Name: TABLE message_read_receipts; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.message_read_receipts TO anon;
GRANT ALL ON TABLE public.message_read_receipts TO authenticated;
GRANT ALL ON TABLE public.message_read_receipts TO service_role;


--
-- Name: TABLE message_details; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.message_details TO anon;
GRANT ALL ON TABLE public.message_details TO authenticated;
GRANT ALL ON TABLE public.message_details TO service_role;


--
-- Name: TABLE notification_email_log; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.notification_email_log TO anon;
GRANT ALL ON TABLE public.notification_email_log TO authenticated;
GRANT ALL ON TABLE public.notification_email_log TO service_role;


--
-- Name: TABLE notification_preferences; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.notification_preferences TO anon;
GRANT ALL ON TABLE public.notification_preferences TO authenticated;
GRANT ALL ON TABLE public.notification_preferences TO service_role;


--
-- Name: TABLE notifications; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.notifications TO anon;
GRANT ALL ON TABLE public.notifications TO authenticated;
GRANT ALL ON TABLE public.notifications TO service_role;


--
-- Name: TABLE oauth_auth_codes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.oauth_auth_codes TO anon;
GRANT ALL ON TABLE public.oauth_auth_codes TO authenticated;
GRANT ALL ON TABLE public.oauth_auth_codes TO service_role;


--
-- Name: TABLE oauth_clients; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.oauth_clients TO anon;
GRANT ALL ON TABLE public.oauth_clients TO authenticated;
GRANT ALL ON TABLE public.oauth_clients TO service_role;


--
-- Name: TABLE oauth_refresh_tokens; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.oauth_refresh_tokens TO anon;
GRANT ALL ON TABLE public.oauth_refresh_tokens TO authenticated;
GRANT ALL ON TABLE public.oauth_refresh_tokens TO service_role;


--
-- Name: TABLE oauth_user_grants; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.oauth_user_grants TO anon;
GRANT ALL ON TABLE public.oauth_user_grants TO authenticated;
GRANT ALL ON TABLE public.oauth_user_grants TO service_role;


--
-- Name: TABLE orders; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.orders TO anon;
GRANT ALL ON TABLE public.orders TO authenticated;
GRANT ALL ON TABLE public.orders TO service_role;


--
-- Name: TABLE payment_intents; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.payment_intents TO anon;
GRANT ALL ON TABLE public.payment_intents TO authenticated;
GRANT ALL ON TABLE public.payment_intents TO service_role;


--
-- Name: TABLE platform_api_usage; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.platform_api_usage TO anon;
GRANT ALL ON TABLE public.platform_api_usage TO authenticated;
GRANT ALL ON TABLE public.platform_api_usage TO service_role;


--
-- Name: TABLE post_visibility; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.post_visibility TO anon;
GRANT ALL ON TABLE public.post_visibility TO authenticated;
GRANT ALL ON TABLE public.post_visibility TO service_role;


--
-- Name: TABLE project_categories; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.project_categories TO anon;
GRANT ALL ON TABLE public.project_categories TO authenticated;
GRANT ALL ON TABLE public.project_categories TO service_role;


--
-- Name: TABLE project_favorites; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.project_favorites TO anon;
GRANT ALL ON TABLE public.project_favorites TO authenticated;
GRANT ALL ON TABLE public.project_favorites TO service_role;


--
-- Name: TABLE project_media; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.project_media TO anon;
GRANT ALL ON TABLE public.project_media TO authenticated;
GRANT ALL ON TABLE public.project_media TO service_role;


--
-- Name: TABLE project_roles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.project_roles TO anon;
GRANT ALL ON TABLE public.project_roles TO authenticated;
GRANT ALL ON TABLE public.project_roles TO service_role;


--
-- Name: TABLE project_support; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.project_support TO anon;
GRANT ALL ON TABLE public.project_support TO authenticated;
GRANT ALL ON TABLE public.project_support TO service_role;


--
-- Name: TABLE project_support_stats; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.project_support_stats TO anon;
GRANT ALL ON TABLE public.project_support_stats TO authenticated;
GRANT ALL ON TABLE public.project_support_stats TO service_role;


--
-- Name: TABLE project_updates; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.project_updates TO anon;
GRANT ALL ON TABLE public.project_updates TO authenticated;
GRANT ALL ON TABLE public.project_updates TO service_role;


--
-- Name: TABLE research_contributions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.research_contributions TO anon;
GRANT ALL ON TABLE public.research_contributions TO authenticated;
GRANT ALL ON TABLE public.research_contributions TO service_role;


--
-- Name: TABLE research_entities; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.research_entities TO anon;
GRANT ALL ON TABLE public.research_entities TO authenticated;
GRANT ALL ON TABLE public.research_entities TO service_role;


--
-- Name: TABLE research_progress_updates; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.research_progress_updates TO anon;
GRANT ALL ON TABLE public.research_progress_updates TO authenticated;
GRANT ALL ON TABLE public.research_progress_updates TO service_role;


--
-- Name: TABLE research_votes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.research_votes TO anon;
GRANT ALL ON TABLE public.research_votes TO authenticated;
GRANT ALL ON TABLE public.research_votes TO service_role;


--
-- Name: TABLE schema_migrations; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.schema_migrations TO anon;
GRANT ALL ON TABLE public.schema_migrations TO authenticated;
GRANT ALL ON TABLE public.schema_migrations TO service_role;


--
-- Name: TABLE search_queries; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.search_queries TO anon;
GRANT ALL ON TABLE public.search_queries TO authenticated;
GRANT ALL ON TABLE public.search_queries TO service_role;


--
-- Name: SEQUENCE search_queries_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.search_queries_id_seq TO anon;
GRANT ALL ON SEQUENCE public.search_queries_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.search_queries_id_seq TO service_role;


--
-- Name: TABLE shipping_addresses; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.shipping_addresses TO anon;
GRANT ALL ON TABLE public.shipping_addresses TO authenticated;
GRANT ALL ON TABLE public.shipping_addresses TO service_role;


--
-- Name: TABLE stakeholder_relationships; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.stakeholder_relationships TO anon;
GRANT ALL ON TABLE public.stakeholder_relationships TO authenticated;
GRANT ALL ON TABLE public.stakeholder_relationships TO service_role;


--
-- Name: TABLE task_attention_flags; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.task_attention_flags TO anon;
GRANT ALL ON TABLE public.task_attention_flags TO authenticated;
GRANT ALL ON TABLE public.task_attention_flags TO service_role;


--
-- Name: TABLE task_completions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.task_completions TO anon;
GRANT ALL ON TABLE public.task_completions TO authenticated;
GRANT ALL ON TABLE public.task_completions TO service_role;


--
-- Name: TABLE task_projects; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.task_projects TO anon;
GRANT ALL ON TABLE public.task_projects TO authenticated;
GRANT ALL ON TABLE public.task_projects TO service_role;


--
-- Name: TABLE task_requests; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.task_requests TO anon;
GRANT ALL ON TABLE public.task_requests TO authenticated;
GRANT ALL ON TABLE public.task_requests TO service_role;


--
-- Name: TABLE tasks; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.tasks TO anon;
GRANT ALL ON TABLE public.tasks TO authenticated;
GRANT ALL ON TABLE public.tasks TO service_role;


--
-- Name: TABLE timeline_dislikes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.timeline_dislikes TO anon;
GRANT ALL ON TABLE public.timeline_dislikes TO authenticated;
GRANT ALL ON TABLE public.timeline_dislikes TO service_role;


--
-- Name: TABLE timeline_event_stats; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.timeline_event_stats TO anon;
GRANT ALL ON TABLE public.timeline_event_stats TO authenticated;
GRANT ALL ON TABLE public.timeline_event_stats TO service_role;


--
-- Name: TABLE timeline_event_visibility; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.timeline_event_visibility TO anon;
GRANT ALL ON TABLE public.timeline_event_visibility TO authenticated;
GRANT ALL ON TABLE public.timeline_event_visibility TO service_role;


--
-- Name: TABLE timeline_interactions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.timeline_interactions TO anon;
GRANT ALL ON TABLE public.timeline_interactions TO authenticated;
GRANT ALL ON TABLE public.timeline_interactions TO service_role;


--
-- Name: TABLE transactions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.transactions TO anon;
GRANT ALL ON TABLE public.transactions TO authenticated;
GRANT ALL ON TABLE public.transactions TO service_role;


--
-- Name: TABLE transparency_scores; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.transparency_scores TO anon;
GRANT ALL ON TABLE public.transparency_scores TO authenticated;
GRANT ALL ON TABLE public.transparency_scores TO service_role;


--
-- Name: TABLE typing_indicators; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.typing_indicators TO anon;
GRANT ALL ON TABLE public.typing_indicators TO authenticated;
GRANT ALL ON TABLE public.typing_indicators TO service_role;


--
-- Name: TABLE user_api_keys; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.user_api_keys TO anon;
GRANT ALL ON TABLE public.user_api_keys TO authenticated;
GRANT ALL ON TABLE public.user_api_keys TO service_role;


--
-- Name: TABLE user_causes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.user_causes TO anon;
GRANT ALL ON TABLE public.user_causes TO authenticated;
GRANT ALL ON TABLE public.user_causes TO service_role;


--
-- Name: TABLE user_documents; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.user_documents TO anon;
GRANT ALL ON TABLE public.user_documents TO authenticated;
GRANT ALL ON TABLE public.user_documents TO service_role;


--
-- Name: TABLE user_economic_profile; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.user_economic_profile TO anon;
GRANT ALL ON TABLE public.user_economic_profile TO authenticated;
GRANT ALL ON TABLE public.user_economic_profile TO service_role;


--
-- Name: TABLE user_nudges; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.user_nudges TO anon;
GRANT ALL ON TABLE public.user_nudges TO authenticated;
GRANT ALL ON TABLE public.user_nudges TO service_role;


--
-- Name: TABLE user_plans; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.user_plans TO anon;
GRANT ALL ON TABLE public.user_plans TO authenticated;
GRANT ALL ON TABLE public.user_plans TO service_role;


--
-- Name: TABLE user_presence; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.user_presence TO anon;
GRANT ALL ON TABLE public.user_presence TO authenticated;
GRANT ALL ON TABLE public.user_presence TO service_role;


--
-- Name: TABLE user_products; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.user_products TO anon;
GRANT ALL ON TABLE public.user_products TO authenticated;
GRANT ALL ON TABLE public.user_products TO service_role;


--
-- Name: TABLE user_services; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.user_services TO anon;
GRANT ALL ON TABLE public.user_services TO authenticated;
GRANT ALL ON TABLE public.user_services TO service_role;


--
-- Name: TABLE wallets; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.wallets TO anon;
GRANT ALL ON TABLE public.wallets TO authenticated;
GRANT ALL ON TABLE public.wallets TO service_role;


--
-- Name: TABLE webhook_deliveries; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.webhook_deliveries TO anon;
GRANT ALL ON TABLE public.webhook_deliveries TO authenticated;
GRANT ALL ON TABLE public.webhook_deliveries TO service_role;


--
-- Name: TABLE webhook_endpoints; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.webhook_endpoints TO anon;
GRANT ALL ON TABLE public.webhook_endpoints TO authenticated;
GRANT ALL ON TABLE public.webhook_endpoints TO service_role;


--
-- Name: TABLE wishlist_contributions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.wishlist_contributions TO anon;
GRANT ALL ON TABLE public.wishlist_contributions TO authenticated;
GRANT ALL ON TABLE public.wishlist_contributions TO service_role;


--
-- Name: TABLE wishlist_feedback; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.wishlist_feedback TO anon;
GRANT ALL ON TABLE public.wishlist_feedback TO authenticated;
GRANT ALL ON TABLE public.wishlist_feedback TO service_role;


--
-- Name: TABLE wishlist_fulfillment_proofs; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.wishlist_fulfillment_proofs TO anon;
GRANT ALL ON TABLE public.wishlist_fulfillment_proofs TO authenticated;
GRANT ALL ON TABLE public.wishlist_fulfillment_proofs TO service_role;


--
-- Name: TABLE wishlist_item_with_stats; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.wishlist_item_with_stats TO anon;
GRANT ALL ON TABLE public.wishlist_item_with_stats TO authenticated;
GRANT ALL ON TABLE public.wishlist_item_with_stats TO service_role;


--
-- Name: TABLE wishlist_items; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.wishlist_items TO anon;
GRANT ALL ON TABLE public.wishlist_items TO authenticated;
GRANT ALL ON TABLE public.wishlist_items TO service_role;


--
-- Name: TABLE wishlist_with_stats; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.wishlist_with_stats TO anon;
GRANT ALL ON TABLE public.wishlist_with_stats TO authenticated;
GRANT ALL ON TABLE public.wishlist_with_stats TO service_role;


--
-- Name: TABLE wishlists; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.wishlists TO anon;
GRANT ALL ON TABLE public.wishlists TO authenticated;
GRANT ALL ON TABLE public.wishlists TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES  TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES  TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES  TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES  TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS  TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS  TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS  TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS  TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES  TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES  TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES  TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES  TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- PostgreSQL database dump complete
--

