/**
 * POST /api/loans/offers/:id/respond — borrower accepts or rejects an offer.
 */

import { withAuth, type AuthenticatedRequest } from '@/lib/api/withAuth';
import {
  apiBadRequest,
  apiForbidden,
  apiInternalError,
  apiNotFound,
  apiSuccess,
  apiValidationError,
} from '@/lib/api/standardResponse';
import { respondToLoanOfferSchema } from '@/config/loan-offers';
import { respondToLoanOffer } from '@/domain/loans/offers';
import { logger } from '@/utils/logger';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const POST = withAuth(async (request: AuthenticatedRequest, { params }: RouteContext) => {
  try {
    const { user, supabase } = request;
    const { id: offerId } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiBadRequest('Invalid JSON body');
    }

    const parsed = respondToLoanOfferSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError('Invalid request', parsed.error.flatten());
    }

    const result = await respondToLoanOffer(user.id, offerId, parsed.data.accept, supabase);
    if (!result.ok) {
      switch (result.reason) {
        case 'not_found':
          return apiNotFound(result.message);
        case 'forbidden':
          return apiForbidden(result.message);
        case 'invalid_state':
          return apiBadRequest(result.message);
        default:
          logger.error('Loan offer response failed', { message: result.message }, 'LoansAPI');
          return apiInternalError(result.message);
      }
    }

    return apiSuccess(result.offer);
  } catch (error) {
    logger.error('Unexpected error in POST /api/loans/offers/:id/respond', error, 'LoansAPI');
    return apiInternalError('Internal server error');
  }
});
