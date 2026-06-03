/**
 * Generic Entity POST Handler
 *
 * Provides reusable POST handler for entity creation endpoints.
 * Handles auth, rate limiting, validation, and database insertion.
 *
 * Benefits:
 * - Eliminates duplication across entity creation routes
 * - Consistent error handling
 * - Automatic rate limiting
 * - Type-safe validation
 * - Easy to add new entity types
 *
 * Created: 2025-01-28
 * Last Modified: 2026-01-05
 * Last Modified Summary: Support async transformData with supabase parameter for user preference access
 */

import { NextRequest } from 'next/server';
import { z, ZodObject, ZodSchema } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiUnauthorized,
  apiInternalError,
  apiForbidden,
  handleApiError,
  apiRateLimited,
} from '@/lib/api/standardResponse';
import { compose } from '@/lib/api/compose';
import { withZodBody } from '@/lib/api/withZod';
import { withRequestId } from '@/lib/api/withRequestId';
import { rateLimitWriteAsync, applyRateLimitHeaders, type RateLimitResult } from '@/lib/rate-limit';
import { logger } from '@/utils/logger';
import { type EntityType, getEntityMetadata } from '@/config/entity-registry';
import { DATABASE_TABLES } from '@/config/database-tables';
import { NextResponse } from 'next/server';
import {
  resolveCreationActor,
  ActorNotPermittedError,
} from '@/services/actors/resolveCreationActor';
import { resolveRequestAuth } from '@/lib/api/resolveRequestAuth';
import {
  lookupIdempotencyResult,
  storeIdempotencyResult,
  hashRequestBody,
  shouldCacheStatus,
} from '@/services/idempotency/idempotencyResults';

// Type for the awaited Supabase client
type SupabaseClient = Awaited<ReturnType<typeof createServerClient>>;

// ==================== TYPES ====================

interface EntityPostHandlerConfig {
  /** Entity type from registry */
  entityType: EntityType;
  /** Zod schema for validation */
  schema: ZodSchema;
  /** Override table name (uses registry tableName if not specified) */
  tableName?: string;
  /** Function to transform validated data before insertion */
  transformData?: (
    data: Record<string, unknown>,
    userId: string,
    supabase: SupabaseClient
  ) => Record<string, unknown> | Promise<Record<string, unknown>>;
  /** Custom creation function (if entity has special creation logic) */
  createEntity?: (
    userId: string,
    data: Record<string, unknown>,
    supabase: SupabaseClient
  ) => Promise<Record<string, unknown>>;
  /** Whether to use actor-based ownership (insert actor_id instead of user_id) */
  useActorOwnership?: boolean;
  /** Additional fields to set on insert (e.g., current_attendees: 0) */
  defaultFields?: Record<string, unknown>;
}

// ==================== HANDLER FACTORY ====================

/**
 * Creates a POST handler for entity creation endpoints
 *
 * @example
 * ```typescript
 * export const POST = createEntityPostHandler({
 *   entityType: 'event',
 *   schema: eventSchema,
 *   transformData: (data, userId) => ({
 *     ...data,
 *     user_id: userId,
 *     start_date: typeof data.start_date === 'string' ? data.start_date : data.start_date?.toISOString(),
 *   }),
 *   defaultFields: { current_attendees: 0 },
 * });
 * ```
 */
export function createEntityPostHandler(config: EntityPostHandlerConfig) {
  const {
    entityType,
    schema,
    tableName,
    transformData,
    createEntity,
    useActorOwnership = false,
    defaultFields = {},
  } = config;

  const meta = getEntityMetadata(entityType);
  const table = tableName ?? meta.tableName;

  // Allow callers to send `actor_id` to create on behalf of a group they
  // belong to (validated server-side). Object schemas are extended so Zod
  // doesn't strip the field during validation; non-object schemas pass
  // through untouched and silently ignore the field.
  const schemaWithActor: ZodSchema =
    schema instanceof ZodObject
      ? (schema as ZodObject<z.ZodRawShape>).extend({
          actor_id: z.string().uuid().optional(),
        })
      : schema;

  return compose(
    withRequestId(),
    withZodBody(schemaWithActor)
  )(async (request: NextRequest, ctx) => {
    try {
      const auth = await resolveRequestAuth(request);
      if (!auth) {
        return apiUnauthorized();
      }
      const userId = auth.userId;
      const supabase = await createServerClient();

      // Idempotency-Key dedup. Runs BEFORE rate limiting so a retry of a
      // successful request doesn't consume quota a second time.
      const idempotencyKey = request.headers.get('idempotency-key');
      const bodyHash = idempotencyKey ? hashRequestBody(ctx.body) : undefined;
      // URL parsing only when we'll actually use it — `request.url` may be
      // undefined in unit-test mocks of NextRequest.
      const requestPath = idempotencyKey && request.url ? new URL(request.url).pathname : '';

      if (idempotencyKey && bodyHash && requestPath) {
        const cached = await lookupIdempotencyResult({
          userId,
          key: idempotencyKey,
          path: requestPath,
          bodyHash,
        });
        if (cached.kind === 'hit') {
          logger.info(`${meta.name} idempotency hit`, {
            userId,
            path: requestPath,
            cachedStatus: cached.hit.responseStatus,
          });
          return NextResponse.json(cached.hit.responseBody, {
            status: cached.hit.responseStatus,
            headers: { 'Idempotency-Replay': 'true' },
          });
        }
        if (cached.kind === 'body_mismatch') {
          return apiForbidden(
            'Idempotency-Key was reused with a different request body. Generate a new key for each distinct request.'
          );
        }
      }

      /** Cache the response when an Idempotency-Key was supplied AND the
       * outcome is something we want to replay (2xx and 4xx; never 5xx). */
      const cacheResult = async (response: NextResponse): Promise<NextResponse> => {
        if (!idempotencyKey || !bodyHash) {
          return response;
        }
        if (!shouldCacheStatus(response.status)) {
          return response;
        }
        try {
          const body = await response.clone().json();
          await storeIdempotencyResult({
            userId,
            key: idempotencyKey,
            method: 'POST',
            path: requestPath,
            bodyHash,
            responseStatus: response.status,
            responseBody: body,
          });
        } catch (cacheErr) {
          logger.warn('idempotency cache write failed (non-fatal)', { cacheErr });
        }
        return response;
      };

      // Rate limiting
      const rateLimit = await rateLimitWriteAsync(userId);
      if (!rateLimit.success) {
        const retryAfter = Math.ceil((rateLimit.resetTime - Date.now()) / 1000);
        logger.warn(`${meta.name} creation rate limit exceeded`, { userId });
        return apiRateLimited(
          `Too many ${meta.name.toLowerCase()} creation requests. Please slow down.`,
          retryAfter
        );
      }

      // Strip body.actor_id so every downstream code path sees a body
      // without it. Integration-key auth has a fixed bound actor; session
      // auth uses the body field as the requested actor.
      const bodyForHandler = { ...(ctx.body as Record<string, unknown>) };
      const requestedActorId = bodyForHandler.actor_id as string | undefined;
      delete bodyForHandler.actor_id;

      let resolvedActor: { id: string };
      if (auth.boundActorId) {
        // Integration key — the key itself proves authority. Body
        // actor_id (if any) is ignored to avoid confusing the audit trail.
        resolvedActor = { id: auth.boundActorId };
      } else {
        try {
          resolvedActor = await resolveCreationActor(userId, requestedActorId);
        } catch (actorError) {
          if (actorError instanceof ActorNotPermittedError) {
            return apiForbidden(
              `You are not permitted to create a ${meta.name.toLowerCase()} as the requested actor.`
            );
          }
          throw actorError;
        }
      }

      // Use custom creation function if provided (for domain services).
      // Pass the resolved actor on the body's `_resolved_actor_id` side
      // channel — domain/base/entityService.ts unwraps it.
      if (createEntity) {
        const bodyForCreate = { ...bodyForHandler, _resolved_actor_id: resolvedActor.id };
        const entity = await createEntity(userId, bodyForCreate, supabase);
        logger.info(`${meta.name} created successfully`, { [`${entityType}Id`]: entity.id });
        return cacheResult(
          applyRateLimitHeaders(apiSuccess(entity, { status: 201 }), rateLimit as RateLimitResult)
        );
      }

      // Default creation: transform data and insert
      let transformedData;
      try {
        if (transformData) {
          transformedData = await Promise.resolve(transformData(bodyForHandler, userId, supabase));
          // Honour the resolved actor whether the transform set actor_id or not.
          if (useActorOwnership !== false) {
            (transformedData as Record<string, unknown>).actor_id = resolvedActor.id;
          }
        } else if (useActorOwnership !== false) {
          transformedData = { ...bodyForHandler, actor_id: resolvedActor.id };
        } else {
          transformedData = { ...bodyForHandler, user_id: userId };
        }
      } catch (transformError) {
        logger.error(`Error transforming data for ${entityType}`, {
          error: transformError,
          bodyKeys: Object.keys(ctx.body || {}),
          userId: userId,
        });
        const errorMessage =
          transformError instanceof Error ? transformError.message : String(transformError);
        return apiInternalError(`Failed to process ${meta.name.toLowerCase()}: ${errorMessage}`);
      }

      const entityData = { ...transformedData, ...defaultFields };

      // Extract _wallet_id before DB insert (not a real column)
      const walletIdForLink = entityData._wallet_id as string | undefined;
      delete entityData._wallet_id;

      // Log the data being inserted for debugging
      logger.info(`Inserting ${entityType}`, {
        table,
        userId: userId,
        dataKeys: Object.keys(entityData),
        entityDataSample: JSON.stringify(entityData, null, 2).substring(0, 500),
      });

      // `table` is a runtime string so the row type can't be inferred from
      // Supabase's generated unions; `entityData` is the validated payload.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: entity, error } = await (supabase.from(table) as any)
        .insert(entityData)
        .select()
        .single();

      if (error) {
        const errorDetails = {
          error,
          userId: userId,
          table,
          code: error?.code,
          message: error?.message,
          details: error?.details,
          hint: error?.hint,
          entityDataKeys: Object.keys(entityData),
          // Also log the raw error object
          rawError: JSON.stringify(error, Object.getOwnPropertyNames(error || {}), 2),
        };
        logger.error(`Error creating ${entityType}`, errorDetails);
        // Return generic error to client — details are already logged above
        return apiInternalError(`Failed to create ${meta.name.toLowerCase()}`);
      }

      const createdEntity = entity as { id: string } & Record<string, unknown>;
      logger.info(`${meta.name} created successfully`, { [`${entityType}Id`]: createdEntity.id });

      // Link wallet to entity if _wallet_id was provided (non-fatal)
      if (walletIdForLink && createdEntity.id) {
        try {
          // entity_wallets table may not be in generated Supabase types yet
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from(DATABASE_TABLES.ENTITY_WALLETS) as any).insert({
            wallet_id: walletIdForLink,
            entity_type: entityType,
            entity_id: createdEntity.id,
            is_primary: true,
            created_by: userId,
          });
          logger.info(`Wallet linked to ${entityType}`, {
            walletId: walletIdForLink,
            entityId: createdEntity.id,
          });
        } catch (linkError) {
          logger.warn(`Failed to link wallet to ${entityType} (non-fatal)`, {
            walletId: walletIdForLink,
            entityId: createdEntity.id,
            error: linkError,
          });
        }
      }

      return cacheResult(
        applyRateLimitHeaders(
          apiSuccess(createdEntity, { status: 201 }),
          rateLimit as RateLimitResult
        )
      );
    } catch (error) {
      return handleApiError(error);
    }
  });
}
