/**
 * Register an OIDC relying party in `public.oauth_clients` — OIDC provider slice 1d.
 *
 * OrangeCat is the platform's OAuth2/OIDC authorization server ("Login with
 * OrangeCat"). The provider code (slices 1a–1c) is inert until a client row
 * exists; this script creates / updates that row. FleetCrown is the second
 * first-party client (the first being the OrangeCat app itself).
 *
 * Secrets are NEVER committed: the client secret is read from env (or generated)
 * and only its sha256 hash is stored — mirroring integration_keys and the
 * oauth_provider migration. The plaintext is printed ONCE on creation so it can
 * be handed to the relying party out-of-band.
 *
 * Idempotent + safe to re-run:
 *   - upserts by the stable `client_id`;
 *   - refreshes non-secret fields (name, redirect_uris, allowed_scopes, flags)
 *     every run so config drift is corrected;
 *   - the secret is set on first creation and otherwise left untouched, UNLESS
 *     `--rotate` is passed (which mints a new secret and prints it).
 *
 * Run against the LIVE self-hosted DB (supabase.orangecat.ch) from the box:
 *   ORANGECAT_OWNER_SEED=1 npx tsx scripts/oauth/register-client.ts
 *   ORANGECAT_OWNER_SEED=1 npx tsx scripts/oauth/register-client.ts --rotate
 *
 * Requires in the environment (already in .env.local on the box):
 *   NEXT_PUBLIC_SUPABASE_URL   — self-hosted Supabase URL
 *   SUPABASE_SERVICE_ROLE_KEY  — service role (bypasses the table's RLS)
 * Optional:
 *   FLEETCROWN_OAUTH_SECRET    — use a pre-agreed secret instead of generating one
 *   FLEETCROWN_REDIRECT_URIS   — comma-separated; ADDED to the built-in defaults
 *
 * Created: 2026-06-17
 */

import { config as loadEnv } from 'dotenv';
import { createHash, randomBytes } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { parseAndValidateScopes } from '../../src/lib/oauth/config';

loadEnv({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function die(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

if (process.env.ORANGECAT_OWNER_SEED !== '1') {
  die('Refusing to run without ORANGECAT_OWNER_SEED=1 (owner-gated).');
}
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  die('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment.');
}

const rotate = process.argv.includes('--rotate');
const sha256 = (s: string): string => createHash('sha256').update(s).digest('hex');

/**
 * The FleetCrown relying-party spec — the registered SSOT, deliberately
 * least-privilege (this mirrors the row first registered + go-live-verified on
 * 2026-06-17; the secret already lives in FleetCrown's env).
 *
 * - allowed_scopes: only what FleetCrown actually needs today. NOT the full
 *   supported set — `effectiveScopes()` narrows per-request, but the *ceiling*
 *   stays minimal so a token can never be minted for a capability FC shouldn't
 *   have. Widen here intentionally (and re-run) when FC needs a new capability.
 * - redirect_uris: the Auth.js v5 callback ({origin}/api/auth/callback/orangecat)
 *   for FleetCrown's production origin. Exact-match is enforced (no wildcards).
 *   Append dev/preview origins via FLEETCROWN_REDIRECT_URIS when needed.
 */
const CALLBACK_PATH = '/api/auth/callback/orangecat';
const DEFAULT_ORIGINS = [
  'https://fleetcrown.orangecat.ch', // production origin (PLATFORM_AND_COLLABORATION.md)
];

const extraRedirects = (process.env.FLEETCROWN_REDIRECT_URIS ?? '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const redirectUris = Array.from(
  new Set([...DEFAULT_ORIGINS.map(o => `${o}${CALLBACK_PATH}`), ...extraRedirects])
);

// Validate against the OAuth scope registry SSOT so a typo can't register an
// unknown scope (parseAndValidateScopes drops unknowns into `.unknown`).
const FLEETCROWN_SCOPES =
  'openid profile email project.read project.write timeline.write wallet.read';
const { granted: allowedScopes, unknown: unknownScopes } =
  parseAndValidateScopes(FLEETCROWN_SCOPES);
if (unknownScopes.length) {
  die(`Unknown scope(s) in FLEETCROWN_SCOPES: ${unknownScopes.join(', ')}`);
}

const CLIENT = {
  client_id: 'fleetcrown',
  name: 'FleetCrown',
  redirect_uris: redirectUris,
  allowed_scopes: allowedScopes,
  is_confidential: true, // FleetCrown has a server (Auth.js v5) — keeps a secret
  is_trusted: true, // first-party — skips the consent screen after first grant
} as const;

const admin: SupabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

interface ClientRow {
  id: string;
  client_id: string;
  client_secret_hash: string | null;
  disabled_at: string | null;
}

async function run(): Promise<void> {
  const { data: existing, error: readErr } = await admin
    .from('oauth_clients')
    .select('id, client_id, client_secret_hash, disabled_at')
    .eq('client_id', CLIENT.client_id)
    .maybeSingle<ClientRow>();
  if (readErr) {
    die(`Failed to read oauth_clients: ${readErr.message}`);
  }

  // Decide the secret: keep existing unless creating or rotating.
  let newSecret: string | null = null;
  let secretHash: string | null = existing?.client_secret_hash ?? null;
  if (!existing || rotate) {
    newSecret = process.env.FLEETCROWN_OAUTH_SECRET || randomBytes(32).toString('base64url');
    secretHash = sha256(newSecret);
  }

  const row = {
    client_id: CLIENT.client_id,
    client_secret_hash: secretHash,
    name: CLIENT.name,
    redirect_uris: CLIENT.redirect_uris,
    allowed_scopes: CLIENT.allowed_scopes,
    is_confidential: CLIENT.is_confidential,
    is_trusted: CLIENT.is_trusted,
    disabled_at: null, // re-enable if it had been revoked
  };

  const { error: upsertErr } = await admin
    .from('oauth_clients')
    .upsert(row, { onConflict: 'client_id' });
  if (upsertErr) {
    die(`Failed to upsert oauth_clients: ${upsertErr.message}`);
  }

  const verb = existing ? (rotate ? 'updated + rotated secret for' : 'updated') : 'created';
  console.log(`✓ ${verb} OIDC client "${CLIENT.client_id}" (${CLIENT.name})`);
  console.log(`  redirect_uris : ${CLIENT.redirect_uris.join('\n                  ')}`);
  console.log(`  allowed_scopes: ${CLIENT.allowed_scopes.join(' ')}`);
  console.log(`  confidential  : ${CLIENT.is_confidential}   trusted: ${CLIENT.is_trusted}`);

  if (newSecret) {
    console.log('\n  ┌──────────────────────────────────────────────────────────────');
    console.log('  │ CLIENT SECRET (shown ONCE — store in FleetCrown env now):');
    console.log(`  │   client_id     = ${CLIENT.client_id}`);
    console.log(`  │   client_secret = ${newSecret}`);
    console.log('  └──────────────────────────────────────────────────────────────');
    if (process.env.FLEETCROWN_OAUTH_SECRET) {
      console.log('  (used FLEETCROWN_OAUTH_SECRET from the environment)');
    }
  } else {
    console.log('\n  Secret unchanged (pass --rotate to mint a new one).');
  }
}

run().catch(e => die(e instanceof Error ? e.message : String(e)));
