/**
 * POST /api/loans/payments/:id/complete — mark a payment completed.
 *
 * Optionally creates an obligation loan when `createObligation` is supplied on
 * refinance payments (payoff handoff — see docs/development/loans-flow.md).
 */
import { withAuth, type AuthenticatedRequest } from '@/lib/api/withAuth';
import {
  apiSuccess,
  apiBadRequest,
  apiValidationError,
  apiForbidden,
  apiNotFound,
  apiInternalError,
} from '@/lib/api/standardResponse';
import { completeLoanPaymentSchema } from '@/config/loan-payments';
import { completeLoanPayment } from '@/domain/loans/payments';
import { logger } from '@/utils/logger';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const POST = withAuth(async (request: AuthenticatedRequest, { params }: RouteContext) => {
  try {
    const { user, supabase } = request;
    const { id: paymentId } = await params;

    let body: unknown = {};
    try {
      const text = await request.text();
      if (text.trim()) {
        body = JSON.parse(text);
      }
    } catch {
      return apiBadRequest('Invalid JSON body');
    }

    const parsed = completeLoanPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError('Invalid request', parsed.error.flatten());
    }

    const result = await completeLoanPayment(user.id, paymentId, parsed.data, supabase);
    if (!result.ok) {
      switch (result.reason) {
        case 'not_found':
          return apiNotFound(result.message);
        case 'forbidden':
          return apiForbidden(result.message);
        case 'invalid_state':
          return apiBadRequest(result.message);
        default:
          logger.error('Loan payment complete failed', { message: result.message }, 'LoansAPI');
          return apiInternalError(result.message);
      }
    }

    return apiSuccess({
      payment: result.payment,
      ...(result.obligationLoan ? { obligationLoan: result.obligationLoan } : {}),
    });
  } catch (error) {
    logger.error('Unexpected error in POST /api/loans/payments/:id/complete', error, 'LoansAPI');
    return apiInternalError('Internal server error');
  }
});
