-- ============================================================================
-- OIDC provider ("Login with OrangeCat") — slice 1b.
--
-- OrangeCat is the platform's OAuth2/OIDC authorization server. These tables back
-- the authorization-code (+ PKCE) and refresh-token flows. All secrets are stored
-- HASHED (sha256), never plaintext — mirroring public.integration_keys. Every
-- table is service-role-only: RLS is ENABLED with NO policies, so anon/authenticated
-- clients (PostgREST) get nothing; only the server's service-role key (which
-- bypasses RLS) touches them.
--
-- See docs/architecture/PLATFORM_AND_COLLABORATION.md and src/lib/oauth/*.
-- ============================================================================

-- Registered relying parties (FleetCrown, future first-party + third-party apps).
create table if not exists public.oauth_clients (
  id uuid primary key default gen_random_uuid(),
  client_id text not null unique,
  -- null for public clients (PKCE-only, no secret); sha256 hash for confidential.
  client_secret_hash text,
  name text not null,
  redirect_uris text[] not null default '{}',
  allowed_scopes text[] not null default '{}',
  is_confidential boolean not null default true,
  -- trusted first-party clients skip the consent screen after the first grant.
  is_trusted boolean not null default false,
  created_at timestamptz not null default now(),
  -- revocation (keep the row for audit), mirrors integration_keys.revoked_at.
  disabled_at timestamptz
);

-- Short-lived, single-use authorization codes (the /authorize → /token handoff).
create table if not exists public.oauth_auth_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  client_id text not null,
  actor_id uuid not null,     -- the OIDC `sub`
  user_id uuid not null,      -- carried into the token as `uid`
  redirect_uri text not null,
  scopes text[] not null default '{}',
  code_challenge text not null,
  code_challenge_method text not null default 'S256',
  nonce text,
  expires_at timestamptz not null,
  consumed_at timestamptz,    -- single-use guard
  created_at timestamptz not null default now()
);
create index if not exists oauth_auth_codes_expires_idx on public.oauth_auth_codes (expires_at);

-- Rotating refresh tokens.
create table if not exists public.oauth_refresh_tokens (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  client_id text not null,
  actor_id uuid not null,
  user_id uuid not null,
  scopes text[] not null default '{}',
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists oauth_refresh_tokens_actor_idx on public.oauth_refresh_tokens (actor_id);

-- Remembered consent: lets trusted first-party clients skip the consent screen
-- on subsequent logins once the user has granted the scopes at least once.
create table if not exists public.oauth_user_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  client_id text not null,
  scopes text[] not null default '{}',
  granted_at timestamptz not null default now(),
  unique (user_id, client_id)
);

-- Service-role-only: enable RLS, define no policies → PostgREST/anon see nothing.
alter table public.oauth_clients enable row level security;
alter table public.oauth_auth_codes enable row level security;
alter table public.oauth_refresh_tokens enable row level security;
alter table public.oauth_user_grants enable row level security;
