-- ============================================================================
-- Fix timeline-feed RPCs: stale follows references (DRAFT — review before apply)
-- ============================================================================
--
-- DB-side twin of the code fix in commit f0591ea5 (getFollowedUsersFeed).
--
-- Two timeline RPCs created in 20260115000000_fix_timeline_schema_and_functions
-- resolve the set of followed actors with:
--
--     SELECT followed_id FROM user_follows WHERE follower_id = p_user_id
--     UNION
--     SELECT followed_id FROM follows      WHERE follower_id = p_user_id
--
-- Both branches are now wrong against the live self-hosted schema:
--   1. `user_follows` was DROPPED in 20260404000003_drop_dead_tables.sql
--      (0 code references; `follows` is the active table).
--   2. The surviving `follows` table's column is `following_id`, NOT
--      `followed_id` — selecting `followed_id` raises
--      "column followed_id does not exist".
--
-- Net effect in production: every call to get_user_timeline_feed
-- (used by src/services/timeline/queries/userFeeds.ts) errors on the
-- follow branch, so the "people you follow" portion of the feed is broken.
--
-- This migration recreates both functions with the single correct source:
--     SELECT following_id FROM follows WHERE follower_id = p_user_id
-- Bodies are otherwise byte-for-byte identical to the originals.
--
-- Idempotent: CREATE OR REPLACE only. No data change, no table change.
-- get_enriched_timeline_feed may not yet exist in live (per userFeeds.ts
-- comment); CREATE OR REPLACE simply (re)creates it correctly.
-- ============================================================================

-- Get user timeline feed
CREATE OR REPLACE FUNCTION public.get_user_timeline_feed(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS SETOF timeline_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Get enriched user timeline feed (with counts and user interaction status)
CREATE OR REPLACE FUNCTION public.get_enriched_timeline_feed(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  event_type TEXT,
  actor_id UUID,
  content JSONB,
  visibility TEXT,
  created_at TIMESTAMPTZ,
  like_count INTEGER,
  share_count INTEGER,
  comment_count INTEGER,
  user_liked BOOLEAN,
  user_shared BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

GRANT EXECUTE ON FUNCTION public.get_user_timeline_feed TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_enriched_timeline_feed TO authenticated;
