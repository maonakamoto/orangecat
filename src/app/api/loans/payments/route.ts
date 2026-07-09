/**
 * POST /api/loans/payments — record a loan payment (payoff / refinance handoff).
 */
import { withAuth, type AuthenticatedRequest } from '@/lib/api/withAuth';
import {
  apiCreated,
  apiBadRequest,
  apiValidationError,
  apiForbidden,
  apiNotFound,
  apiInternalError,
} from '@/lib/api/standardResponse';
import { createLoanPaymentSchema } from '@/config/loan-payments';
import { createLoanPayment } from '@/domain/loans/payments';
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

    const parsed = createLoanPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError('Invalid request', parsed.error.flatten());
    }

    const result = await createLoanPayment(user.id, parsed.data, supabase);
    if (!result.ok) {
      switch (result.reason) {
        case 'loan_not_found':
          return apiNotFound(result.message);
        case 'forbidden':
          return apiForbidden(result.message);
        default:
          logger.error('Loan payment create failed', { message: result.message }, 'LoansAPI');
          return apiInternalError(result.message);
      }
    }

    return apiCreated(result.payment);
  } catch (error) {
    logger.error('Unexpected error in POST /api/loans/payments', error, 'LoansAPI');
    return apiInternalError('Internal server error');
  }
});
