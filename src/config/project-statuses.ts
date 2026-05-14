/**
 * Project Status Configuration - Single Source of Truth
 *
 * Centralized status definitions, labels, colors, and validation for projects.
 * All project status constants and helpers live here — import from this file only.
 *
 * Created: 2025-01-30
 * Last Modified: 2026-02-23
 * Last Modified Summary: Consolidated from lib/projectStatus.ts and database-constants.ts
 */

import { BADGE_COLORS } from '@/config/badge-colors';

/** String constants for project status comparisons (follows STATUS.* pattern) */
export const PROJECT_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const PROJECT_STATUSES = {
  draft: {
    label: 'Draft',
    className: `border ${BADGE_COLORS.muted}`,
    badgeVariant: 'default' as const,
  },
  active: {
    label: 'Active',
    className: `border ${BADGE_COLORS.success}`,
    badgeVariant: 'success' as const,
  },
  paused: {
    label: 'Paused',
    className: `border ${BADGE_COLORS.warning}`,
    badgeVariant: 'warning' as const,
  },
  completed: {
    label: 'Completed',
    className: `border ${BADGE_COLORS.info}`,
    badgeVariant: 'info' as const,
  },
  cancelled: {
    label: 'Cancelled',
    className: `border ${BADGE_COLORS.error}`,
    badgeVariant: 'error' as const,
  },
};

export type ProjectStatus = keyof typeof PROJECT_STATUSES;

/** All valid project status values */
export const VALID_PROJECT_STATUSES: readonly ProjectStatus[] = [
  'draft',
  'active',
  'paused',
  'completed',
  'cancelled',
] as const;

/** Statuses visible in public search/discover */
export const PUBLIC_SEARCH_STATUSES: readonly ProjectStatus[] = ['active', 'paused'] as const;
