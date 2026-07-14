/**
 * GET /api/profile/[identifier] - Get profile by username or email
 *
 * Supports both username and email lookups for viewing other users' profiles.
 * Thin HTTP layer — business rules live in @/services/profile/publicProfile.server.
 */

import { withOptionalAuth } from '@/lib/api/withAuth';
import { apiSuccess, apiNotFound, handleApiError } from '@/lib/api/standardResponse';
import {
  getPublicProfileByIdentifier,
  type PublicProfileResult,
} from '@/services/profile/publicProfile.server';

interface RouteContext {
  params: Promise<{ identifier: string }>;
}

/** Map a domain PublicProfileResult onto the matching HTTP response. */
function toResponse(result: PublicProfileResult) {
  if (result.ok) {
    return apiSuccess(result.data);
  }
  if ('dbError' in result) {
    return handleApiError(result.dbError);
  }
  return apiNotFound(result.message);
}

export const GET = withOptionalAuth(async (request, context: RouteContext) => {
  try {
    const { identifier } = await context.params;

    if (!identifier?.trim()) {
      return apiNotFound('Profile identifier is required');
    }

    return toResponse(await getPublicProfileByIdentifier(request.supabase, identifier.trim()));
  } catch (error) {
    return handleApiError(error);
  }
});
