-- ============================================================================
-- Home / "Following" feed.
--
-- get_user_timeline_feed mixes in ALL public posts (own OR followed OR public),
-- so it's effectively the community firehose — there was no true "people you
-- follow" home feed. This RPC returns ONLY the user's own posts plus posts from
-- actors they follow (no public-everyone branch) — the Twitter-style home feed.
--
-- Note: despite the column name, timeline_events.actor_id and follows.*_id are
-- USER ids here (verified: actor_id matches profiles 1359/1359; follows match
-- profiles 5/5), so the user/follow join is by user id.
-- ============================================================================

create or replace function public.get_following_feed(
  p_user_id uuid,
  p_limit integer default 20,
  p_offset integer default 0
)
returns setof timeline_events
language plpgsql
security definer
set search_path to 'public'
as $function$
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
$function$;
