/**
 * GET /api/v1/openapi.json — the v1 OpenAPI 3.1 spec.
 *
 * Public, unauthenticated. The document describes only routes we promise
 * to keep working — leaking it doesn't leak anything that isn't already
 * the public contract.
 *
 * Cache-Control: 5 minutes — the spec is process-memoised, so this
 * mostly serves the browser/CDN tier.
 */

import { NextResponse } from 'next/server';
import { getOpenApiSpec } from '@/lib/openapi/generator';

export async function GET() {
  return NextResponse.json(getOpenApiSpec(), {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=86400',
    },
  });
}
