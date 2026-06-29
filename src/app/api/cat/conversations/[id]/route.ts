/**
 * Cat Conversation (by id) API
 *
 * GET    /api/cat/conversations/[id]  - Messages for one conversation (switching)
 * DELETE /api/cat/conversations/[id]  - Delete the conversation and its messages
 */

import { getMessagesForDisplay, deleteConversation } from '@/services/cat/conversation-history';
import {
  apiSuccess,
  apiRateLimited,
  apiNotFound,
  handleApiError,
} from '@/lib/api/standardResponse';
import { rateLimitWriteAsync, retryAfterSeconds } from '@/lib/rate-limit';
import { withAuth, type AuthenticatedRequest } from '@/lib/api/withAuth';
import { validateUUID, getValidationError } from '@/lib/api/validation';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export const GET = withAuth(async (request: AuthenticatedRequest, context: RouteParams) => {
  const { id } = await context.params;
  const invalid = getValidationError(validateUUID(id, 'conversation ID'));
  if (invalid) {
    return invalid;
  }

  const { user, supabase } = request;
  try {
    // getMessagesForDisplay enforces ownership (returns [] for a foreign id).
    const messages = await getMessagesForDisplay(supabase, user.id, id);
    return apiSuccess(messages);
  } catch (error) {
    return handleApiError(error);
  }
});

export const DELETE = withAuth(async (request: AuthenticatedRequest, context: RouteParams) => {
  const { id } = await context.params;
  const invalid = getValidationError(validateUUID(id, 'conversation ID'));
  if (invalid) {
    return invalid;
  }

  const { user, supabase } = request;

  const rl = await rateLimitWriteAsync(user.id);
  if (!rl.success) {
    return apiRateLimited('Too many requests. Please slow down.', retryAfterSeconds(rl));
  }

  try {
    const ok = await deleteConversation(supabase, user.id, id);
    if (!ok) {
      return apiNotFound('Conversation not found');
    }
    return apiSuccess({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
});
