/**
 * Project collaborator-roles config — SSOT for engagement types and statuses.
 *
 * A project can post open roles ("need a backend dev"); these constants define
 * the allowed engagement types and lifecycle statuses, with user-facing labels.
 * Used by the API (validation), the service, and the /collaborate board.
 */

export const ENGAGEMENT_TYPES = [
  'paid',
  'equity',
  'revenue_share',
  'contribution',
  'volunteer',
] as const;
export type EngagementType = (typeof ENGAGEMENT_TYPES)[number];

export const ENGAGEMENT_LABELS: Record<EngagementType, string> = {
  paid: 'Paid',
  equity: 'Equity',
  revenue_share: 'Revenue share',
  contribution: 'Contribution',
  volunteer: 'Volunteer',
};

export const ROLE_STATUSES = ['open', 'filled', 'closed'] as const;
export type RoleStatus = (typeof ROLE_STATUSES)[number];

export const ROLE_STATUS_LABELS: Record<RoleStatus, string> = {
  open: 'Open',
  filled: 'Filled',
  closed: 'Closed',
};

export const isEngagementType = (v: unknown): v is EngagementType =>
  typeof v === 'string' && (ENGAGEMENT_TYPES as readonly string[]).includes(v);

export const isRoleStatus = (v: unknown): v is RoleStatus =>
  typeof v === 'string' && (ROLE_STATUSES as readonly string[]).includes(v);

export const MAX_ROLE_TITLE = 100;
export const MAX_ROLE_DESCRIPTION = 1000;
export const MAX_ROLE_SKILLS = 12;
