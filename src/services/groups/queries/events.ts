/**
 * Groups Events Query Functions
 *
 * Handles fetching events for groups.
 *
 * Created: 2025-12-30
 * Last Modified: 2025-12-30
 * Last Modified Summary: Initial implementation
 */

import supabase from '@/lib/supabase/browser';
import { logger } from '@/utils/logger';
import { getCurrentUserId } from '../utils/helpers';
import { DATABASE_TABLES } from '@/config/database-tables';
import {
  attachEventProfiles,
  attachRsvpProfiles,
  fetchProfilesMap,
} from '@/services/groups/eventProfiles';
import type { EventsQuery, EventsListResponse, EventResponse, RsvpsListResponse } from '../types';
import type { AnySupabaseClient } from '@/lib/supabase/types';

/**
 * Get events for a group
 */
export async function getGroupEvents(
  groupId: string,
  options?: EventsQuery,
  client?: AnySupabaseClient
): Promise<EventsListResponse> {
  try {
    const sb = client || supabase;
    const _userId = await getCurrentUserId(sb);

    // creator_id / rsvp user_id reference auth.users (not profiles), so
    // profiles cannot be embedded — attachEventProfiles splits the lookup.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (sb.from(DATABASE_TABLES.GROUP_EVENTS) as any)
      .select(`*, rsvps:group_event_rsvps (id, user_id, status)`, { count: 'exact' })
      .eq('group_id', groupId)
      .order('starts_at', { ascending: true });

    // Filter by status
    if (options?.status === 'upcoming') {
      query = query.gte('starts_at', new Date().toISOString());
    } else if (options?.status === 'past') {
      query = query.lt('starts_at', new Date().toISOString());
    }
    // 'all' or undefined shows all events

    // Filter by event type
    if (options?.event_type) {
      query = query.eq('event_type', options.event_type);
    }

    // Pagination
    if (options?.limit) {
      const offset = options.offset || 0;
      query = query.range(offset, offset + options.limit - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      logger.error('Failed to fetch group events', error, 'Groups');
      return { success: false, error: error.message };
    }

    return { success: true, events: await attachEventProfiles(sb, data || []), total: count || 0 };
  } catch (error) {
    logger.error('Exception fetching group events', error, 'Groups');
    return { success: false, error: 'Failed to fetch events' };
  }
}

/**
 * Get a single event by ID
 */
export async function getEvent(
  eventId: string,
  client?: AnySupabaseClient
): Promise<EventResponse> {
  try {
    const sb = client || supabase;
    const _userId = await getCurrentUserId(sb);

    // creator_id / rsvp user_id reference auth.users (not profiles), so
    // profiles cannot be embedded — attachEventProfiles splits the lookup.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (sb.from(DATABASE_TABLES.GROUP_EVENTS) as any)
      .select(
        `
        *,
        group:groups!group_events_group_id_fkey (
          id,
          name,
          slug,
          avatar_url
        ),
        rsvps:group_event_rsvps (
          id,
          user_id,
          status,
          created_at
        )
      `
      )
      .eq('id', eventId)
      .single();

    if (error) {
      logger.error('Failed to fetch event', error, 'Groups');
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: 'Event not found' };
    }

    const [event] = await attachEventProfiles(sb, [data]);
    return { success: true, event };
  } catch (error) {
    logger.error('Exception fetching event', error, 'Groups');
    return { success: false, error: 'Failed to fetch event' };
  }
}

/**
 * Get RSVPs for an event
 */
export async function getEventRsvps(
  eventId: string,
  client?: AnySupabaseClient
): Promise<RsvpsListResponse> {
  try {
    const sb = client || supabase;
    const userId = await getCurrentUserId(sb);
    if (!userId) {
      return { success: false, error: 'Authentication required' };
    }

    // First check if user can access the event
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: event } = await (sb.from(DATABASE_TABLES.GROUP_EVENTS) as any)
      .select('id, is_public, group_id')
      .eq('id', eventId)
      .single();

    if (!event) {
      return { success: false, error: 'Event not found' };
    }

    // Get RSVPs — user_id references auth.users (not profiles), so the
    // profile lookup is split (fetchProfilesMap) instead of embedded.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error, count } = await (sb.from(DATABASE_TABLES.GROUP_EVENT_RSVPS) as any)
      .select('*', { count: 'exact' })
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to fetch event RSVPs', error, 'Groups');
      return { success: false, error: error.message };
    }

    const rsvps = data || [];
    const profiles = await fetchProfilesMap(
      sb,
      rsvps.map((r: { user_id: string }) => r.user_id)
    );
    return { success: true, rsvps: attachRsvpProfiles(rsvps, profiles), total: count || 0 };
  } catch (error) {
    logger.error('Exception fetching event RSVPs', error, 'Groups');
    return { success: false, error: 'Failed to fetch RSVPs' };
  }
}

/**
 * Get upcoming events for a group
 */
export async function getUpcomingEvents(
  groupId: string,
  limit: number = 5,
  client?: AnySupabaseClient
): Promise<EventsListResponse> {
  try {
    return await getGroupEvents(
      groupId,
      {
        status: 'upcoming',
        limit,
        offset: 0,
      },
      client
    );
  } catch (error) {
    logger.error('Exception fetching upcoming events', error, 'Groups');
    return { success: false, error: 'Failed to fetch upcoming events' };
  }
}

/**
 * Get user's RSVP status for an event
 */
export async function getUserRsvpStatus(
  eventId: string,
  client?: AnySupabaseClient
): Promise<{ success: boolean; status?: string; error?: string }> {
  try {
    const sb = client || supabase;
    const userId = await getCurrentUserId(sb);
    if (!userId) {
      return { success: false, error: 'Authentication required' };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (sb.from(DATABASE_TABLES.GROUP_EVENT_RSVPS) as any)
      .select('status')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      logger.error('Failed to fetch user RSVP status', error, 'Groups');
      return { success: false, error: error.message };
    }

    return { success: true, status: data?.status };
  } catch (error) {
    logger.error('Exception fetching user RSVP status', error, 'Groups');
    return { success: false, error: 'Failed to fetch RSVP status' };
  }
}
