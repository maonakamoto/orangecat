/**
 * Public types for @orangecat/sdk request bodies and responses.
 *
 * Authoritative contract is GET /api/v1/openapi.json — these are the
 * subset of fields consumers will use in v0.1. Unknown response fields
 * are typed `Record<string, unknown>` via the BaseResponse intersection
 * so additions on the server side don't break consumers.
 *
 * If you need a field that isn't typed here, look at the OpenAPI spec
 * for the authoritative shape and add it.
 */

/** Shared response fields server-assigned on every create. */
export interface BaseEntityResponse {
  id: string;
  actor_id: string;
  created_at: string;
}

export type CreateOptions = {
  /**
   * Create on behalf of a group actor. Session auth: must be a privileged
   * group member. Integration-key auth: IGNORED (the key is bound to an
   * actor at mint time).
   */
  actor_id?: string;
};

// ── Product ────────────────────────────────────────────────────────────────

export interface CreateProductInput extends CreateOptions {
  title: string;
  description?: string;
  price: number;
  currency?: string;
  category?: string;
  product_type?: 'physical' | 'digital' | string;
  tags?: string[];
  inventory_count?: number;
  fulfillment_type?: string;
  images?: string[];
  thumbnail_url?: string;
  is_featured?: boolean;
}

export type ProductResponse = BaseEntityResponse & CreateProductInput & Record<string, unknown>;

// ── Service ────────────────────────────────────────────────────────────────

export interface CreateServiceInput extends CreateOptions {
  title: string;
  description?: string;
  category: string;
  hourly_rate?: number | null;
  fixed_price?: number | null;
  currency?: string;
  duration_minutes?: number | null;
  service_location_type?: 'remote' | 'onsite' | 'both';
  service_area?: string | null;
  images?: string[];
  portfolio_links?: string[];
}

export type ServiceResponse = BaseEntityResponse & CreateServiceInput & Record<string, unknown>;

// ── Project ────────────────────────────────────────────────────────────────

export interface CreateProjectInput extends CreateOptions {
  title: string;
  description?: string;
  goal_amount?: number;
  category?: string;
  tags?: string[];
  images?: string[];
}

export type ProjectResponse = BaseEntityResponse & CreateProjectInput & Record<string, unknown>;

// ── Cause ──────────────────────────────────────────────────────────────────

export interface CreateCauseInput extends CreateOptions {
  title: string;
  description?: string;
  category?: string;
  goal_amount?: number;
}

export type CauseResponse = BaseEntityResponse & CreateCauseInput & Record<string, unknown>;

// ── Event ──────────────────────────────────────────────────────────────────

export interface CreateEventInput extends CreateOptions {
  title: string;
  description?: string;
  start_date: string;
  end_date?: string;
  location: string;
  max_attendees?: number;
}

export type EventResponse = BaseEntityResponse & CreateEventInput & Record<string, unknown>;

// ── Loan ───────────────────────────────────────────────────────────────────

export interface CreateLoanInput extends CreateOptions {
  title: string;
  description?: string;
  amount: number;
  interest_rate?: number;
  term_months?: number;
}

export type LoanResponse = BaseEntityResponse & CreateLoanInput & Record<string, unknown>;

// ── Investment ─────────────────────────────────────────────────────────────

export interface CreateInvestmentInput extends CreateOptions {
  title: string;
  description?: string;
  target_amount: number;
  minimum_investment?: number;
}

export type InvestmentResponse = BaseEntityResponse &
  CreateInvestmentInput &
  Record<string, unknown>;

// ── Asset ──────────────────────────────────────────────────────────────────

export interface CreateAssetInput extends CreateOptions {
  title: string;
  description?: string;
  type: string;
  value?: number;
}

export type AssetResponse = BaseEntityResponse & CreateAssetInput & Record<string, unknown>;

// ── Wishlist ───────────────────────────────────────────────────────────────

export interface CreateWishlistInput extends CreateOptions {
  title: string;
  description?: string;
  type?: string;
  visibility?: 'public' | 'unlisted' | 'private';
}

export type WishlistResponse = BaseEntityResponse & CreateWishlistInput & Record<string, unknown>;

// ── Discovery ──────────────────────────────────────────────────────────────

export interface DiscoveryResponse {
  version: string;
  base: string;
  auth: {
    header: string;
    alternativeHeader: string;
    session: string;
  };
  entities: Array<{
    type: string;
    methods: string[];
    endpoint: string;
  }>;
  integrations?: Array<{
    name: string;
    methods: string[];
    endpoint: string;
  }>;
  docs: {
    contract: string;
    conventions: string;
    openapi: string;
    changelog: string;
  };
}

// ── Timeline publish bus ───────────────────────────────────────────────────

export interface TimelinePublishInput {
  source: string;
  external_id: string;
  subject_type: 'project';
  subject_id: string;
  event_type: string;
  title: string;
  description?: string;
  content?: Record<string, unknown>;
  tags?: string[];
  visibility?: string;
  url?: string;
  event_timestamp?: string;
}

export interface TimelinePublishResponse {
  id: string;
  status: 'created' | 'updated';
}

// ── Stakeholders ─────────────────────────────────────────────────────────────

export type StakeholderKind =
  | 'competitor'
  | 'collaborator'
  | 'investor'
  | 'customer'
  | 'employee'
  | 'acquirer'
  | 'acquisition_target'
  | 'in_house_dev';

export interface CreateStakeholderInput {
  fromProjectId: string;
  kind: StakeholderKind;
  toActorId?: string;
  toProjectId?: string;
  toExternalUrl?: string;
  toExternalName?: string;
  status?: string;
  confidence?: number;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface StakeholderRelationship extends Record<string, unknown> {
  id: string;
  from_project_id: string;
  kind: StakeholderKind;
  owner_actor_id: string;
}

export interface StakeholderListResponse {
  relationships: StakeholderRelationship[];
}

export interface StakeholderCreateResponse {
  relationship: StakeholderRelationship;
}
