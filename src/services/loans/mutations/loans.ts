/**
 * LOANS SERVICE - Loan Mutations
 *
 * All user-facing mutations route through /api/loans (domain layer + RLS).
 */

import type { CreateLoanRequest, UpdateLoanRequest, LoanResponse } from '@/types/loans';
import type { ServiceResult } from '@/types/common';
import {
  createLoanViaApi,
  updateLoanViaApi,
  deleteLoanViaApi,
  createObligationLoanViaApi,
} from '@/services/loans/api-client';

/**
 * Create a new loan listing (via POST /api/loans).
 */
export async function createLoan(request: CreateLoanRequest): Promise<LoanResponse> {
  return createLoanViaApi(request);
}

/**
 * Update an existing loan (via PUT /api/loans/:id).
 */
export async function updateLoan(
  loanId: string,
  request: UpdateLoanRequest
): Promise<LoanResponse> {
  return updateLoanViaApi(loanId, request);
}

/**
 * Delete a loan (via DELETE /api/loans/:id).
 */
export async function deleteLoan(loanId: string): Promise<ServiceResult> {
  return deleteLoanViaApi(loanId);
}

/**
 * Create a new obligation loan after payoff/refinance (via POST /api/loans/obligation).
 */
export async function createObligationLoan(params: {
  borrowerId: string;
  lenderProfileName: string;
  offer: {
    loan_id: string;
    offer_amount: number;
    interest_rate?: number;
    term_months?: number;
    currency?: string;
  };
}): Promise<LoanResponse> {
  return createObligationLoanViaApi(params);
}
