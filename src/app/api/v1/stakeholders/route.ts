/**
 * GET/POST /api/v1/stakeholders — stakeholder graph for integration clients.
 *
 * FleetCrown reads typed project→stakeholder edges from OrangeCat. Authenticated
 * via the v1 auth path (OIDC bearer or `ock_` integration key) and gated to
 * `stakeholders.read` / `stakeholders.write`. Uses admin client + app-layer
 * authz (same non-session pattern as timeline publish).
 */
import { NextRequest } from 'next/server';
import { resolveRequestAuth, hasScope } from '@/lib/api/resolveRequestAuth';
import { apiCreated, apiSuccess, apiError } from '@/lib/api/standardResponse';
import { createStakeholderSchema } from '@/config/stakeholders';
import {
  listStakeholderRelationshipsForUser,
  createStakeholderRelationshipForUser,
} from '@/services/platform/stakeholderRelationships';
import { logger } from '@/utils/logger';

const READ_SCOPE = 'stakeholders.read';
const WRITE_SCOPE = 'stakeholders.write';

export async function GET(request: NextRequest) {
  const auth = await resolveRequestAuth(request);
  if (!auth) {
    return apiError('Authentication required', 'UNAUTHORIZED', 401);
  }
  if (!hasScope(auth.scopes, READ_SCOPE)) {
    return apiError(`Missing required scope: ${READ_SCOPE}`, 'FORBIDDEN', 403);
  }
  if (!auth.userId) {
    return apiError('Authenticated identity has no user id', 'UNAUTHORIZED', 401);
  }

  const url = new URL(request.url);
  const fromProjectId = url.searchParams.get('fromProjectId');
  const kindFilter = url.searchParams.get('kind') ?? undefined;

  if (!fromProjectId) {
    return apiError('fromProjectId query parameter is required', 'BAD_REQUEST', 400);
  }

  const result = await listStakeholderRelationshipsForUser(auth.userId, fromProjectId, kindFilter);
  if (!result.ok) {
    switch (result.reason) {
      case 'bad_kind':
        return apiError(result.message, 'VALIDATION_ERROR', 422);
      case 'project_not_found':
        return apiError(result.message, 'NOT_FOUND', 404);
      case 'forbidden':
        return apiError(result.message, 'FORBIDDEN', 403);
      default:
        return apiError(result.message, 'INTERNAL_ERROR', 500);
    }
  }

  return apiSuccess({ relationships: result.relationships });
}

export async function POST(request: NextRequest) {
  const auth = await resolveRequestAuth(request);
  if (!auth) {
    return apiError('Authentication required', 'UNAUTHORIZED', 401);
  }
  if (!hasScope(auth.scopes, WRITE_SCOPE)) {
    return apiError(`Missing required scope: ${WRITE_SCOPE}`, 'FORBIDDEN', 403);
  }
  if (!auth.userId) {
    return apiError('Authenticated identity has no user id', 'UNAUTHORIZED', 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON body', 'BAD_REQUEST', 400);
  }

  const parsed = createStakeholderSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('Validation failed', 'VALIDATION_ERROR', 422, parsed.error.flatten());
  }

  const result = await createStakeholderRelationshipForUser(auth.userId, parsed.data);
  if (!result.ok) {
    switch (result.reason) {
      case 'project_not_found':
        return apiError(result.message, 'NOT_FOUND', 404);
      case 'forbidden':
        return apiError(result.message, 'FORBIDDEN', 403);
      case 'no_actor':
        return apiError(result.message, 'UNAUTHORIZED', 401);
      default:
        logger.error(
          'Stakeholder create failed (v1)',
          { message: result.message },
          'StakeholdersV1'
        );
        return apiError(result.message, 'INTERNAL_ERROR', 500);
    }
  }

  return apiCreated({ relationship: result.relationship });
}
