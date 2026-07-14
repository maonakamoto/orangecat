/**
 * Group event domain logic (server-only).
 *
 * Read-with-relations (private-event gating), and creator/admin-gated update and
 * delete for group events. Kept out of the API route so it stays a thin
 * validate → delegate → respond wrapper. Each function returns a discriminated
 * result the route maps to an HTTP response (no HTTP concerns in this layer).
 *
 * Update/delete are split into an authorize step and an apply step so the route
 * can preserve its original ordering (permission gate before body validation).
 */

import { DATABASE_TABLES } from '@/config/database-tables';
import { logger } from '@/utils/logger';
import { resolveGroupBySlug, canEditEvent, checkGroupMember } from '@/domain/groups/helpers.server';
import { attachEventProfiles } from '@/services/groups/eventProfiles';
import type { AnySupabaseClient } from '@/lib/supabase/types';

/** Outcome codes the route maps to apiNotFound / apiForbidden / apiValidationError. */
export type EventErrorCode = 'not_found' | 'forbidden' | 'invalid';

export type EventResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: EventErrorCode; message: string }
  | { ok: false; dbError: unknown };

/** Fetch a single event (with group + rsvps + attached profiles), gating private events to members. */
export async function getGroupEvent(
  supabase: AnySupabaseClient,
  slug: string,
  eventId: string,
  userId: string
): Promise<EventResult<{ event: Record<string, unknown> }>> {
  const group = await resolveGroupBySlug(supabase, slug);
  if (!group) {
    return { ok: false, code: 'not_found', message: 'Group not found' };
  }

  // creator_id / rsvp user_id reference auth.users (not profiles), so
  // profiles cannot be embedded — attachEventProfiles splits the lookup.
  const { data: event, error: eventError } = await supabase
    .from(DATABASE_TABLES.GROUP_EVENTS)
    .select(
      `*, group:groups!group_events_group_id_fkey (id, name, slug, avatar_url),
      rsvps:group_event_rsvps (id, user_id, status, created_at)`
    )
    .eq('id', eventId)
    .eq('group_id', group.id)
    .single();

  if (eventError || !event) {
    return { ok: false, code: 'not_found', message: 'Event not found' };
  }
  if (!event.is_public && !(await checkGroupMember(supabase, group.id, userId))) {
    return { ok: false, code: 'forbidden', message: 'This event is private' };
  }

  const [enrichedEvent] = await attachEventProfiles(supabase, [event]);
  return { ok: true, data: { event: enrichedEvent } };
}

/**
 * Authorize a creator/admin edit or delete: resolves the group, confirms the
 * event belongs to it, and checks the actor may modify it. Returns the group id
 * on success. `action` shapes the forbidden message ('update' | 'delete').
 */
export async function authorizeGroupEventEdit(
  supabase: AnySupabaseClient,
  slug: string,
  eventId: string,
  userId: string,
  action: 'update' | 'delete'
): Promise<EventResult<{ groupId: string }>> {
  const group = await resolveGroupBySlug(supabase, slug);
  if (!group) {
    return { ok: false, code: 'not_found', message: 'Group not found' };
  }

  const { data: event, error: eventError } = await supabase
    .from(DATABASE_TABLES.GROUP_EVENTS)
    .select('id, group_id, creator_id')
    .eq('id', eventId)
    .eq('group_id', group.id)
    .single();
  if (eventError || !event) {
    return { ok: false, code: 'not_found', message: 'Event not found' };
  }
  if (!(await canEditEvent(supabase, group.id, userId, event.creator_id))) {
    return {
      ok: false,
      code: 'forbidden',
      message: `Only event creator or group admins can ${action} events`,
    };
  }

  return { ok: true, data: { groupId: group.id } };
}

/** Apply a validated patch to an already-authorized event. */
export async function applyGroupEventUpdate(
  supabase: AnySupabaseClient,
  eventId: string,
  patch: Record<string, unknown>
): Promise<EventResult<{ event: Record<string, unknown> }>> {
  const { data: updatedEvent, error: updateError } = await supabase
    .from(DATABASE_TABLES.GROUP_EVENTS)
    .update(patch)
    .eq('id', eventId)
    .select()
    .single();
  if (updateError) {
    logger.error('Failed to update event', { error: updateError, eventId }, 'Groups');
    return { ok: false, dbError: updateError };
  }

  return { ok: true, data: { event: updatedEvent } };
}

/** Delete an already-authorized event. */
export async function removeGroupEvent(
  supabase: AnySupabaseClient,
  eventId: string
): Promise<EventResult<{ message: string }>> {
  const { error: deleteError } = await supabase
    .from(DATABASE_TABLES.GROUP_EVENTS)
    .delete()
    .eq('id', eventId);
  if (deleteError) {
    logger.error('Failed to delete event', { error: deleteError, eventId }, 'Groups');
    return { ok: false, dbError: deleteError };
  }

  return { ok: true, data: { message: 'Event deleted successfully' } };
}
