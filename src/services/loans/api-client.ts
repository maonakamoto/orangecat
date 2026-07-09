/**
 * Loans API client — browser-side calls to /api/loans (no direct Supabase writes).
 *
 * UI and hooks must use this (via loansService) so creation, updates, and deletes
 * go through the same validation, rate limits, and domain logic as integrations.
 */

import { API_ROUTES } from '@/config/api-routes';
import { logger } from '@/utils/logger';
import type { Loan, CreateLoanRequest, UpdateLoanRequest, LoanResponse } from '@/types/loans';
import type { ServiceResult } from '@/types/common';

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/** API loanSchema requires min 10 chars — pad short descriptions safely. */
export function ensureLoanDescription(description?: string, title?: string): string {
  const text = (description?.trim() || title?.trim() || 'Loan listing').slice(0, 1000);
  if (text.length >= 10) {
    return text;
  }
  return `${text} on OrangeCat`.slice(0, 1000);
}

/** Map a loan record or form payload to the API contract (lib/validation/finance loanSchema). */
export function loanToApiPayload(
  loan: Partial<Loan> & Pick<Loan, 'title' | 'original_amount' | 'remaining_balance'>
): Record<string, unknown> {
  const fulfillment = loan.fulfillment_type as string | undefined;
  const fulfillmentType =
    fulfillment === 'manual' || fulfillment === 'automatic' ? fulfillment : 'manual';

  return {
    loan_type: 'new_request',
    title: loan.title,
    description: ensureLoanDescription(loan.description, loan.title),
    loan_category_id: loan.loan_category_id ?? null,
    original_amount: loan.original_amount,
    remaining_balance: loan.remaining_balance,
    interest_rate: loan.interest_rate ?? null,
    bitcoin_address: loan.bitcoin_address ?? null,
    lightning_address: loan.lightning_address ?? null,
    fulfillment_type: fulfillmentType,
    currency: loan.currency,
    current_lender: loan.current_lender ?? loan.lender_name ?? null,
    current_interest_rate: loan.current_interest_rate ?? null,
    monthly_payment: loan.monthly_payment ?? null,
    desired_rate: loan.desired_rate ?? null,
    lender_name: loan.lender_name ?? null,
    loan_number: loan.loan_number ?? null,
    origination_date: loan.origination_date ?? null,
    maturity_date: loan.maturity_date ?? null,
    is_public: loan.is_public ?? false,
    is_negotiable: loan.is_negotiable ?? true,
    minimum_offer_amount: loan.minimum_offer_amount ?? null,
    preferred_terms: loan.preferred_terms ?? null,
    contact_method: loan.contact_method ?? 'platform',
    collateral: [],
  };
}

export function createLoanRequestToApiPayload(request: CreateLoanRequest): Record<string, unknown> {
  return loanToApiPayload(request as unknown as Loan);
}

async function parseLoanEnvelope(res: Response): Promise<LoanResponse> {
  const json = (await res.json().catch(() => ({}))) as ApiEnvelope<Loan>;
  if (!res.ok || json.success === false) {
    return { success: false, error: json.error || `Request failed (${res.status})` };
  }
  if (!json.data) {
    return { success: false, error: 'Empty response from server' };
  }
  return { success: true, loan: json.data };
}

export async function getLoanViaApi(loanId: string): Promise<LoanResponse> {
  try {
    const res = await fetch(API_ROUTES.LOANS.BY_ID(loanId), { credentials: 'include' });
    return parseLoanEnvelope(res);
  } catch (error) {
    logger.error('getLoanViaApi failed', error, 'Loans');
    return { success: false, error: 'Failed to load loan' };
  }
}

export async function createLoanViaApi(request: CreateLoanRequest): Promise<LoanResponse> {
  try {
    const res = await fetch(API_ROUTES.LOANS.BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(createLoanRequestToApiPayload(request)),
    });
    const result = await parseLoanEnvelope(res);
    if (result.success) {
      logger.info('Loan created via API', { loanId: result.loan?.id }, 'Loans');
    }
    return result;
  } catch (error) {
    logger.error('createLoanViaApi failed', error, 'Loans');
    return { success: false, error: 'Failed to create loan' };
  }
}

export async function updateLoanViaApi(
  loanId: string,
  patch: UpdateLoanRequest
): Promise<LoanResponse> {
  try {
    // PUT validates the full loan schema — merge partial patches onto the current row.
    const isFullFormPatch =
      Boolean(patch.title) &&
      patch.original_amount !== undefined &&
      patch.original_amount !== null &&
      patch.remaining_balance !== undefined &&
      patch.remaining_balance !== null &&
      ensureLoanDescription(patch.description, patch.title).length >= 10;

    let payload: Record<string, unknown>;
    if (isFullFormPatch) {
      payload = loanToApiPayload(patch as Loan);
    } else {
      const current = await getLoanViaApi(loanId);
      if (!current.success || !current.loan) {
        return current;
      }
      payload = loanToApiPayload({ ...current.loan, ...patch });
    }

    const res = await fetch(API_ROUTES.LOANS.BY_ID(loanId), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    const result = await parseLoanEnvelope(res);
    if (result.success) {
      logger.info('Loan updated via API', { loanId }, 'Loans');
    }
    return result;
  } catch (error) {
    logger.error('updateLoanViaApi failed', error, 'Loans');
    return { success: false, error: 'Failed to update loan' };
  }
}

export async function createObligationLoanViaApi(params: {
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
    const res = await fetch(API_ROUTES.LOANS.OBLIGATION, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(params),
    });
    const result = await parseLoanEnvelope(res);
    if (result.success) {
      logger.info('Obligation loan created via API', { loanId: result.loan?.id }, 'Loans');
    }
    return result;
  } catch (error) {
    logger.error('createObligationLoanViaApi failed', error, 'Loans');
    return { success: false, error: 'Failed to create obligation loan' };
  }
}

export async function deleteLoanViaApi(loanId: string): Promise<ServiceResult> {
  try {
    const res = await fetch(API_ROUTES.LOANS.BY_ID(loanId), {
      method: 'DELETE',
      credentials: 'include',
    });
    const json = (await res.json().catch(() => ({}))) as ApiEnvelope<unknown>;
    if (!res.ok || json.success === false) {
      return { success: false, error: json.error || `Request failed (${res.status})` };
    }
    logger.info('Loan deleted via API', { loanId }, 'Loans');
    return { success: true };
  } catch (error) {
    logger.error('deleteLoanViaApi failed', error, 'Loans');
    return { success: false, error: 'Failed to delete loan' };
  }
}
