-- ============================================================================
-- Webhook endpoints + delivery log
-- ============================================================================
-- docs/api/CONVENTIONS.md §6 advertises HMAC-SHA-256 signed webhook
-- delivery so integrations (FleetCrown, hirn.li, third parties) can react
-- to entity-create / status-change events without polling. This migration
-- lands the persistence layer only. The signing util, event firing, and
-- delivery worker are separate commits — none of those need a schema
-- change.
--
-- Shape mirrors integration_keys (same actor-bound model, same soft-
-- revocation pattern, same admin-only RLS posture):
--   - A webhook endpoint is minted by a user, bound to one actor.
--   - Only events for that bound actor are delivered to that endpoint.
--   - Soft-revoke via revoked_at; the active-target index excludes them.
--
-- Created: 2026-06-03
-- ============================================================================

-- ==================== ENDPOINTS ====================

CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who minted the endpoint (audit + revocation authority).
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Which actor's events flow to this endpoint. Same shape as actor_id
  -- everywhere else in the schema.
  actor_id UUID NOT NULL REFERENCES actors(id) ON DELETE CASCADE,

  -- Human-readable label ("FleetCrown production webhook", ...).
  name TEXT NOT NULL,

  -- Target URL the worker POSTs deliveries to. Must be https in prod;
  -- the app layer enforces that — DB just stores the string.
  url TEXT NOT NULL,

  -- HMAC signing secret. SHA-256-hashed at rest the same way
  -- integration_keys does it. Plaintext shown to the user ONCE at mint.
  secret_hash TEXT NOT NULL,

  -- First 11 chars of the plaintext secret for UI display ("ock_whk_a..."
  -- or whatever prefix we pick — value doesn't matter to the schema).
  secret_prefix TEXT NOT NULL,

  -- Optional event-type allowlist. NULL = receive every event for the
  -- bound actor. Array of strings like ['product.created', 'service.updated'].
  event_types TEXT[],

  -- Lifecycle timestamps.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_delivery_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,

  CONSTRAINT webhook_endpoints_name_not_blank CHECK (length(trim(name)) > 0),
  CONSTRAINT webhook_endpoints_url_not_blank CHECK (length(trim(url)) > 0)
);

-- Hot path: "what live endpoints does this actor have?"
CREATE INDEX IF NOT EXISTS webhook_endpoints_actor_active_idx
  ON webhook_endpoints (actor_id)
  WHERE revoked_at IS NULL;

-- For the /settings/integrations UI listing.
CREATE INDEX IF NOT EXISTS webhook_endpoints_user_id_idx
  ON webhook_endpoints (user_id);

ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;

-- Deny by default. The application layer uses the admin client to read +
-- write (same model as integration_keys + idempotency_results — these
-- are plumbing tables, not user-facing entities).
COMMENT ON TABLE webhook_endpoints IS
  'Outbound webhook configuration. Admin-client only — RLS denies all user access. App layer authorises by user_id at the service boundary.';


-- ==================== DELIVERIES ====================

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  endpoint_id UUID NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,

  -- The event being delivered. Free-form on purpose — new entity types
  -- and event kinds get added without schema changes.
  event_type TEXT NOT NULL,
  event_id UUID NOT NULL,         -- stable per logical event, retries share it
  payload JSONB NOT NULL,

  -- Delivery outcome. NULL response_status = not attempted yet.
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'delivered', 'failed')),
  response_status INTEGER,
  response_body TEXT,             -- truncated to ~4KB at the service layer
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  next_attempt_at TIMESTAMPTZ,    -- worker polls this to pick what to retry

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT webhook_deliveries_event_type_not_blank CHECK (length(trim(event_type)) > 0)
);

-- Hot path for the worker: "which deliveries are due now?"
CREATE INDEX IF NOT EXISTS webhook_deliveries_due_idx
  ON webhook_deliveries (next_attempt_at)
  WHERE status = 'pending';

-- For the /settings/integrations UI to show recent deliveries per endpoint.
CREATE INDEX IF NOT EXISTS webhook_deliveries_endpoint_recent_idx
  ON webhook_deliveries (endpoint_id, created_at DESC);

ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE webhook_deliveries IS
  'Webhook delivery log + retry queue. Admin-client only — RLS denies all user access.';
