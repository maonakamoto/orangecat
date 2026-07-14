/**
 * Invitation Response API
 *
 * POST   /api/invitations/[id] - Accept or decline invitation
 * DELETE /api/invitations/[id] - Revoke invitation (admin only)
 *
 * Thin HTTP layer — business rules live in @/domain/groups/invitations.server.
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
  respondToInvitation,
  revokeInvitation,
  type InvitationResult,
} from '@/domain/groups/invitations.server';

const responseSchema = z.object({ action: z.enum(['accept', 'decline']) });

/** Map a domain InvitationResult onto the matching HTTP response. */
function toResponse(result: InvitationResult) {
  if (result.ok) {
    return apiSuccess({ message: result.message, group_slug: result.group_slug });
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

export const POST = withAuth(
  async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id: invitationId } = await params;
    const idValidation = getValidationError(validateUUID(invitationId, 'invitation ID'));
    if (idValidation) {
      return idValidation;
    }
    try {
      const { user, supabase } = req;

      const rl = await rateLimitWriteAsync(user.id);
      if (!rl.success) {
        return apiRateLimited(
          'Too many invitation requests. Please slow down.',
          retryAfterSeconds(rl)
        );
      }

      const validation = responseSchema.safeParse(await req.json());
      if (!validation.success) {
        return apiValidationError('Invalid request', {
          fields: validation.error.issues.map(i => ({
            field: i.path.join('.'),
            message: i.message,
          })),
        });
      }

      return toResponse(
        await respondToInvitation(supabase, invitationId, user.id, validation.data.action)
      );
    } catch (error) {
      logger.error('Invitation response error', { error }, 'Groups');
      return handleApiError(error);
    }
  }
);

export const DELETE = withAuth(
  async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id: invitationId } = await params;
    const idValidation = getValidationError(validateUUID(invitationId, 'invitation ID'));
    if (idValidation) {
      return idValidation;
    }
    try {
      const { user, supabase } = req;

      const rl = await rateLimitWriteAsync(user.id);
      if (!rl.success) {
        return apiRateLimited('Too many requests. Please slow down.', retryAfterSeconds(rl));
      }

      return toResponse(await revokeInvitation(supabase, invitationId, user.id));
    } catch (error) {
      logger.error('Invitation revoke error', { error }, 'Groups');
      return handleApiError(error);
    }
  }
);
