'use client';

import { EntityCreateEditPage } from '@/components/create/EntityCreateEditPage';
import { productConfig } from '@/config/entity-configs';
import type { UserProductFormData } from '@/lib/validation';

export default function CreateProductPage() {
  return <EntityCreateEditPage<UserProductFormData> entityType="product" config={productConfig} />;
}
