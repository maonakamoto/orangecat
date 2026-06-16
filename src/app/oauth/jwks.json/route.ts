/**
 * JWKS endpoint.
 *
 * GET /oauth/jwks.json — publishes the public signing key(s) so relying parties
 * verify OrangeCat-issued tokens. Returns the current key plus any retired but
 * not-yet-expired keys (rotation). Requires OIDC signing env to be configured.
 */
import { NextResponse } from 'next/server';
import { getPublicJwks } from '@/lib/oauth/keys';
import { logger } from '@/utils/logger';

// Depends on runtime env (signing key); don't statically prerender.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const jwks = await getPublicJwks();
    return NextResponse.json(jwks, {
      headers: { 'Cache-Control': 'public, max-age=3600' },
    });
  } catch (error) {
    logger.error('Failed to serve JWKS', error, 'OAuth');
    // 503: the provider is misconfigured (no key), not the caller's fault.
    return NextResponse.json({ error: 'signing_key_unavailable' }, { status: 503 });
  }
}
