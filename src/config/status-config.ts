/**
 * Status Configuration - Single Source of Truth
 *
 * Centralized status labels and styling for all entity statuses.
 * Components should import from here instead of defining their own mappings.
 *
 * BENEFITS:
 * - Consistent status presentation across the app
 * - Easy to update labels/colors in one place
 * - Follows DRY and SSOT principles from CLAUDE.md
 *
 * Created: 2026-01-28
 */

// ==================== STATUS TYPES ====================

/**
 * Common entity statuses across the platform
 */
export type EntityStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled' | 'archived';

// ==================== STATUS CONFIG ====================

interface StatusInfo {
  label: string;
  className: string;
  description?: string;
}

/**
 * Status configuration - SSOT for all status labels and styles
 */
import { BADGE_COLORS } from '@/config/badge-colors';

export const STATUS_CONFIG: Record<EntityStatus, StatusInfo> = {
  draft: { label: 'Draft', className: BADGE_COLORS.neutral, description: 'Not yet published' },
  active: { label: 'Active', className: BADGE_COLORS.success, description: 'Live and visible' },
  paused: { label: 'Paused', className: BADGE_COLORS.warning, description: 'Temporarily inactive' },
  completed: {
    label: 'Completed',
    className: BADGE_COLORS.info,
    description: 'Successfully finished',
  },
  cancelled: { label: 'Cancelled', className: BADGE_COLORS.error, description: 'No longer active' },
  archived: {
    label: 'Archived',
    className: BADGE_COLORS.muted,
    description: 'Stored for reference',
  },
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Get status info for any status string
 * Returns default styling for unknown statuses
 *
 * @example
 * const info = getStatusInfo('active');
 * // { label: 'Active', className: 'bg-green-100 text-green-700' }
 */
export function getStatusInfo(status: string | null | undefined): StatusInfo {
  if (!status) {
    return { label: 'Unknown', className: BADGE_COLORS.neutral };
  }

  const normalized = status.toLowerCase() as EntityStatus;
  return (
    STATUS_CONFIG[normalized] || {
      label: status.charAt(0).toUpperCase() + status.slice(1),
      className: BADGE_COLORS.neutral,
    }
  );
}

/**
 * Check if a status is considered "public" (visible to others)
 */
export function isPublicStatus(status: string | null | undefined): boolean {
  const publicStatuses: EntityStatus[] = ['active', 'completed'];
  return publicStatuses.includes((status?.toLowerCase() || '') as EntityStatus);
}

// ==================== STATUS LISTS ====================

/**
 * Statuses considered "normal" that don't need special visual emphasis
 * (e.g., no extra badge needed on entity cards)
 */
export const NORMAL_VISIBLE_STATUSES: EntityStatus[] = ['active', 'draft'];

/**
 * Typed status value constants — use these instead of raw string literals
 * in comparisons and handlers to maintain SSOT.
 */
export const ENTITY_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  ARCHIVED: 'archived',
} as const satisfies Record<string, EntityStatus>;
