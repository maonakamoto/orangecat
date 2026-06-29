/**
 * Cat Conversations API
 *
 * GET  /api/cat/conversations  - List the user's conversations (rail)
 * POST /api/cat/conversations  - Start a new conversation, returns { id }
 */

import { listConversations, createConversation } from '@/services/cat/conversation-history';
import { apiSuccess, apiRateLimited, handleApiError } from '@/lib/api/standardResponse';
import { rateLimitWriteAsync, retryAfterSeconds } from '@/lib/rate-limit';
import { withAuth, type AuthenticatedRequest } from '@/lib/api/withAuth';

export const GET = withAuth(async (request: AuthenticatedRequest) => {
  const { user, supabase } = request;
  try {
    const conversations = await listConversations(supabase, user.id);
    return apiSuccess({ conversations });
  } catch (error) {
    return handleApiError(error);
  }
});

export const POST = withAuth(async (request: AuthenticatedRequest) => {
  const { user, supabase } = request;

  const rl = await rateLimitWriteAsync(user.id);
  if (!rl.success) {
    return apiRateLimited('Too many requests. Please slow down.', retryAfterSeconds(rl));
  }

  try {
    const id = await createConversation(supabase, user.id);
    return apiSuccess({ id });
  } catch (error) {
    return handleApiError(error);
  }
});
