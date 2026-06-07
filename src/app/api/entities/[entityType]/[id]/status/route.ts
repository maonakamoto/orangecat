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
      .single();

    if (fetchError || !existing) {
      return apiNotFound(`${entityType} not found`);
    }

    const hasAccess =
      userIdField === 'actor_id'
        ? await checkOwnership(existing as { actor_id: string }, user.id)
        : existing[userIdField] === user.id;
    if (!hasAccess) {
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
