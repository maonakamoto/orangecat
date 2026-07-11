/**
 * Loan Dialog Validation
 *
 * Projection of the canonical loan schema (src/lib/validation/finance.ts — the
 * SSOT) onto the fields the create/edit dialog exposes. Field definitions are
 * NOT redefined here; we only select the dialog's subset and re-apply the
 * create-form defaults for the toggles the canonical schema intentionally
 * leaves un-defaulted (so partial PUT updates never clobber a stored value).
 *
 * Created: 2025-01-30
 * Last Modified: 2026-07-10
 * Last Modified Summary: Derive from the canonical loanSchema instead of
 * maintaining a second, drift-prone copy.
 */

import * as z from 'zod';
import { CURRENCY_CODES, PLATFORM_DEFAULT_CURRENCY } from '@/config/currencies';
import { loanSchema as canonicalLoanSchema, CONTACT_METHOD_VALUES } from '@/lib/validation/finance';

export const loanSchema = canonicalLoanSchema
  .pick({
    title: true,
    description: true,
    loan_category_id: true,
    original_amount: true,
    remaining_balance: true,
    interest_rate: true,
    monthly_payment: true,
    currency: true,
    lender_name: true,
    loan_number: true,
    origination_date: true,
    maturity_date: true,
    is_public: true,
    is_negotiable: true,
    minimum_offer_amount: true,
    preferred_terms: true,
    contact_method: true,
  })
  .extend({
    // Re-apply create-form defaults (the canonical schema omits these so a
    // partial PUT update doesn't re-inject them).
    currency: z.enum(CURRENCY_CODES).default(PLATFORM_DEFAULT_CURRENCY),
    is_public: z.boolean().default(true),
    is_negotiable: z.boolean().default(true),
    contact_method: z.enum(CONTACT_METHOD_VALUES).default('platform'),
    // Narrow nullable API fields to the non-null shapes the form inputs use.
    // (The API accepts null because a saved row round-trips nulls / the payload
    // sends `?? null`; the form only ever produces a value or `undefined`.)
    loan_category_id: z.string().optional(),
    interest_rate: z.number().min(0).max(100).optional(),
    monthly_payment: z.number().min(0).optional(),
    minimum_offer_amount: z.number().min(0).optional(),
    lender_name: z.string().max(100).optional(),
    loan_number: z.string().max(100).optional(),
    origination_date: z.string().optional(),
    maturity_date: z.string().optional(),
    preferred_terms: z.string().max(1000).optional(),
  })
  .refine(data => data.remaining_balance <= data.original_amount, {
    message: 'Remaining balance cannot exceed original amount',
    path: ['remaining_balance'],
  });

export type LoanDialogFormData = z.infer<typeof loanSchema>;
