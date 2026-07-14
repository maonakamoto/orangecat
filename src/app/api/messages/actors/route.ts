/**
 * Messaging Actors API
 *
 * GET /api/messages/actors - Get actors the user can send messages as
 *
 * Returns:
 * - User's personal actor (always)
 * - Group actors (if user is admin/moderator of the group)
 *
 * Thin HTTP layer — actor resolution + DB access live in
 * @/features/messaging/api-helpers.server.
 */

import { withAuth, type AuthenticatedRequest } from '@/lib/api/withAuth';
import { apiSuccess, handleApiError } from '@/lib/api/standardResponse';
import { logger } from '@/utils/logger';
import { fetchMessagingActors } from '@/features/messaging/api-helpers.server';

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const actors = await fetchMessagingActors(req.user.id);
    return apiSuccess({ actors });
  } catch (error) {
    logger.error('Messaging actors API error', { error }, 'MessagingActors');
    return handleApiError(error);
  }
});
