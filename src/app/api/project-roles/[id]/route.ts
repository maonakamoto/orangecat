/**
 * PATCH /api/project-roles/[id]  { status: 'open' | 'filled' | 'closed' }
 * Update a role's status (project owner only).
 */
import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/standardResponse';
import { getAuthenticatedUserId } from '@/lib/api/authHelpers';
import { isRoleStatus } from '@/config/project-roles';
import {
  updateRoleStatus,
  RoleForbiddenError,
  RoleValidationError,
} from '@/services/collaboration/projectRoles';
import { logger } from '@/utils/logger';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return apiError('Unauthorized', 'UNAUTHORIZED', 401);
  }
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    if (!isRoleStatus(body.status)) {
      return apiError('Invalid status', 'VALIDATION', 400);
    }
    const role = await updateRoleStatus(id, body.status, userId);
    return apiSuccess({ role });
  } catch (error) {
    if (error instanceof RoleForbiddenError) {
      return apiError(error.message, 'FORBIDDEN', 403);
    }
    if (error instanceof RoleValidationError) {
      return apiError(error.message, 'NOT_FOUND', 404);
    }
    logger.error('Failed to update project role', error, 'ProjectRoles');
    return apiError('Failed to update role', 'ROLE_UPDATE_FAILED', 500);
  }
}
