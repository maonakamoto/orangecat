/**
 * Loan API client payload mapping
 */

import {
  ensureLoanDescription,
  loanToApiPayload,
  createLoanRequestToApiPayload,
} from '@/services/loans/api-client';
import { PLATFORM_DEFAULT_CURRENCY } from '@/config/currencies';

describe('loan API client payloads', () => {
  it('pads short descriptions to satisfy API min length', () => {
    const padded = ensureLoanDescription('Hi', 'My loan');
    expect(padded.length).toBeGreaterThanOrEqual(10);
    expect(padded).toContain('OrangeCat');
  });

  it('maps create requests to the finance loanSchema shape', () => {
    const payload = createLoanRequestToApiPayload({
      title: 'Bridge funding',
      description: 'Need short-term liquidity for inventory.',
      original_amount: 5000,
      remaining_balance: 5000,
      currency: PLATFORM_DEFAULT_CURRENCY,
      is_public: true,
      is_negotiable: true,
      contact_method: 'platform',
    });

    expect(payload).toMatchObject({
      loan_type: 'new_request',
      title: 'Bridge funding',
      fulfillment_type: 'manual',
      original_amount: 5000,
      remaining_balance: 5000,
      collateral: [],
    });
    expect((payload.description as string).length).toBeGreaterThanOrEqual(10);
  });

  it('merges lender fields and defaults fulfillment_type for legacy rows', () => {
    const payload = loanToApiPayload({
      title: 'Existing loan',
      description: 'Refinance me please — good history.',
      original_amount: 1000,
      remaining_balance: 800,
      currency: PLATFORM_DEFAULT_CURRENCY,
      lender_name: 'Alice Bank',
      fulfillment_type: 'lightning' as never,
      is_public: false,
      is_negotiable: false,
      contact_method: 'email',
    });

    expect(payload.fulfillment_type).toBe('manual');
    expect(payload.current_lender).toBe('Alice Bank');
    expect(payload.is_public).toBe(false);
  });
});
