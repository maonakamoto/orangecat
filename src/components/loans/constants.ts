/**
 * Loan Dialog Constants
 *
 * Constants and default values for CreateLoanDialog.
 *
 * Created: 2025-01-30
 * Last Modified: 2025-01-30
 * Last Modified Summary: Created loan dialog constants
 */

import { DEFAULT_CURRENCY } from '@/config/currencies';
import type { LoanDialogFormData } from './validation';
import { STATUS } from '@/config/database-constants';

export const DEFAULT_LOAN_FORM_VALUES: LoanDialogFormData = {
  title: '',
  description: '',
  original_amount: 0,
  remaining_balance: 0,
  currency: DEFAULT_CURRENCY,
  is_public: true,
  is_negotiable: true,
  contact_method: 'platform',
  minimum_offer_amount: undefined,
  interest_rate: undefined,
  monthly_payment: undefined,
  lender_name: '',
  loan_number: '',
  origination_date: '',
  maturity_date: '',
  preferred_terms: '',
  loan_category_id: '',
};

export const CONTACT_METHODS = [
  { value: 'platform', label: 'Through OrangeCat Platform' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
] as const;

const LOAN_OFFER_STATUS_COLORS: Record<string, string> = {
  [STATUS.LOAN_OFFERS.PENDING]: 'bg-yellow-100 text-yellow-800',
  [STATUS.LOAN_OFFERS.ACCEPTED]: 'bg-green-100 text-green-800',
  [STATUS.LOAN_OFFERS.REJECTED]: 'bg-red-100 text-red-800',
  [STATUS.LOAN_OFFERS.EXPIRED]: 'bg-gray-100 text-gray-800',
};

export const getLoanOfferStatusColor = (status: string): string =>
  LOAN_OFFER_STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-800';
