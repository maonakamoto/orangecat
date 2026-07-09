/**
 * POST /api/loans/offers — create a refinance or payoff offer.
 */

import { withAuth, type AuthenticatedRequest } from '@/lib/api/withAuth';
import {
  apiBadRequest,
  apiCreated,
  apiForbidden,
  apiInternalError,
  apiNotFound,
  apiValidationError,
} from '@/lib/api/standardResponse';
import { createLoanOfferSchema } from '@/config/loan-offers';
import { createLoanOffer } from '@/domain/loans/offers';
import { logger } from '@/utils/logger';

export const POST = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const { user, supabase } = request;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiBadRequest('Invalid JSON body');
    }

    const parsed = createLoanOfferSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError('Invalid request', parsed.error.flatten());
    }

    const result = await createLoanOffer(user.id, parsed.data, supabase);
    if (!result.ok) {
      switch (result.reason) {
        case 'loan_not_found':
          return apiNotFound(result.message);
        case 'forbidden':
        case 'below_minimum':
          return apiForbidden(result.message);
        default:
          logger.error('Loan offer create failed', { message: result.message }, 'LoansAPI');
          return apiInternalError(result.message);
      }
    }

    return apiCreated(result.offer);
  } catch (error) {
    logger.error('Unexpected error in POST /api/loans/offers', error, 'LoansAPI');
    return apiInternalError('Internal server error');
  }
});
