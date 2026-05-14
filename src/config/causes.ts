/**
 * Cause Entity Configuration - Single Source of Truth
 *
 * Display labels for cause categories.
 * Components should import from here instead of defining inline.
 */

// ==================== CAUSE CATEGORIES ====================

export const CAUSE_CATEGORIES = [
  'Education',
  'Healthcare',
  'Environment',
  'Poverty Relief',
  'Animal Welfare',
  'Disaster Relief',
  'Human Rights',
  'Arts & Culture',
  'Community Development',
  'Technology Access',
  'Mental Health',
  'Veterans Support',
  'Children & Youth',
  'Elderly Care',
  'Other',
] as const;

export type CauseCategory = (typeof CAUSE_CATEGORIES)[number];

/** Form select options derived from CAUSE_CATEGORIES */
export const CAUSE_CATEGORY_OPTIONS = CAUSE_CATEGORIES.map(cat => ({ value: cat, label: cat }));

// ==================== CAUSE STATUSES ====================

// DB constraint: CHECK (status IN ('draft', 'active', 'completed', 'cancelled'))
export const CAUSE_STATUSES = ['draft', 'active', 'completed', 'cancelled'] as const;
export type CauseStatus = (typeof CAUSE_STATUSES)[number];

// ==================== DISTRIBUTION RULE TYPES ====================

export const DISTRIBUTION_RULE_TYPES = ['equal', 'weighted', 'custom'] as const;
export type DistributionRuleType = (typeof DISTRIBUTION_RULE_TYPES)[number];
