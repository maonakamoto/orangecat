/**
 * Public API root — GET /api/v1
 *
 * Discovery endpoint. Returns the version, the supported entity routes,
 * and a hint about auth. Unauthenticated — what it returns is the set of
 * URLs we promise to keep working under v1, which is by definition public.
 *
 * SDKs can hit this once at startup to:
 *   - confirm the contract version
 *   - enumerate available endpoints
 *   - fail fast if the server they're pointed at doesn't speak v1
 */

import { apiSuccess } from '@/lib/api/standardResponse';
import {
  PUBLIC_API_VERSION,
  PUBLIC_API_BASE,
  PUBLIC_API_ENTITY_TYPES,
  publicApiEndpoint,
} from '@/config/public-api';

export async function GET() {
  return apiSuccess({
    version: PUBLIC_API_VERSION,
    base: PUBLIC_API_BASE,
    auth: {
      header: 'X-OrangeCat-Key',
      alternativeHeader: 'Authorization: Bearer ock_…',
      session: 'Supabase cookie also accepted (web app path)',
    },
    entities: PUBLIC_API_ENTITY_TYPES.map(type => ({
      type,
      methods: ['POST', 'GET'],
      endpoint: publicApiEndpoint(type),
    })),
    docs: {
      contract: '/api/v1/README.md (in repo)',
      conventions: '/docs/api/CONVENTIONS.md (in repo)',
      openapi: '/api/v1/openapi.json',
      changelog: '(not yet published)',
    },
  });
}
