'use client';

import { EntityCreateEditPage } from '@/components/create/EntityCreateEditPage';
import { wishlistConfig } from '@/config/entity-configs';
import type { WishlistFormData } from '@/lib/validation';

export default function CreateWishlistPage() {
  return <EntityCreateEditPage<WishlistFormData> entityType="wishlist" config={wishlistConfig} />;
}
