/**
 * Group-event profile enrichment (split-query pattern)
 *
 * On the live DB, `group_events.creator_id` and `group_event_rsvps.user_id`
 * reference `auth.users` — NOT `profiles` — so PostgREST embeds like
 * `profiles!group_events_creator_id_fkey` 400 and silently break the whole
 * query. Like fetchEntityOwner, we split the query: fetch the rows first,
 * then batch-fetch the profiles and attach them.
 */

import { DATABASE_TABLES } from '@/config/database-tables';
import type { AnySupabaseClient } from '@/lib/supabase/types';

export interface EventProfile {
  id: string;
  name: string | null;
  avatar_url: string | null;
}

interface RsvpLike {
  user_id: string;
}

interface EventLike {
  creator_id: string;
  rsvps?: RsvpLike[];
}

/** Batch-fetch minimal profiles for a set of user ids (one query). */
export async function fetchProfilesMap(
  supabase: AnySupabaseClient,
  userIds: Array<string | null | undefined>
): Promise<Map<string, EventProfile>> {
  const ids = [...new Set(userIds.filter((id): id is string => Boolean(id)))];
  if (ids.length === 0) {
    return new Map();
  }
  const { data } = await supabase
    .from(DATABASE_TABLES.PROFILES)
    .select('id, name, avatar_url')
    .in('id', ids);
  const profiles = (data as EventProfile[] | null) || [];
  return new Map(profiles.map(p => [p.id, p]));
}

/** Attach `user` profiles to RSVP rows. */
export function attachRsvpProfiles<R extends RsvpLike>(
  rsvps: R[],
  profiles: Map<string, EventProfile>
): Array<R & { user: EventProfile | null }> {
  return rsvps.map(rsvp => ({ ...rsvp, user: profiles.get(rsvp.user_id) ?? null }));
}

/**
 * Attach `creator` (and nested RSVP `user`) profiles to event rows.
 * One profiles query for the whole batch.
 */
export async function attachEventProfiles<E extends EventLike>(
  supabase: AnySupabaseClient,
  events: E[]
): Promise<Array<E & { creator: EventProfile | null }>> {
  const userIds = events.flatMap(event => [
    event.creator_id,
    ...(event.rsvps?.map(rsvp => rsvp.user_id) ?? []),
  ]);
  const profiles = await fetchProfilesMap(supabase, userIds);

  return events.map(event => ({
    ...event,
    creator: profiles.get(event.creator_id) ?? null,
    rsvps: event.rsvps ? attachRsvpProfiles(event.rsvps, profiles) : event.rsvps,
  }));
}
