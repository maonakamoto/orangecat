import { loanSchema } from '@/lib/validation/finance';

// Simulates the object the edit form loads from a saved loan row: optional
// string columns that were never set come back as `null` from the DB.
describe('loanSchema tolerates a loaded loan row with null optionals', () => {
  it('accepts null for unset listing/string fields (edit round-trip)', () => {
    const loadedRow = {
      loan_type: 'new_request',
      title: 'Schema Merge Test Loan',
      description: 'End-to-end test.',
      loan_category_id: null,
      original_amount: 3000,
      remaining_balance: 3000,
      interest_rate: 7,
      monthly_payment: null,
      currency: 'CHF',
      bitcoin_address: null,
      lightning_address: null,
      fulfillment_type: 'manual',
      lender_name: null,
      loan_number: null,
      origination_date: null,
      maturity_date: null,
      is_public: false,
      is_negotiable: true,
      minimum_offer_amount: null,
      preferred_terms: null,
      contact_method: 'platform',
      current_lender: null,
      current_interest_rate: null,
      desired_rate: null,
      collateral: [],
    };

    const result = loanSchema.safeParse(loadedRow);
    if (!result.success) {
      // Surface exactly which fields reject null so the test output is useful.
      throw new Error(JSON.stringify(result.error.flatten().fieldErrors, null, 2));
    }
    expect(result.success).toBe(true);
  });
});
