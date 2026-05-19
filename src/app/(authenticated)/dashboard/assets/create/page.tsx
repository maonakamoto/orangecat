'use client';

import { EntityCreateEditPage } from '@/components/create/EntityCreateEditPage';
import { assetConfig } from '@/config/entity-configs';
import type { AssetFormData } from '@/lib/validation';

export default function CreateAssetPage() {
  return <EntityCreateEditPage<AssetFormData> entityType="asset" config={assetConfig} />;
}
