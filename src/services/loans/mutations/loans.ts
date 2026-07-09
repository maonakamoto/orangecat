/**
 * LOANS SERVICE - Loan Mutations
 *
 * User-facing create/update/delete route through /api/loans (domain layer + RLS).
 * createObligationLoan remains a server-adjacent path for offer acceptance flows.
 */

import supabase from '@/lib/supabase/browser';
import { logger } from '@/utils/logger';
import { isSupportedCurrency, PLATFORM_DEFAULT_CURRENCY } from '@/config/currencies';
import { getTableName } from '@/config/entity-registry';
import type { CreateLoanRequest, UpdateLoanRequest, LoanResponse, Loan } from '@/types/loans';
import { STATUS } from '@/config/database-constants';
import { DATABASE_TABLES } from '@/config/database-tables';
import type { ServiceResult } from '@/types/common';
import { createLoanViaApi, updateLoanViaApi, deleteLoanViaApi } from '@/services/loans/api-client';

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
 * Resolve a user_id to an actor_id via the browser Supabase client.
 * Used only by createObligationLoan until that flow moves server-side.
 */
async function resolveActorId(userId: string): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = (await (supabase.from(DATABASE_TABLES.ACTORS) as any)
    .select('id')
    .eq('user_id', userId)
    .eq('actor_type', 'user')
    .maybeSingle()) as { data: { id: string } | null };
  return data?.id ?? null;
}

/**
 * Create a new obligation loan after payoff/refinance.
 *
 * TODO(phase-E): move to a server route so browser Supabase writes are eliminated.
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
  try {
    const { borrowerId, lenderProfileName, offer } = params;

    const newLoan: CreateLoanRequest = {
      title: 'Refinanced Loan',
      description: 'Refinanced via OrangeCat offer',
      original_amount: offer.offer_amount,
      remaining_balance: offer.offer_amount,
      interest_rate: offer.interest_rate,
      monthly_payment: undefined,
      currency: isSupportedCurrency(offer.currency) ? offer.currency : PLATFORM_DEFAULT_CURRENCY,
      lender_name: lenderProfileName,
      loan_number: undefined,
      origination_date: new Date().toISOString(),
      maturity_date: undefined,
      is_public: false,
      is_negotiable: false,
      minimum_offer_amount: undefined,
      preferred_terms: undefined,
      contact_method: 'platform',
    };

    const borrowerActorId = await resolveActorId(borrowerId);
    if (!borrowerActorId) {
      return { success: false, error: 'Borrower actor not found' };
    }

    const { data, error } = await (
      supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from(getTableName('loan')) as any
    )
      .insert({
        ...newLoan,
        actor_id: borrowerActorId,
        status: STATUS.LOANS.ACTIVE,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create obligation loan', error, 'Loans');
      return { success: false, error: error.message };
    }

    return { success: true, loan: data as Loan };
  } catch (error) {
    logger.error('Exception creating obligation loan', error, 'Loans');
    return { success: false, error: 'Failed to create obligation loan' };
  }
}
