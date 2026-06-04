/**
 * Generic Entity GET-by-id Handler (public API path).
 *
 * Mirrors entityListHandler + entityPostHandler for the read-single-row
 * case. The internal /api/<entity>/[id] handlers (entityCrudHandler) are
 * session-only and don't know about integration keys, scopes, or
 * is_test; this factory handles those for the v1 public API.
 *
 * Per-entity routes at /api/v1/<entity>/[id]/route.ts re-export the
 * GET this factory returns.
 *
 * Created: 2026-06-04
 */

import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiForbidden,
  apiNotFound,
  apiRateLimited,
  handleApiError,
} from '@/lib/api/standardResponse';
import { logger } from '@/utils/logger';
import { type EntityType, getEntityMetadata, ENTITY_REGISTRY } from '@/config/entity-registry';
import { resolveRequestAuth, hasScope } from '@/lib/api/resolveRequestAuth';
import { rateLimitIntegrationKeyRead } from '@/lib/rate-limit';
import { PUBLIC_API_ENTITY_TYPES } from '@/config/public-api';

interface EntityGetByIdHandlerConfig {
  /** Entity type from registry */
  entityType: EntityType;
  /** Override table name (uses registry tableName if not specified) */
  tableName?: string;
  /** Select specific columns (default: '*') */
  selectColumns?: string;
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/v1/<entity>/[id]
 *
 * Auth: integration key (X-OrangeCat-Key) OR Supabase session OR
 * anonymous (anonymous can only see is_test=false rows with the
 * entity's public status — `active` by convention).
 *
 * Authorisation rules:
 *   - Integration key: must have `<entity>.read` scope; must own the
 *     row via actor_id == auth.boundActorId; row must match
 *     auth.isTest. 404 on mismatch (never 403/409) so probers can't
 *     distinguish "not yours" from "doesn't exist".
 *   - Session: owner sees all statuses for their own rows; others
 *     only see public statuses (default `active`).
 *   - Anonymous: only public statuses on is_test=false rows.
 *
 * Stacks the per-key read quota on top of the global IP-based read
 * limit (same as entityListHandler — adds isolation between keys).
 */
export function createEntityGetByIdHandler(config: EntityGetByIdHandlerConfig) {
  const { entityType, tableName, selectColumns = '*' } = config;
  const meta = getEntityMetadata(entityType);
  const table = tableName ?? meta.tableName;

  return async function GET(request: NextRequest, { params }: RouteParams) {
    try {
      const { id } = await params;
      if (!UUID_RE.test(id)) {
        return apiNotFound(`${meta.name}`);
      }

      const auth = await resolveRequestAuth(request);

      // Integration-key scope check. Sessions always pass (scopes=['*']).
      // Anonymous reads pass — public reads aren't gated.
      if (auth?.source === 'integration_key' && !hasScope(auth.scopes, `${entityType}.read`)) {
        return apiForbidden(
          `This key is not allowed to read ${ENTITY_REGISTRY[entityType].namePlural.toLowerCase()}.`
        );
      }

      // Per-key read quota stacks on top of IP-based limiting.
      if (auth?.source === 'integration_key' && auth.integrationKeyId) {
        const rate = await rateLimitIntegrationKeyRead(auth.integrationKeyId);
        if (!rate.success) {
          const retryAfter = Math.ceil((rate.resetTime - Date.now()) / 1000);
          return apiRateLimited(
            `Too many ${meta.namePlural.toLowerCase()} read requests. Please slow down.`,
            retryAfter
          );
        }
      }

      const supabase = await createServerClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase.from(table) as any).select(selectColumns).eq('id', id);

      // Sandbox isolation, scoped to entity types that got the is_test
      // column in migration 20260604000002.
      const hasIsTestColumn = (PUBLIC_API_ENTITY_TYPES as readonly string[]).includes(entityType);
      if (hasIsTestColumn) {
        const wantsTestData = auth?.source === 'integration_key' && auth.isTest;
        query = query.eq('is_test', wantsTestData);
      }

      // Integration-key auth — the key is bound to one actor, that
      // actor is the only scope. Owner-of-row required.
      if (auth?.source === 'integration_key' && auth.boundActorId) {
        query = query.eq('actor_id', auth.boundActorId);
      }

      const { data, error } = await query.maybeSingle();
      if (error) {
        logger.error(`Error fetching ${entityType} by id`, {
          error,
          entityType,
          id,
          authSource: auth?.source,
        });
        return apiNotFound(meta.name);
      }
      if (!data) {
        return apiNotFound(meta.name);
      }

      // For anonymous + session auth (no boundActorId), filter by
      // public statuses unless the caller owns the row.
      const row = data as Record<string, unknown>;
      if (auth?.source !== 'integration_key') {
        const status = row.status as string | undefined;
        const isPublic = status === 'active';
        const isOwner = await isCallerOwner(row, auth?.userId, supabase);
        if (!isPublic && !isOwner) {
          // Same 404 envelope — don't reveal that the row exists.
          return apiNotFound(meta.name);
        }
      }

      return apiSuccess(row);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

async function isCallerOwner(
  row: Record<string, unknown>,
  userId: string | undefined,
  supabase: Awaited<ReturnType<typeof createServerClient>>
): Promise<boolean> {
  if (!userId) {
    return false;
  }
  // Two ownership models in the codebase: user_id direct, or actor_id
  // resolved from the user. Check both.
  if (row.user_id === userId) {
    return true;
  }
  if (row.actor_id) {
    const { data } = await supabase
      .from('actors')
      .select('id')
      .eq('id', row.actor_id as string)
      .eq('user_id', userId)
      .maybeSingle();
    return !!data;
  }
  return false;
}
