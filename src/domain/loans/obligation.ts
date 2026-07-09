/**
 * Obligation loan domain — creates an active private loan after offer acceptance.
 */
import { getTableName } from '@/config/entity-registry';
import { isSupportedCurrency, PLATFORM_DEFAULT_CURRENCY } from '@/config/currencies';
import { STATUS } from '@/config/database-constants';
import {
  OBLIGATION_LOAN_DESCRIPTION,
  OBLIGATION_LOAN_TITLE,
  type CreateObligationLoanInput,
} from '@/config/loan-obligation';
import { createEntity } from '@/domain/base/entityService';
import type { AnySupabaseClient } from '@/lib/supabase/types';
import { logger } from '@/utils/logger';

export type CreateObligationLoanResult =
  | { ok: true; loan: Record<string, unknown> & { id: string } }
  | {
      ok: false;
      reason: 'source_loan_not_found' | 'forbidden' | 'error';
      message: string;
    };

export async function createObligationLoan(
  borrowerUserId: string,
  input: Omit<CreateObligationLoanInput, 'borrowerId'>,
  supabase: AnySupabaseClient
): Promise<CreateObligationLoanResult> {
  const { lenderProfileName, offer } = input;
  const currency = isSupportedCurrency(offer.currency) ? offer.currency : PLATFORM_DEFAULT_CURRENCY;

  const { data: sourceLoan, error: sourceErr } = await supabase
    .from(getTableName('loan'))
    .select('id, user_id')
    .eq('id', offer.loan_id)
    .maybeSingle();

  if (sourceErr) {
    logger.error('Failed to verify source loan for obligation', sourceErr, 'LoanObligation');
    return { ok: false, reason: 'error', message: 'Failed to verify source loan' };
  }
  if (!sourceLoan) {
    return { ok: false, reason: 'source_loan_not_found', message: 'Source loan not found' };
  }
  if ((sourceLoan as { user_id: string }).user_id !== borrowerUserId) {
    return {
      ok: false,
      reason: 'forbidden',
      message: 'You can only create obligations for your own loans',
    };
  }

  try {
    const loan = await createEntity(
      'loan',
      borrowerUserId,
      {
        user_id: borrowerUserId,
        title: OBLIGATION_LOAN_TITLE,
        description: OBLIGATION_LOAN_DESCRIPTION,
        loan_type: 'existing_refinance',
        original_amount: offer.offer_amount,
        remaining_balance: offer.offer_amount,
        amount: offer.offer_amount,
        interest_rate: offer.interest_rate ?? null,
        monthly_payment: null,
        currency,
        lender_name: lenderProfileName,
        loan_number: null,
        origination_date: new Date().toISOString(),
        maturity_date: null,
        status: STATUS.LOANS.ACTIVE,
        is_public: false,
        is_negotiable: false,
        minimum_offer_amount: null,
        preferred_terms: null,
        contact_method: 'platform',
        fulfillment_type: 'manual',
      },
      { client: supabase }
    );

    return { ok: true, loan: loan as Record<string, unknown> & { id: string } };
  } catch (error) {
    logger.error('Failed to create obligation loan', error, 'LoanObligation');
    return { ok: false, reason: 'error', message: 'Failed to create obligation loan' };
  }
}
