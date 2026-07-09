/**
 * LOANS SERVICE - Loan Offer Mutations
 *
 * All offer writes route through /api/loans/offers.
 */

import type {
  CreateLoanOfferRequest,
  UpdateLoanOfferRequest,
  LoanOfferResponse,
} from '@/types/loans';
import {
  createLoanOfferViaApi,
  updateLoanOfferViaApi,
  respondToOfferViaApi,
} from '@/services/loans/api-client';

/**
 * Create a loan offer
 */
export async function createLoanOffer(request: CreateLoanOfferRequest): Promise<LoanOfferResponse> {
  return createLoanOfferViaApi(request);
}

/**
 * Update a loan offer
 */
export async function updateLoanOffer(
  offerId: string,
  request: UpdateLoanOfferRequest
): Promise<LoanOfferResponse> {
  return updateLoanOfferViaApi(offerId, request);
}

/**
 * Accept or reject a loan offer
 */
export async function respondToOffer(
  offerId: string,
  accept: boolean,
  notes?: string
): Promise<LoanOfferResponse> {
  return respondToOfferViaApi(offerId, accept, notes);
}
