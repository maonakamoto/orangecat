import { STATUS, ENTITY_STATUS as GENERIC_ENTITY_STATUS } from '@/config/database-constants';
import { type EntityType } from '@/config/entity-registry';

export type BadgeVariant = 'success' | 'default' | 'warning' | 'destructive' | 'info' | 'error';

export interface EntityStatusBadge {
  label: string;
  variant: BadgeVariant;
}

export type ClientStatusIntent =
  | 'draft'
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled'
  | 'archived';

export const CLIENT_STATUS_INTENTS = [
  'draft',
  'active',
  'paused',
  'completed',
  'cancelled',
  'archived',
] as const satisfies readonly ClientStatusIntent[];

export const ENTITY_PUBLISH_STATUS: Partial<Record<EntityType, string>> = {
  event: STATUS.EVENTS.PUBLISHED,
  investment: STATUS.INVESTMENTS.OPEN,
};

export const LIVE_ENTITY_STATUSES = new Set<string>([
  GENERIC_ENTITY_STATUS.ACTIVE,
  STATUS.EVENTS.PUBLISHED,
  STATUS.EVENTS.OPEN,
  STATUS.EVENTS.FULL,
  STATUS.EVENTS.ONGOING,
  STATUS.INVESTMENTS.OPEN,
  STATUS.INVESTMENTS.FUNDED,
]);

export const ENTITY_STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['active', 'published', 'open'],
  active: ['paused', 'completed', 'cancelled', 'draft', 'archived'],
  paused: ['active', 'draft'],
  completed: ['draft'],
  cancelled: ['draft'],
  archived: ['draft'],
  published: ['open', 'paused', 'cancelled', 'draft'],
  open: ['full', 'ongoing', 'paused', 'cancelled', 'draft'],
  full: ['open', 'ongoing', 'cancelled'],
  ongoing: ['completed', 'cancelled'],
  funded: ['active', 'closed', 'cancelled'],
  closed: ['draft'],
};

const STATUS_BADGES = {
  project: {
    [STATUS.PROJECTS.DRAFT]: { label: 'Draft', variant: 'default' },
    [STATUS.PROJECTS.ACTIVE]: { label: 'Active', variant: 'success' },
    [STATUS.PROJECTS.PAUSED]: { label: 'Paused', variant: 'warning' },
    [STATUS.PROJECTS.COMPLETED]: { label: 'Completed', variant: 'success' },
    [STATUS.PROJECTS.CANCELLED]: { label: 'Cancelled', variant: 'destructive' },
  },
  product: {
    [STATUS.PRODUCTS.ACTIVE]: { label: 'Active', variant: 'success' },
    [STATUS.PRODUCTS.DRAFT]: { label: 'Draft', variant: 'default' },
    [STATUS.PRODUCTS.PAUSED]: { label: 'Paused', variant: 'warning' },
    [STATUS.PRODUCTS.SOLD_OUT]: { label: 'Sold Out', variant: 'destructive' },
  },
  service: {
    [STATUS.SERVICES.ACTIVE]: { label: 'Active', variant: 'success' },
    [STATUS.SERVICES.DRAFT]: { label: 'Draft', variant: 'default' },
    [STATUS.SERVICES.PAUSED]: { label: 'Paused', variant: 'warning' },
    [STATUS.SERVICES.UNAVAILABLE]: { label: 'Unavailable', variant: 'destructive' },
  },
  cause: {
    [STATUS.CAUSES.ACTIVE]: { label: 'Active', variant: 'success' },
    [STATUS.CAUSES.COMPLETED]: { label: 'Completed', variant: 'default' },
    [STATUS.CAUSES.DRAFT]: { label: 'Draft', variant: 'default' },
    [STATUS.CAUSES.CANCELLED]: { label: 'Cancelled', variant: 'destructive' },
  },
  ai_assistant: {
    [STATUS.AI_ASSISTANTS.ACTIVE]: { label: 'Active', variant: 'success' },
    [STATUS.AI_ASSISTANTS.PAUSED]: { label: 'Paused', variant: 'warning' },
    [STATUS.AI_ASSISTANTS.DRAFT]: { label: 'Draft', variant: 'default' },
    [STATUS.AI_ASSISTANTS.ARCHIVED]: { label: 'Archived', variant: 'default' },
  },
  loan: {
    [STATUS.LOANS.ACTIVE]: { label: 'Active', variant: 'success' },
    [STATUS.LOANS.PAID_OFF]: { label: 'Paid Off', variant: 'success' },
    [STATUS.LOANS.REFINANCED]: { label: 'Refinanced', variant: 'default' },
    [STATUS.LOANS.DEFAULTED]: { label: 'Defaulted', variant: 'destructive' },
    [STATUS.LOANS.CANCELLED]: { label: 'Cancelled', variant: 'warning' },
  },
  investment: {
    [STATUS.INVESTMENTS.DRAFT]: { label: 'Draft', variant: 'default' },
    [STATUS.INVESTMENTS.OPEN]: { label: 'Open', variant: 'success' },
    [STATUS.INVESTMENTS.FUNDED]: { label: 'Funded', variant: 'success' },
    [STATUS.INVESTMENTS.ACTIVE]: { label: 'Active', variant: 'success' },
    [STATUS.INVESTMENTS.CLOSED]: { label: 'Closed', variant: 'default' },
    [STATUS.INVESTMENTS.CANCELLED]: { label: 'Cancelled', variant: 'warning' },
  },
  event: {
    [STATUS.EVENTS.PUBLISHED]: { label: 'Published', variant: 'success' },
    [STATUS.EVENTS.OPEN]: { label: 'Open', variant: 'success' },
    [STATUS.EVENTS.FULL]: { label: 'Full', variant: 'warning' },
    [STATUS.EVENTS.ONGOING]: { label: 'Ongoing', variant: 'success' },
    [STATUS.EVENTS.COMPLETED]: { label: 'Completed', variant: 'default' },
    [STATUS.EVENTS.DRAFT]: { label: 'Draft', variant: 'default' },
    [STATUS.EVENTS.CANCELLED]: { label: 'Cancelled', variant: 'destructive' },
  },
  research: {
    [STATUS.RESEARCH.ACTIVE]: { label: 'Active', variant: 'success' },
    [STATUS.RESEARCH.DRAFT]: { label: 'Draft', variant: 'default' },
    [STATUS.RESEARCH.PAUSED]: { label: 'Paused', variant: 'warning' },
    [STATUS.RESEARCH.COMPLETED]: { label: 'Completed', variant: 'default' },
    [STATUS.RESEARCH.CANCELLED]: { label: 'Cancelled', variant: 'destructive' },
  },
  asset: {
    [STATUS.ASSETS.DRAFT]: { label: 'Draft', variant: 'default' },
    [STATUS.ASSETS.ACTIVE]: { label: 'Active', variant: 'success' },
    [STATUS.ASSETS.ARCHIVED]: { label: 'Archived', variant: 'default' },
  },
} as const satisfies Partial<Record<EntityType, Record<string, EntityStatusBadge>>>;

const ENTITY_STATUS_BADGES: Partial<Record<EntityType, Record<string, EntityStatusBadge>>> =
  STATUS_BADGES;

export function resolvePublishStatus(entityType: EntityType, clientStatus: string): string {
  return clientStatus === GENERIC_ENTITY_STATUS.ACTIVE
    ? (ENTITY_PUBLISH_STATUS[entityType] ?? clientStatus)
    : clientStatus;
}

export function getAllowedStatusTransitions(status: string): string[] {
  return ENTITY_STATUS_TRANSITIONS[status.toLowerCase()] ?? [];
}

export function getStatusBadge(
  entityType: EntityType,
  status: string | null | undefined
): EntityStatusBadge | undefined {
  if (!status) {
    return undefined;
  }
  return ENTITY_STATUS_BADGES[entityType]?.[status];
}

export function isLiveEntityStatus(status: string | null | undefined): boolean {
  return Boolean(status && LIVE_ENTITY_STATUSES.has(status));
}
