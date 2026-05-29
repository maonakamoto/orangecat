/**
 * Proposal Vote API
 *
 * POST /api/groups/[slug]/proposals/[id]/vote - Cast a vote on a proposal
 *
 * Last Modified: 2026-01-28
 * Last Modified Summary: Refactored to use withAuth middleware
 */

import {
  handleApiError,
  apiSuccess,
  apiBadRequest,
  apiRateLimited,
} from '@/lib/api/standardResponse';
import { validateUUID, getValidationError } from '@/lib/api/validation';
import { rateLimitWriteAsync, retryAfterSeconds } from '@/lib/rate-limit';
import { withAuth, type AuthenticatedRequest } from '@/lib/api/withAuth';
import { logger } from '@/utils/logger';
import { castVote } from '@/services/groups/mutations/votes';
import { z } from 'zod';
import { STATUS, type ProposalVoteValue } from '@/config/database-constants';
import { recordGroupActivity } from '@/services/groups/activities';
import { resolveGroupBySlug } from '@/domain/groups/helpers.server';

const voteBodySchema = z.object({
  vote: z.enum(Object.values(STATUS.PROPOSAL_VOTES) as [ProposalVoteValue, ...ProposalVoteValue[]]),
});

interface RouteContext {
  params: Promise<{ slug: string; id: string }>;
}

export const POST = withAuth(async (request: AuthenticatedRequest, context: RouteContext) => {
  try {
    const { id, slug } = await context.params;
    const idValidation = getValidationError(validateUUID(id, 'proposal ID'));
    if (idValidation) {
      return idValidation;
    }
    const { user } = request;

    const rl = await rateLimitWriteAsync(user.id);
    if (!rl.success) {
      const retryAfter = retryAfterSeconds(rl);
      return apiRateLimited('Too many vote requests. Please slow down.', retryAfter);
    }

    const { supabase } = request;
    const body = await request.json();
    const parsed = voteBodySchema.safeParse(body);
    if (!parsed.success) {
      return apiBadRequest('vote must be one of: yes, no, abstain');
    }
    const result = await castVote({ proposal_id: id, vote: parsed.data.vote }, supabase);
    if (!result.success) {
      return apiBadRequest(result.error);
    }

    // Await activity write before responding — Vercel kills the
    // function the moment the response is sent, so the void/.then
    // pattern silently dropped vote-activity rows in prod.
    try {
      const group = await resolveGroupBySlug(supabase, slug);
      if (group) {
        await recordGroupActivity(supabase, {
          group_id: group.id,
          user_id: user.id,
          activity_type: 'voted',
          metadata: { proposal_id: id, vote: parsed.data.vote },
        });
      }
    } catch (activityError) {
      logger.error('Failed to record vote activity', activityError, 'API');
    }

    return apiSuccess(result.vote);
  } catch (error) {
    logger.error('Error in POST /api/groups/[slug]/proposals/[id]/vote', error, 'API');
    return handleApiError(error);
  }
});
