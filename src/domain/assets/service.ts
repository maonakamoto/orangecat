import { createEntity } from '@/domain/base/entityService';
import type { AssetFormData } from './schema';
import { PLATFORM_DEFAULT_CURRENCY } from '@/config/currencies';
import { STATUS } from '@/config/database-constants';

const ASSET_SELECT =
  'id, title, type, status, estimated_value, currency, created_at, verification_status';

export async function createAsset(userId: string, input: AssetFormData) {
  return createEntity(
    'asset',
    userId,
    {
      type: input.type,
      title: input.title,
      description: input.description || null,
      location: input.location || null,
      estimated_value: input.estimated_value ?? null,
      currency: input.currency ?? PLATFORM_DEFAULT_CURRENCY,
      documents: input.documents ?? null,
      verification_status: 'unverified' as const,
      status: STATUS.ASSETS.DRAFT,
      public_visibility: false,
    },
    {
      select: ASSET_SELECT,
    }
  );
}
