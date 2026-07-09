/**
 * Loan payment domain — payoff / refinance payment records.
 */
import { DATABASE_TABLES } from '@/config/database-tables';
import { getTableName } from '@/config/entity-registry';
import { STATUS } from '@/config/database-constants';
import type { CreateLoanPaymentBody, CompleteLoanPaymentBody } from '@/config/loan-payments';
import { createObligationLoan } from '@/domain/loans/obligation';
import type { AnySupabaseClient } from '@/lib/supabase/types';
import { logger } from '@/utils/logger';

export type LoanPaymentRow = Record<string, unknown> & { id: string };
export type ObligationLoanRow = Record<string, unknown> & { id: string };

type PaymentResult =
  | { ok: true; payment: LoanPaymentRow; obligationLoan?: ObligationLoanRow }
  | {
      ok: false;
      reason: 'loan_not_found' | 'forbidden' | 'not_found' | 'invalid_state' | 'error';
      message: string;
    };

export async function createLoanPayment(
  userId: string,
  input: CreateLoanPaymentBody,
  supabase: AnySupabaseClient
): Promise<PaymentResult> {
  const payerId = input.payer_id ?? userId;

  if (payerId === input.recipient_id) {
    return {
      ok: false,
      reason: 'forbidden',
      message: 'Payer and recipient must be different users',
    };
  }
  if (userId !== payerId && userId !== input.recipient_id) {
    return {
      ok: false,
      reason: 'forbidden',
      message: 'You must be a party to the payment',
    };
  }

  const { data: loanRow, error: loanErr } = await supabase
    .from(getTableName('loan'))
    .select('id')
    .eq('id', input.loan_id)
    .maybeSingle();

  if (loanErr) {
    logger.error('Failed to verify loan for payment', loanErr, 'LoanPayments');
    return { ok: false, reason: 'error', message: 'Failed to verify loan' };
  }
  if (!loanRow) {
    return { ok: false, reason: 'loan_not_found', message: 'Loan not found' };
  }

  const { data, error } = await supabase
    .from(DATABASE_TABLES.LOAN_PAYMENTS)
    .insert({
      loan_id: input.loan_id,
      offer_id: input.offer_id ?? null,
      amount: input.amount,
      currency: input.currency,
      payment_type: input.payment_type,
      payer_id: payerId,
      recipient_id: input.recipient_id,
      transaction_id: input.transaction_id ?? null,
      payment_method: input.payment_method ?? null,
      notes: input.notes ?? null,
      status: STATUS.LOAN_PAYMENTS.PENDING,
      processed_at: null,
    })
    .select('*')
    .single();

  if (error) {
    logger.error('Failed to create loan payment', error, 'LoanPayments');
    return { ok: false, reason: 'error', message: 'Failed to create payment' };
  }

  return { ok: true, payment: data as LoanPaymentRow };
}

export async function completeLoanPayment(
  userId: string,
  paymentId: string,
  input: CompleteLoanPaymentBody,
  supabase: AnySupabaseClient
): Promise<PaymentResult> {
  const { data: existing, error: fetchErr } = await supabase
    .from(DATABASE_TABLES.LOAN_PAYMENTS)
    .select('*')
    .eq('id', paymentId)
    .maybeSingle();

  if (fetchErr) {
    logger.error('Failed to load loan payment', fetchErr, 'LoanPayments');
    return { ok: false, reason: 'error', message: 'Failed to load payment' };
  }
  if (!existing) {
    return { ok: false, reason: 'not_found', message: 'Payment not found' };
  }

  const payment = existing as LoanPaymentRow & {
    payer_id: string;
    recipient_id: string;
    status: string;
    payment_type: string;
    loan_id: string;
    offer_id: string | null;
    amount: number;
    currency: string;
  };

  if (payment.payer_id !== userId && payment.recipient_id !== userId) {
    return {
      ok: false,
      reason: 'forbidden',
      message: 'You are not a party to this payment',
    };
  }

  if (payment.status === STATUS.LOAN_PAYMENTS.COMPLETED) {
    return { ok: true, payment };
  }

  if (payment.status !== STATUS.LOAN_PAYMENTS.PENDING) {
    return {
      ok: false,
      reason: 'invalid_state',
      message: `Payment cannot be completed from status "${payment.status}"`,
    };
  }

  const { data: updated, error: updateErr } = await supabase
    .from(DATABASE_TABLES.LOAN_PAYMENTS)
    .update({
      status: STATUS.LOAN_PAYMENTS.COMPLETED,
      processed_at: new Date().toISOString(),
    })
    .eq('id', paymentId)
    .select('*')
    .single();

  if (updateErr) {
    logger.error('Failed to complete loan payment', updateErr, 'LoanPayments');
    return { ok: false, reason: 'error', message: 'Failed to complete payment' };
  }

  let obligationLoan: ObligationLoanRow | undefined;
  if (input.createObligation && payment.payment_type === 'refinance') {
    if (!payment.offer_id) {
      return {
        ok: false,
        reason: 'invalid_state',
        message: 'Refinance payments require an offer_id to create an obligation loan',
      };
    }

    const { data: offerRow } = await supabase
      .from(DATABASE_TABLES.LOAN_OFFERS)
      .select('interest_rate, term_months')
      .eq('id', payment.offer_id)
      .maybeSingle();

    const obligationResult = await createObligationLoan(
      payment.recipient_id,
      {
        lenderProfileName: input.createObligation.lenderProfileName,
        offer: {
          loan_id: payment.loan_id,
          offer_amount: Number(payment.amount),
          interest_rate:
            (offerRow as { interest_rate: number | null } | null)?.interest_rate ?? undefined,
          term_months:
            (offerRow as { term_months: number | null } | null)?.term_months ?? undefined,
          currency: payment.currency,
        },
      },
      supabase
    );

    if (!obligationResult.ok) {
      logger.error(
        'Payment completed but obligation loan failed',
        { reason: obligationResult.reason, message: obligationResult.message },
        'LoanPayments'
      );
      return {
        ok: false,
        reason: obligationResult.reason === 'forbidden' ? 'forbidden' : 'error',
        message: obligationResult.message,
      };
    }

    obligationLoan = obligationResult.loan;
  }

  return {
    ok: true,
    payment: updated as LoanPaymentRow,
    obligationLoan,
  };
}
