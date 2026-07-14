/**
 * AI Conversation Detail API
 *
 * GET /api/ai-assistants/[id]/conversations/[convId] - Get conversation with messages
 * PUT /api/ai-assistants/[id]/conversations/[convId] - Update conversation (title, archive)
 * DELETE /api/ai-assistants/[id]/conversations/[convId] - Delete conversation
 *
 * Thin HTTP layer — business rules live in @/services/ai/conversation-service.
 */

import { withAuth, type AuthenticatedRequest } from '@/lib/api/withAuth';
import { z } from 'zod';
import { logger } from '@/utils/logger';
import {
  apiSuccess,
  apiNotFound,
  apiBadRequest,
  apiInternalError,
  apiRateLimited,
} from '@/lib/api/standardResponse';
import { rateLimitWriteAsync, retryAfterSeconds } from '@/lib/rate-limit';
import { validateUUID, getValidationError } from '@/lib/api/validation';
import {
  getConversationDetail,
  updateConversation,
  deleteConversation,
  type ConversationResult,
} from '@/services/ai/conversation-service';

interface RouteContext {
  params: Promise<{ id: string; convId: string }>;
}

const updateConversationSchema = z.object({
  title: z.string().max(200).optional(),
  status: z.enum(['active', 'archived']).optional(),
});

/** Map a domain ConversationResult onto the matching HTTP response. */
function toResponse<T>(result: ConversationResult<T>) {
  if (result.ok) {
    return apiSuccess(result.data);
  }
  if ('dbError' in result) {
    return apiInternalError(result.message);
  }
  return apiNotFound(result.message);
}

export const GET = withAuth(async (request: AuthenticatedRequest, context: RouteContext) => {
  const { id: assistantId, convId } = await context.params;
  const aIdV = getValidationError(validateUUID(assistantId, 'assistant ID'));
  if (aIdV) {
    return aIdV;
  }
  const cIdV = getValidationError(validateUUID(convId, 'conversation ID'));
  if (cIdV) {
    return cIdV;
  }
  try {
    const { user, supabase } = request;
    return toResponse(await getConversationDetail(supabase, assistantId, convId, user.id));
  } catch (error) {
    logger.error('Get conversation error', error, 'AIConversationAPI');
    return apiInternalError();
  }
});

export const PUT = withAuth(async (request: AuthenticatedRequest, context: RouteContext) => {
  const { id: assistantId, convId } = await context.params;
  const aIdV = getValidationError(validateUUID(assistantId, 'assistant ID'));
  if (aIdV) {
    return aIdV;
  }
  const cIdV = getValidationError(validateUUID(convId, 'conversation ID'));
  if (cIdV) {
    return cIdV;
  }
  try {
    const { user, supabase } = request;

    const rl = await rateLimitWriteAsync(user.id);
    if (!rl.success) {
      return apiRateLimited('Too many requests. Please slow down.', retryAfterSeconds(rl));
    }

    const body = await request.json();
    const result = updateConversationSchema.safeParse(body);
    if (!result.success) {
      return apiBadRequest('Validation failed', result.error.flatten());
    }

    return toResponse(
      await updateConversation(supabase, assistantId, convId, user.id, result.data)
    );
  } catch (error) {
    logger.error('Update conversation error', error, 'AIConversationAPI');
    return apiInternalError();
  }
});

export const DELETE = withAuth(async (request: AuthenticatedRequest, context: RouteContext) => {
  const { id: assistantId, convId } = await context.params;
  const aIdV = getValidationError(validateUUID(assistantId, 'assistant ID'));
  if (aIdV) {
    return aIdV;
  }
  const cIdV = getValidationError(validateUUID(convId, 'conversation ID'));
  if (cIdV) {
    return cIdV;
  }
  try {
    const { user, supabase } = request;

    const rl = await rateLimitWriteAsync(user.id);
    if (!rl.success) {
      return apiRateLimited('Too many requests. Please slow down.', retryAfterSeconds(rl));
    }

    return toResponse(await deleteConversation(supabase, assistantId, convId, user.id));
  } catch (error) {
    logger.error('Delete conversation error', error, 'AIConversationAPI');
    return apiInternalError();
  }
});
