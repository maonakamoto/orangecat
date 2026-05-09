/**
 * Loan Entity Configuration - Single Source of Truth
 *
 * Display labels for loan categories and fulfillment types.
 * Components should import from here instead of defining inline.
 */

// ==================== LOAN CATEGORIES ====================

export const LOAN_CATEGORIES = [
  { value: 'personal', label: 'Personal Loan' },
  { value: 'business', label: 'Business Loan' },
  { value: 'education', label: 'Education Loan' },
  { value: 'home_improvement', label: 'Home Improvement' },
  { value: 'debt_consolidation', label: 'Debt Consolidation' },
  { value: 'emergency', label: 'Emergency Loan' },
  { value: 'other', label: 'Other' },
] as const;

export type LoanCategory = (typeof LOAN_CATEGORIES)[number]['value'];

// ==================== FULFILLMENT TYPES ====================

export const LOAN_FULFILLMENT_TYPES = [
  { value: 'manual', label: 'Manual Repayment' },
  { value: 'automatic', label: 'Automatic Deduction' },
] as const;

export type LoanFulfillmentType = (typeof LOAN_FULFILLMENT_TYPES)[number]['value'];

// ==================== DERIVED LOOKUP MAPS ====================

export const LOAN_CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  LOAN_CATEGORIES.map(c => [c.value, c.label])
);
