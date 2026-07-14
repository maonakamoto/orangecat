/**
 * Research entity API — GET (public/owner), PUT (owner), DELETE (owner, no funding).
 *
 * Thin HTTP layer — business rules live in @/domain/research/researchEntity.server.
 */

import { NextRequest } from 'next/server';
import { withAuth, withOptionalAuth, type AuthenticatedRequest } from '@/lib/api/withAuth';
import {
  apiSuccess,
  apiNotFound,
  apiForbidden,
  apiBadRequest,
  apiRateLimited,
  handleApiError,
} from '@/lib/api/standardResponse';
import { rateLimitWriteAsync, retryAfterSeconds } from '@/lib/rate-limit';
import { researchUpdateSchema } from '@/config/entity-configs/research-config';
import { validateUUID, getValidationError } from '@/lib/api/validation';
import {
  getResearchWithRelations,
  updateResearch,
  deleteResearch,
  type ResearchResult,
} from '@/domain/research/researchEntity.server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** Map a domain ResearchResult onto the matching HTTP response. */
function toResponse<T>(result: ResearchResult<T>) {
  if (result.ok) {
    return apiSuccess(result.data);
  }
  if ('dbError' in result) {
    return handleApiError(result.dbError);
  }
  return result.code === 'not_found' ? apiNotFound(result.message) : apiForbidden(result.message);
}

export const GET = withOptionalAuth(async (request, context: RouteContext) => {
  const { id } = await context.params;
  const idValidation = getValidationError(validateUUID(id, 'research entity ID'));
  if (idValidation) {
    return idValidation;
  }
  try {
    return toResponse(await getResearchWithRelations(request.supabase, id, request.user?.id));
  } catch (error) {
    return handleApiError(error);
  }
});

export const PUT = withAuth(async (request: AuthenticatedRequest, context: RouteContext) => {
  const { id } = await context.params;
  const idValidation = getValidationError(validateUUID(id, 'research entity ID'));
  if (idValidation) {
    return idValidation;
  }
  const { user, supabase } = request;
  try {
    const rl = await rateLimitWriteAsync(user.id);
    if (!rl.success) {
      return apiRateLimited('Too many requests. Please slow down.', retryAfterSeconds(rl));
    }

    const parsed = researchUpdateSchema.safeParse(await (request as NextRequest).json());
    if (!parsed.success) {
      return apiBadRequest('Invalid request body', parsed.error.flatten().fieldErrors);
    }

    return toResponse(await updateResearch(supabase, id, user.id, parsed.data));
  } catch (error) {
    return handleApiError(error);
  }
});

export const DELETE = withAuth(async (request: AuthenticatedRequest, context: RouteContext) => {
  const { id } = await context.params;
  const idValidation = getValidationError(validateUUID(id, 'research entity ID'));
  if (idValidation) {
    return idValidation;
  }
  const { user, supabase } = request;
  try {
    const rl = await rateLimitWriteAsync(user.id);
    if (!rl.success) {
      return apiRateLimited('Too many requests. Please slow down.', retryAfterSeconds(rl));
    }

    return toResponse(await deleteResearch(supabase, id, user.id));
  } catch (error) {
    return handleApiError(error);
  }
});
