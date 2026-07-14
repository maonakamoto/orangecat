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

import { fromTable } from '@/lib/supabase/untyped';
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
import { checkOwnership } from '@/services/actors';
import { ENTITY_STATUS } from '@/config/database-constants';
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

    // Some entities store publish state as a boolean column instead of
    // `status: text` — wishlist → is_active, group → is_public. Without this
    // branch the generic select+update on `status` 400s ("column status does
    // not exist"), which silently broke the Publish Now button for those
    // (wishlist historically, and groups). Lift into ENTITY_REGISTRY
    // (`statusColumn`) if a fourth entity needs it.
    const BOOLEAN_PUBLISH_COLUMN: Record<string, string> = {
      wishlist: 'is_active',
      group: 'is_public',
    };
    const boolStatusColumn = BOOLEAN_PUBLISH_COLUMN[entityType as string] ?? null;
    const usesIsActive = boolStatusColumn !== null;
    const statusSelectColumn = boolStatusColumn ?? 'status';

    const { data: existing, error: fetchError } = await fromTable(supabase, tableName)
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

    // Ownership check. checkOwnership now accepts the server supabase
    // client (fixed at source in 6f55f05b), so the inline workaround
    // from 136f65ac is no longer needed — pass `supabase` and the helper
    // does the right thing for both individual + group-owned entities.
    const hasAccess =
      userIdField === 'actor_id'
        ? await checkOwnership(
            existing as { actor_id: string | null },
            user.id,
            supabase as unknown as Parameters<typeof checkOwnership>[2]
          )
        : existing[userIdField] === user.id;
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
      ? existing[boolStatusColumn as string]
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
      ? {
          [boolStatusColumn as string]: newStatus === ENTITY_STATUS.ACTIVE,
          updated_at: new Date().toISOString(),
        }
      : { status: newStatus, updated_at: new Date().toISOString() };

    const { data: updated, error: updateError } = await fromTable(supabase, tableName)
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
