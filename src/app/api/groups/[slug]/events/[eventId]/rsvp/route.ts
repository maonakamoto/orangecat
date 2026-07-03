/**
 * Event RSVP API
 *
 * POST /api/groups/[slug]/events/[eventId]/rsvp - RSVP to event
 */

import { withAuth, type AuthenticatedRequest } from '@/lib/api/withAuth';
import {
  apiSuccess,
  apiForbidden,
  apiNotFound,
  apiValidationError,
  apiRateLimited,
  handleApiError,
} from '@/lib/api/standardResponse';
import { rateLimitWriteAsync, retryAfterSeconds } from '@/lib/rate-limit';
import { validateUUID, getValidationError } from '@/lib/api/validation';
import { DATABASE_TABLES } from '@/config/database-tables';
import { fetchProfilesMap } from '@/services/groups/eventProfiles';
import { logger } from '@/utils/logger';
import { z } from 'zod';
import { STATUS } from '@/config/database-constants';

const rsvpSchema = z.object({
  status: z.enum(Object.values(STATUS.GROUP_EVENT_RSVPS) as [string, ...string[]]),
});

export const POST = withAuth(
  async (
    req: AuthenticatedRequest,
    { params }: { params: Promise<{ slug: string; eventId: string }> }
  ) => {
    const { slug, eventId } = await params;
    const idValidation = getValidationError(validateUUID(eventId, 'event ID'));
    if (idValidation) {
      return idValidation;
    }
    try {
      const { user } = req;

      const rl = await rateLimitWriteAsync(user.id);
      if (!rl.success) {
        return apiRateLimited('Too many RSVP requests. Please slow down.', retryAfterSeconds(rl));
      }

      const { supabase } = req;

      const { data: group, error: groupError } = await supabase
        .from(DATABASE_TABLES.GROUPS)
        .select('id')
        .eq('slug', slug)
        .single();
      if (groupError || !group) {
        return apiNotFound('Group not found');
      }

      const { data: event, error: eventError } = await supabase
        .from(DATABASE_TABLES.GROUP_EVENTS)
        .select('id, group_id, is_public, requires_rsvp')
        .eq('id', eventId)
        .eq('group_id', group.id)
        .single();
      if (eventError || !event) {
        return apiNotFound('Event not found');
      }

      if (!event.is_public) {
        const { data: membership } = await supabase
          .from(DATABASE_TABLES.GROUP_MEMBERS)
          .select('id')
          .eq('group_id', group.id)
          .eq('user_id', user.id)
          .maybeSingle();
        if (!membership) {
          return apiForbidden('You do not have access to this event');
        }
      }

      const body = await req.json();
      const validation = rsvpSchema.safeParse(body);
      if (!validation.success) {
        return apiValidationError('Invalid request data', {
          fields: validation.error.issues.map(i => ({
            field: i.path.join('.'),
            message: i.message,
          })),
        });
      }

      // user_id references auth.users (not profiles) — profile is fetched
      // separately via fetchProfilesMap instead of a broken embed.
      const { data: rsvp, error: rsvpError } = await supabase
        .from(DATABASE_TABLES.GROUP_EVENT_RSVPS)
        .upsert(
          { event_id: eventId, user_id: user.id, status: validation.data.status },
          { onConflict: 'event_id,user_id' }
        )
        .select('*')
        .single();

      if (rsvpError) {
        logger.error('Failed to RSVP to event', { error: rsvpError, eventId }, 'Groups');
        return handleApiError(rsvpError);
      }

      const profiles = await fetchProfilesMap(supabase, [user.id]);
      return apiSuccess({
        rsvp: { ...rsvp, user: profiles.get(user.id) ?? null },
        message: `RSVP updated to ${validation.data.status}`,
      });
    } catch (error) {
      logger.error('Event RSVP error', { error }, 'Groups');
      return handleApiError(error);
    }
  }
);
