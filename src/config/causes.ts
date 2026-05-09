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
