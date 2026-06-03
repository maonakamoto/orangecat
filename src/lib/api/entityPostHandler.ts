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
import {
  resolveCreationActor,
  ActorNotPermittedError,
} from '@/services/actors/resolveCreationActor';

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
      const supabase = await createServerClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return apiUnauthorized();
      }

      // Rate limiting
      const rateLimit = await rateLimitWriteAsync(user.id);
      if (!rateLimit.success) {
        const retryAfter = Math.ceil((rateLimit.resetTime - Date.now()) / 1000);
        logger.warn(`${meta.name} creation rate limit exceeded`, { userId: user.id });
        return apiRateLimited(
          `Too many ${meta.name.toLowerCase()} creation requests. Please slow down.`,
          retryAfter
        );
      }

      // Extract the optional requested actor before further processing so
      // every code path below sees a body without `actor_id`. The resolver
      // either confirms the user has rights to act as that actor (group
      // founder/admin/moderator) or falls back to their personal actor.
      const bodyForHandler = { ...(ctx.body as Record<string, unknown>) };
      const requestedActorId = bodyForHandler.actor_id as string | undefined;
      delete bodyForHandler.actor_id;

      let resolvedActor: { id: string };
      try {
        resolvedActor = await resolveCreationActor(user.id, requestedActorId);
      } catch (actorError) {
        if (actorError instanceof ActorNotPermittedError) {
          return apiForbidden(
            `You are not permitted to create a ${meta.name.toLowerCase()} as the requested actor.`
          );
        }
        throw actorError;
      }

      // Use custom creation function if provided (for domain services).
      // Pass the resolved actor on the body's `_resolved_actor_id` side
      // channel — domain/base/entityService.ts unwraps it.
      if (createEntity) {
        const bodyForCreate = { ...bodyForHandler, _resolved_actor_id: resolvedActor.id };
        const entity = await createEntity(user.id, bodyForCreate, supabase);
        logger.info(`${meta.name} created successfully`, { [`${entityType}Id`]: entity.id });
        return applyRateLimitHeaders(
          apiSuccess(entity, { status: 201 }),
          rateLimit as RateLimitResult
        );
      }

      // Default creation: transform data and insert
      let transformedData;
      try {
        if (transformData) {
          transformedData = await Promise.resolve(transformData(bodyForHandler, user.id, supabase));
          // Honour the resolved actor whether the transform set actor_id or not.
          if (useActorOwnership !== false) {
            (transformedData as Record<string, unknown>).actor_id = resolvedActor.id;
          }
        } else if (useActorOwnership !== false) {
          transformedData = { ...bodyForHandler, actor_id: resolvedActor.id };
        } else {
          transformedData = { ...bodyForHandler, user_id: user.id };
        }
      } catch (transformError) {
        logger.error(`Error transforming data for ${entityType}`, {
          error: transformError,
          bodyKeys: Object.keys(ctx.body || {}),
          userId: user.id,
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
        userId: user.id,
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
          userId: user.id,
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
            created_by: user.id,
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

      return applyRateLimitHeaders(
        apiSuccess(createdEntity, { status: 201 }),
        rateLimit as RateLimitResult
      );
    } catch (error) {
      return handleApiError(error);
    }
  });
}
