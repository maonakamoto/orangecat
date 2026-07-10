/**
 * Loan API client payload mapping
 */

import { loanToApiPayload, createLoanRequestToApiPayload } from '@/services/loans/api-client';
import { PLATFORM_DEFAULT_CURRENCY } from '@/config/currencies';

describe('loan API client payloads', () => {
  it('passes the description through unchanged (no padding)', () => {
    const payload = createLoanRequestToApiPayload({
      title: 'My loan',
      description: 'Hi',
      original_amount: 100,
      remaining_balance: 100,
      currency: PLATFORM_DEFAULT_CURRENCY,
      is_public: true,
      is_negotiable: true,
      contact_method: 'platform',
    });

    expect(payload.description).toBe('Hi');
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
      description: 'Need short-term liquidity for inventory.',
      fulfillment_type: 'manual',
      original_amount: 5000,
      remaining_balance: 5000,
      collateral: [],
    });
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
