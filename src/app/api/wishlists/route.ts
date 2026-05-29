/**
 * WISHLIST API ROUTE
 *
 * Handles listing and creating wishlists.
 *
 * Created: 2026-01-07
 * Last Modified: 2026-01-07
 * Last Modified Summary: Created base wishlist API route
 */

import { NextRequest } from 'next/server';
import { compose } from '@/lib/api/compose';
import { withRateLimit } from '@/lib/api/withRateLimit';
import { withRequestId } from '@/lib/api/withRequestId';
import { wishlistSchema, type WishlistFormData } from '@/lib/validation';
import { handleApiError, apiSuccess } from '@/lib/api/standardResponse';
import { getPagination } from '@/lib/api/query';
import { listWishlistsPage, createWishlist } from '@/domain/wishlists/service';
import { calculatePage, getCacheControl } from '@/lib/api/helpers';
import { createEntityPostHandler } from '@/lib/api/entityPostHandler';
import { getAuthenticatedUserId, shouldIncludeDrafts } from '@/lib/api/authHelpers';

// GET /api/wishlists - Get all wishlists
//
// Security: when `?user_id=X` is passed, private/inactive wishlists are
// only returned if the authenticated user IS X. Without this guard,
// anonymous callers could enumerate any user's private gift wishlists.
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
    const { items, total } = await listWishlistsPage(
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

// POST /api/wishlists - Create new wishlist
export const POST = createEntityPostHandler({
  entityType: 'wishlist',
  schema: wishlistSchema,
  createEntity: async (userId, data, _supabase) => {
    return await createWishlist(userId, data as unknown as WishlistFormData);
  },
});
