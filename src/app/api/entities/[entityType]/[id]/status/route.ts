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
import { STATUS } from '@/config/database-constants';
import { validateUUID, getValidationError } from '@/lib/api/validation';
import { checkOwnership } from '@/services/actors';
import { z } from 'zod';

// Some entity types use a non-generic status for "published/live".
// Client always sends 'active' as the publish intent; we resolve to the real DB value.
const ENTITY_PUBLISH_STATUS: Partial<Record<string, string>> = {
  event: STATUS.EVENTS.PUBLISHED, // events CHECK: draft|published|open|full|ongoing|completed|cancelled
  investment: STATUS.INVESTMENTS.OPEN, // investments go draft→open (accepting) before active (funded/running)
};

// Valid transitions for each status value. Covers generic entity statuses and
// entity-specific statuses (event, investment) so the API handles all flows.
const VALID_TRANSITIONS: Record<string, string[]> = {
  // Generic
  draft: ['active', 'published', 'open'], // 'active' may resolve to 'published'/'open' below
  active: ['paused', 'draft', 'archived'],
  paused: ['active', 'draft'],
  completed: ['draft'],
  cancelled: ['draft'],
  archived: ['draft'],
  // Event-specific live states
  published: ['open', 'paused', 'cancelled', 'draft'],
  open: ['full', 'ongoing', 'paused', 'cancelled', 'draft'],
  full: ['open', 'ongoing', 'cancelled'],
  ongoing: ['completed', 'cancelled'],
  // Investment-specific live states
  funded: ['active', 'closed', 'cancelled'],
  closed: ['draft'],
};

const statusUpdateSchema = z.object({
  // Client always sends a generic intent; entity-specific resolution happens in the handler.
  status: z.enum(['draft', 'active', 'paused', 'completed', 'cancelled', 'archived']),
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
        `Invalid status. Must be one of: ${Object.keys(VALID_TRANSITIONS).join(', ')}`
      );
    }

    const { status: clientStatus } = parseResult.data;
    // Resolve entity-specific publish status: events → 'published', investments → 'open', others → as-is
    const newStatus =
      clientStatus === 'active' && ENTITY_PUBLISH_STATUS[entityType]
        ? ENTITY_PUBLISH_STATUS[entityType]!
        : clientStatus;
    const tableName = getTableName(entityType as EntityType);
    const userIdField = getUserIdField(entityType as EntityType);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing, error: fetchError } = await (supabase.from(tableName) as any)
      .select('id, status, ' + userIdField)
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

    const currentStatus = (existing.status || 'draft').toLowerCase();
    const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowedTransitions.includes(newStatus)) {
      return apiValidationError(
        `Cannot change status from '${currentStatus}' to '${newStatus}'. Allowed: ${allowedTransitions.join(', ') || 'none'}`
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updated, error: updateError } = await (supabase.from(tableName) as any)
      .update({ status: newStatus, updated_at: new Date().toISOString() })
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
