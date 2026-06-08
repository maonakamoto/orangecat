/**
 * Generic Entity Status API
 *
 * PATCH /api/entities/[entityType]/[id]/status - Update entity status
 *
 * Supports all entity types via entity-registry. Validates ownership
 * and status transitions.
 *
 * Created: 2026-03-28
 */

import {
  apiSuccess,
  apiNotFound,
  apiValidationError,
  apiRateLimited,
  apiBadRequest,
  handleApiError,
  handleSupabaseError,
} from '@/lib/api/standardResponse';
import { withAuth, type AuthenticatedRequest } from '@/lib/api/withAuth';
import { rateLimit, applyRateLimitHeaders, retryAfterSeconds } from '@/lib/rate-limit';
import { logger } from '@/utils/logger';
import {
  isValidEntityType,
  getTableName,
  getUserIdField,
  type EntityType,
} from '@/config/entity-registry';
import { validateUUID, getValidationError } from '@/lib/api/validation';
import { ENTITY_STATUS } from '@/config/database-constants';
import { DATABASE_TABLES } from '@/config/database-tables';
import { z } from 'zod';
import {
  CLIENT_STATUS_INTENTS,
  getAllowedStatusTransitions,
  resolvePublishStatus,
} from '@/config/entity-status';

const statusUpdateSchema = z.object({
  // Client always sends a generic intent; entity-specific resolution happens in the handler.
  status: z.enum(CLIENT_STATUS_INTENTS),
});

interface RouteContext {
  params: Promise<{ entityType: string; id: string }>;
}

export const PATCH = withAuth(async (request: AuthenticatedRequest, context: RouteContext) => {
  try {
    const { entityType, id } = await context.params;
    if (!isValidEntityType(entityType)) {
      return apiBadRequest(`Invalid entity type: ${entityType}`);
    }
    const idValidation = getValidationError(validateUUID(id, 'entity ID'));
    if (idValidation) {
      return idValidation;
    }

    const rateLimitResult = await rateLimit(request);
    if (!rateLimitResult.success) {
      return apiRateLimited(
        'Too many requests',
        rateLimitResult.resetTime ? retryAfterSeconds(rateLimitResult) : undefined
      );
    }

    const { user, supabase } = request;
    const body = await request.json();
    const parseResult = statusUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      return apiValidationError(
        `Invalid status. Must be one of: ${CLIENT_STATUS_INTENTS.join(', ')}`
      );
    }

    const { status: clientStatus } = parseResult.data;
    const newStatus = resolvePublishStatus(entityType as EntityType, clientStatus);
    const tableName = getTableName(entityType as EntityType);
    const userIdField = getUserIdField(entityType as EntityType);

    // Some entities (wishlists today; circles likely too) store their
    // publish state as `is_active: boolean` instead of `status: text`.
    // Without this branch the generic select+update below 500s on those
    // tables ("column status does not exist"), which is exactly why the
    // wishlist Publish Now button was silently broken.
    // TODO: lift this into ENTITY_REGISTRY (`statusColumn: 'status' | 'is_active'`)
    // when a third entity needs it — two cases is still under the rule of three.
    const usesIsActive = entityType === 'wishlist';
    const statusSelectColumn = usesIsActive ? 'is_active' : 'status';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing, error: fetchError } = await (supabase.from(tableName) as any)
      .select(`id, ${statusSelectColumn}, ${userIdField}`)
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      // PostgREST + supabase-js collapses RLS-blocked-read into a generic
      // 404-shaped error if we use `.single()`, hiding the actual failure
      // mode. Surface the error code/details so this stops being invisible.
      logger.error('Entity status: fetch failed', {
        entityType,
        id,
        userId: user.id,
        errorCode: fetchError.code,
        errorMessage: fetchError.message,
        errorDetails: fetchError.details,
      });
      return apiNotFound(`${entityType} not found`);
    }
    if (!existing) {
      // .maybeSingle returns null both for "row doesn't exist" AND "RLS
      // blocked the read." Log so we can tell them apart when a user reports
      // a Publish Now toast — historically these silently degraded to 404.
      logger.warn('Entity status: row not visible to user', {
        entityType,
        id,
        userId: user.id,
        likelyCause: 'RLS-blocked or row missing',
      });
      return apiNotFound(`${entityType} not found`);
    }

    // Ownership check. Previously delegated to `checkOwnership` from
    // @/services/actors, which imports the BROWSER supabase client (no
    // cookies, no auth) — when called from a server route, its actor
    // fetch silently returns null in serverless context, hasAccess is
    // false, and every Publish Now click 404s. That has been the bug
    // since the endpoint shipped. Inline the check here using the
    // already-authed server supabase client so the same code path that
    // works for the fetch above works for ownership too.
    let hasAccess = false;
    if (userIdField === 'actor_id') {
      const actorId = (existing as { actor_id?: string }).actor_id;
      if (actorId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: actor } = await (supabase.from(DATABASE_TABLES.ACTORS) as any)
          .select('user_id, actor_type, group_id')
          .eq('id', actorId)
          .maybeSingle();
        if (actor) {
          if (actor.actor_type === 'user') {
            hasAccess = actor.user_id === user.id;
          } else if (actor.actor_type === 'group' && actor.group_id) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: membership } = await (supabase.from(DATABASE_TABLES.GROUP_MEMBERS) as any)
              .select('role')
              .eq('group_id', actor.group_id)
              .eq('user_id', user.id)
              .maybeSingle();
            hasAccess = !!membership;
          }
        }
      }
    } else {
      hasAccess = existing[userIdField] === user.id;
    }
    if (!hasAccess) {
      logger.warn('Entity status: ownership denied', {
        entityType,
        id,
        userId: user.id,
        actorId: (existing as { actor_id?: string }).actor_id,
      });
      return apiNotFound(`${entityType} not found`);
    }

    const currentStatus = usesIsActive
      ? existing.is_active
        ? ENTITY_STATUS.ACTIVE
        : ENTITY_STATUS.DRAFT
      : (existing.status || ENTITY_STATUS.DRAFT).toLowerCase();
    const allowedTransitions = getAllowedStatusTransitions(currentStatus);
    if (!allowedTransitions.includes(newStatus)) {
      return apiValidationError(
        `Cannot change status from '${currentStatus}' to '${newStatus}'. Allowed: ${allowedTransitions.join(', ') || 'none'}`
      );
    }

    const updatePayload = usesIsActive
      ? { is_active: newStatus === ENTITY_STATUS.ACTIVE, updated_at: new Date().toISOString() }
      : { status: newStatus, updated_at: new Date().toISOString() };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updated, error: updateError } = await (supabase.from(tableName) as any)
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return handleSupabaseError(updateError);
    }

    logger.info(`Entity status changed: ${entityType} ${id}`, {
      userId: user.id,
      oldStatus: currentStatus,
      newStatus,
    });
    return applyRateLimitHeaders(apiSuccess(updated), rateLimitResult);
  } catch (error) {
    return handleApiError(error);
  }
});
