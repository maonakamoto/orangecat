/**
 * LOANS SERVICE - Payment Mutations
 *
 * All payment writes route through /api/loans/payments.
 */

import type { CreateLoanPaymentRequest, LoanPaymentResponse, Loan } from '@/types/loans';
import { createPaymentViaApi, completePaymentViaApi } from '@/services/loans/api-client';

/**
 * Record a loan payment (via POST /api/loans/payments).
 */
export async function createPayment(
  request: CreateLoanPaymentRequest
): Promise<LoanPaymentResponse> {
  return createPaymentViaApi(request);
}

/**
 * Mark a payment completed (via POST /api/loans/payments/:id/complete).
 *
 * Pass `createObligation` on refinance payments to create the new obligation loan
 * in the same request after funds are confirmed.
 */
export async function completePayment(
  paymentId: string,
  options?: { createObligation?: { lenderProfileName: string } }
): Promise<LoanPaymentResponse & { obligationLoan?: Loan }> {
  return completePaymentViaApi(paymentId, options);
}
