/**
 * Notification Preferences API
 *
 * GET /api/notifications/preferences - Read (creating defaults on first access)
 * PUT /api/notifications/preferences - Validated partial update
 *
 * Thin HTTP layer — business rules live in @/services/notifications/preferences.server.
 */

import { withAuth, type AuthenticatedRequest } from '@/lib/api/withAuth';
import { createAdminClient } from '@/lib/supabase/admin';
import type { AnySupabaseClient } from '@/lib/supabase/types';
import {
  apiSuccess,
  apiBadRequest,
  handleApiError,
  apiRateLimited,
} from '@/lib/api/standardResponse';
import { rateLimitWriteAsync, retryAfterSeconds } from '@/lib/rate-limit';
import { logger } from '@/utils/logger';
import type { NotificationPreferencesUpdate } from '@/types/notification-preferences';
import {
  getPreferences,
  updatePreferences,
  type PreferencesResult,
} from '@/services/notifications/preferences.server';

/** Map a domain PreferencesResult onto the matching HTTP response. */
function toResponse<T>(result: PreferencesResult<T>) {
  if (result.ok) {
    return apiSuccess(result.data);
  }
  if ('dbError' in result) {
    return handleApiError(result.dbError);
  }
  return apiBadRequest(result.message);
}

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const admin = createAdminClient() as unknown as AnySupabaseClient;
    return toResponse(await getPreferences(admin, req.user.id));
  } catch (error) {
    logger.error('Notification preferences GET error', { error }, 'NotificationPrefs');
    return handleApiError(error);
  }
});

export const PUT = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const { user } = req;

    const rl = await rateLimitWriteAsync(user.id);
    if (!rl.success) {
      return apiRateLimited('Too many requests. Please slow down.', retryAfterSeconds(rl));
    }

    const body = (await req.json()) as NotificationPreferencesUpdate;
    const admin = createAdminClient() as unknown as AnySupabaseClient;
    return toResponse(await updatePreferences(admin, user.id, body));
  } catch (error) {
    logger.error('Notification preferences PUT error', { error }, 'NotificationPrefs');
    return handleApiError(error);
  }
});
