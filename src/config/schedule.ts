/**
 * Schedule / availability configuration - Single Source of Truth
 *
 * Shared across service availability and social schedule schemas.
 */

export const DAYS_OF_WEEK = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

// ==================== RECURRENCE FREQUENCIES ====================

export const RECURRENCE_FREQUENCIES = ['daily', 'weekly', 'biweekly', 'monthly', 'yearly'] as const;
export type RecurrenceFrequency = (typeof RECURRENCE_FREQUENCIES)[number];
