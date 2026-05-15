/**
 * WISHLIST ENTITY CONFIGURATION
 *
 * Configuration for displaying wishlists in list views and dashboard.
 *
 * Created: 2026-01-07
 * Last Modified: 2026-02-24
 * Last Modified Summary: Fix meta→metadata bug, add EntityConfig compliance for EntityDashboardPage
 */

import { EntityConfig } from '@/types/entity';
import { ENTITY_REGISTRY } from '@/config/entity-registry';
import { WISHLIST_TYPE_LABELS } from '@/config/wishlists';

export interface WishlistListItem {
  id: string;
  title: string;
  description: string;
  type: string;
  visibility: string;
  is_active: boolean;
  cover_image_url?: string;
  items_count?: number;
  created_at: string;
  [key: string]: unknown;
}

export const wishlistEntityConfig: EntityConfig<WishlistListItem> = {
  name: ENTITY_REGISTRY['wishlist'].name,
  namePlural: ENTITY_REGISTRY['wishlist'].namePlural,
  colorTheme: ENTITY_REGISTRY['wishlist'].colorTheme,

  listPath: ENTITY_REGISTRY['wishlist'].basePath,
  detailPath: id => `${ENTITY_REGISTRY['wishlist'].basePath}/${id}`,
  createPath: ENTITY_REGISTRY['wishlist'].createPath,
  editPath: id => `${ENTITY_REGISTRY['wishlist'].createPath}?edit=${id}`,

  entityType: ENTITY_REGISTRY['wishlist'].type,
  apiEndpoint: ENTITY_REGISTRY['wishlist'].apiEndpoint,

  makeHref: item => `${ENTITY_REGISTRY['wishlist'].basePath}/${item.id}`,

  makeCardProps: item => ({
    imageUrl: item.cover_image_url,
    badge: WISHLIST_TYPE_LABELS[item.type] || item.type,
    status: item.is_active ? 'active' : 'inactive',
    showEditButton: true,
    editHref: `${ENTITY_REGISTRY['wishlist'].createPath}?edit=${item.id}`,
    metadata: (
      <div className="flex flex-wrap gap-2 text-xs text-gray-500">
        <span>{item.visibility}</span>
        <span>{item.items_count || 0} items</span>
      </div>
    ),
  }),

  emptyState: {
    title: 'No wishlists yet',
    description: 'Create your first wishlist for a birthday, wedding, or personal goal.',
  },

  gridCols: {
    mobile: 1,
    tablet: 2,
    desktop: 3,
  },
};
