/**
 * PUT /api/loans/offers/:id — offerer-side offer updates.
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
import { updateLoanOfferSchema } from '@/config/loan-offers';
import { updateLoanOffer } from '@/domain/loans/offers';
import { logger } from '@/utils/logger';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const PUT = withAuth(async (request: AuthenticatedRequest, { params }: RouteContext) => {
  try {
    const { user, supabase } = request;
    const { id: offerId } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiBadRequest('Invalid JSON body');
    }

    const parsed = updateLoanOfferSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError('Invalid request', parsed.error.flatten());
    }

    const result = await updateLoanOffer(user.id, offerId, parsed.data, supabase);
    if (!result.ok) {
      switch (result.reason) {
        case 'not_found':
          return apiNotFound(result.message);
        case 'forbidden':
          return apiForbidden(result.message);
        default:
          logger.error('Loan offer update failed', { message: result.message }, 'LoansAPI');
          return apiInternalError(result.message);
      }
    }

    return apiSuccess(result.offer);
  } catch (error) {
    logger.error('Unexpected error in PUT /api/loans/offers/:id', error, 'LoansAPI');
    return apiInternalError('Internal server error');
  }
});
