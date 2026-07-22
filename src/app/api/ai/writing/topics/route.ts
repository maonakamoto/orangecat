/**
 * POST /api/ai/writing/topics — AI-suggested writing topics grounded in the
 * user's own context (profile, entities, memories, past posts). Thin wrapper
 * over the writing-engine; auth + write-tier rate limit.
 */

import type { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth, type AuthenticatedRequest } from '@/lib/api/withAuth';
import { createRateLimitResponse, rateLimitWriteAsync } from '@/lib/rate-limit';
import { apiBadRequest, apiInternalError, apiSuccess } from '@/lib/api/standardResponse';
import { suggestTopics } from '@/services/cat/writing-engine';
import { logger } from '@/utils/logger';

const bodySchema = z.object({
  count: z.number().int().min(1).max(8).optional(),
  kind: z.enum(['post', 'article', 'any']).optional(),
  focus: z.string().trim().max(200).optional(),
});

export const POST = withAuth(async (request: AuthenticatedRequest) => {
  const { user, supabase } = request;
  try {
    const rl = await rateLimitWriteAsync(user.id);
    if (!rl.success) {
      return createRateLimitResponse(rl) as NextResponse;
    }

    const parsed = bodySchema.safeParse(await (request as NextRequest).json().catch(() => ({})));
    if (!parsed.success) {
      return apiBadRequest('Invalid request', parsed.error.flatten());
    }

    const topics = await suggestTopics(supabase, user.id, parsed.data);
    return apiSuccess({ topics }) as NextResponse;
  } catch (error) {
    logger.error('writing/topics failed', error, 'WritingAPI');
    return apiInternalError('Could not suggest topics right now. Please try again.');
  }
});
