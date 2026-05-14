/**
 * Service Entity Configuration - Single Source of Truth
 *
 * Option arrays for service location types.
 * Shared between entity-config field definitions and Zod validation schemas.
 */

// ==================== SERVICE LOCATION TYPES ====================

export const SERVICE_LOCATION_TYPES = [
  { value: 'remote', label: 'Remote Only' },
  { value: 'onsite', label: 'On-site Only' },
  { value: 'both', label: 'Both Remote & On-site' },
] as const;

export type ServiceLocationType = (typeof SERVICE_LOCATION_TYPES)[number]['value'];

// ==================== SERVICE STATUSES ====================

export const SERVICE_STATUSES = ['draft', 'active', 'paused', 'unavailable'] as const;
export type ServiceStatus = (typeof SERVICE_STATUSES)[number];
