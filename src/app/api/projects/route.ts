import { NextRequest } from 'next/server';
import { compose } from '@/lib/api/compose';
import { withRateLimit } from '@/lib/api/withRateLimit';
import { withRequestId } from '@/lib/api/withRequestId';
import { projectSchema, type ProjectData } from '@/lib/validation';
import { handleApiError, apiSuccess } from '@/lib/api/standardResponse';
import { getPagination } from '@/lib/api/query';
import { listProjectsPage, createProject } from '@/domain/projects/service';
import { calculatePage, getCacheControl } from '@/lib/api/helpers';
import { createEntityPostHandler } from '@/lib/api/entityPostHandler';
import { getAuthenticatedUserId, shouldIncludeDrafts } from '@/lib/api/authHelpers';

// GET /api/projects - Get all projects
//
// Security: when `?user_id=X` is passed, only return drafts if the
// authenticated user IS X. Without this guard, anonymous callers can
// enumerate any user's drafts by passing their UUID. The actor lookup
// downstream resolves the UUID to actor_id, which then becomes a public
// data window for that owner.
export const GET = compose(
  withRequestId(),
  withRateLimit('read')
)(async (request: NextRequest) => {
  try {
    const { limit, offset } = getPagination(request.url, { defaultLimit: 20, maxLimit: 100 });
    const url = new URL(request.url);
    const requestedUserId = url.searchParams.get('user_id');
    const authenticatedUserId = await getAuthenticatedUserId();
    const includeOwnDrafts = await shouldIncludeDrafts(requestedUserId, authenticatedUserId);
    const { items, total } = await listProjectsPage(
      limit,
      offset,
      requestedUserId || undefined,
      includeOwnDrafts
    );
    return apiSuccess(items, {
      page: calculatePage(offset, limit),
      limit,
      total,
      headers: { 'Cache-Control': getCacheControl(false) },
    });
  } catch (error) {
    return handleApiError(error);
  }
});

// POST /api/projects - Create new project
export const POST = createEntityPostHandler({
  entityType: 'project',
  schema: projectSchema,
  useActorOwnership: true,
  createEntity: async (userId, data, _supabase) => {
    return await createProject(userId, data as unknown as ProjectData);
  },
});
