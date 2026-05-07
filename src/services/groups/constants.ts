/**
 * Groups Service Constants
 *
 * References the SSOT config files.
 * No legacy constants - clean unified system.
 *
 * Created: 2025-01-30
 * Last Modified: 2025-12-29
 * Last Modified Summary: Removed legacy constants, using config-based SSOT only
 */

import { GROUP_LABELS, getGroupLabelDefaults, type GroupLabel } from '@/config/group-labels';
import { GOVERNANCE_PRESETS, type GovernancePreset } from '@/config/governance-presets';
import { GROUP_FEATURES, type GroupFeature } from '@/config/group-features';

// Re-export config for convenience
export { GROUP_LABELS, GOVERNANCE_PRESETS, GROUP_FEATURES };
export type { GroupLabel, GovernancePreset, GroupFeature };

// Pagination defaults
export { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@/constants/pagination';

/**
 * Get defaults for a group label
 * Delegates to the SSOT config
 */
export function getDefaultsForLabel(label: GroupLabel) {
  return getGroupLabelDefaults(label);
}
