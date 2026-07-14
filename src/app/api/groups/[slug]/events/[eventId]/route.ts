/**
 * Individual Event API — GET (details), PUT (update, creator/admin),
 * DELETE (creator/admin). Thin HTTP layer; business rules live in
 * @/domain/groups/events.server.
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
import { logger } from '@/utils/logger';
import { z } from 'zod';
import { validateUUID, getValidationError } from '@/lib/api/validation';
import {
  getGroupEvent,
  authorizeGroupEventEdit,
  applyGroupEventUpdate,
  removeGroupEvent,
  type EventResult,
} from '@/domain/groups/events.server';
import { STATUS } from '@/config/database-constants';

const updateEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  event_type: z.enum(Object.values(STATUS.GROUP_EVENTS) as [string, ...string[]]).optional(),
  location_type: z
    .enum(Object.values(STATUS.GROUP_EVENT_LOCATION_TYPES) as [string, ...string[]])
    .optional(),
  location_details: z.string().max(500).optional(),
  starts_at: z.string().datetime().optional(),
  ends_at: z.string().datetime().optional(),
  timezone: z.string().optional(),
  max_attendees: z.number().int().positive().optional(),
  is_public: z.boolean().optional(),
  requires_rsvp: z.boolean().optional(),
});

/** Map a domain EventResult onto the matching HTTP response. */
function toResponse<T>(result: EventResult<T>) {
  if (result.ok) {
    return apiSuccess(result.data);
  }
  if ('dbError' in result) {
    return handleApiError(result.dbError);
  }
  switch (result.code) {
    case 'not_found':
      return apiNotFound(result.message);
    case 'forbidden':
      return apiForbidden(result.message);
    default:
      return apiValidationError(result.message);
  }
}

export const GET = withAuth(
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
      const { user, supabase } = req;
      return toResponse(await getGroupEvent(supabase, slug, eventId, user.id));
    } catch (error) {
      logger.error('Event GET error', { error }, 'Groups');
      return handleApiError(error);
    }
  }
);

export const PUT = withAuth(
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
      const { user, supabase } = req;

      const rl = await rateLimitWriteAsync(user.id);
      if (!rl.success) {
        return apiRateLimited('Too many requests. Please slow down.', retryAfterSeconds(rl));
      }

      const authz = await authorizeGroupEventEdit(supabase, slug, eventId, user.id, 'update');
      if (!authz.ok) {
        return toResponse(authz);
      }

      const validation = updateEventSchema.safeParse(await req.json());
      if (!validation.success) {
        return apiValidationError('Invalid request data', validation.error.flatten());
      }

      return toResponse(await applyGroupEventUpdate(supabase, eventId, validation.data));
    } catch (error) {
      logger.error('Event PUT error', { error }, 'Groups');
      return handleApiError(error);
    }
  }
);

export const DELETE = withAuth(
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
      const { user, supabase } = req;

      const rl = await rateLimitWriteAsync(user.id);
      if (!rl.success) {
        return apiRateLimited('Too many requests. Please slow down.', retryAfterSeconds(rl));
      }

      const authz = await authorizeGroupEventEdit(supabase, slug, eventId, user.id, 'delete');
      if (!authz.ok) {
        return toResponse(authz);
      }

      return toResponse(await removeGroupEvent(supabase, eventId));
    } catch (error) {
      logger.error('Event DELETE error', { error }, 'Groups');
      return handleApiError(error);
    }
  }
);
