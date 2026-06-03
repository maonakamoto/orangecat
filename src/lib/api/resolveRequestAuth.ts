/**
 * Unified request-auth resolver.
 *
 * Returns the caller's user_id plus, when present, a pre-bound actor_id
 * (currently used by integration-key auth — the key knows which actor it
 * acts as). Session-cookie callers get null for `boundActorId` and go
 * through the regular actor-resolution path.
 *
 * Created: 2026-06-03
 * Last Modified: 2026-06-03
 * Last Modified Summary: Initial implementation — first place entityPostHandler accepts non-session auth.
 */

import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { verifyIntegrationKey } from '@/services/auth/integrationKeys';

export interface ResolvedRequestAuth {
  userId: string;
  /**
   * Actor the request must act as. Set for integration-key auth (the key
   * is bound to an actor at mint time); null for session auth.
   */
  boundActorId: string | null;
  /** Source — useful for logs and feature gating. */
  source: 'session' | 'integration_key';
  /** Set for integration-key auth so we can log which key was used. */
  integrationKeyId: string | null;
  /**
   * Allowed operations. Session auth always has ['*'] (full authority via
   * the user's own credentials). Integration-key auth inherits the key's
   * stored scopes, defaulting to ['*'] for back-compat.
   */
  scopes: string[];
  /**
   * Sandbox flag. Session auth is always live (false). Integration-key
   * auth inherits the key's is_test column. Entity handlers stamp this
   * onto created rows and filter list/read by it.
   */
  isTest: boolean;
}

const BEARER_PREFIX = 'Bearer ';
const INTEGRATION_KEY_HEADER = 'x-orangecat-key';

function extractIntegrationKey(req: NextRequest): string | null {
  const headerKey = req.headers.get(INTEGRATION_KEY_HEADER);
  if (headerKey) {
    return headerKey.trim();
  }

  const auth = req.headers.get('authorization');
  if (auth && auth.startsWith(BEARER_PREFIX)) {
    const token = auth.slice(BEARER_PREFIX.length).trim();
    // Only treat as integration key if it looks like one (`ock_…`). Other
    // bearer tokens (e.g. Supabase access tokens) fall through to session.
    if (token.startsWith('ock_')) {
      return token;
    }
  }
  return null;
}

export async function resolveRequestAuth(req: NextRequest): Promise<ResolvedRequestAuth | null> {
  const presentedKey = extractIntegrationKey(req);
  if (presentedKey) {
    const resolved = await verifyIntegrationKey(presentedKey);
    if (resolved) {
      return {
        userId: resolved.userId,
        boundActorId: resolved.actorId,
        source: 'integration_key',
        integrationKeyId: resolved.keyId,
        scopes: resolved.scopes,
        isTest: resolved.isTest,
      };
    }
    // Bad / revoked / expired integration key: fail closed. Don't silently
    // fall through to session — the presence of the header signals intent.
    return null;
  }

  // No integration key — try the Supabase session.
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }
  return {
    userId: user.id,
    boundActorId: null,
    source: 'session',
    integrationKeyId: null,
    scopes: ['*'],
    isTest: false,
  };
}

/**
 * Scope check.
 *   - `['*']` always passes.
 *   - Otherwise the required token (e.g. `products.write`) must appear
 *     literally in the allowed list. We deliberately don't support
 *     prefix wildcards like `products.*` yet — keep the rule trivially
 *     auditable.
 */
export function hasScope(authScopes: string[], required: string): boolean {
  if (authScopes.includes('*')) {
    return true;
  }
  return authScopes.includes(required);
}
