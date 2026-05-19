'use client';

import { EntityCreateEditPage } from '@/components/create/EntityCreateEditPage';
import { causeConfig } from '@/config/entity-configs';
import type { UserCauseFormData } from '@/lib/validation';

export default function CreateCausePage() {
  return <EntityCreateEditPage<UserCauseFormData> entityType="cause" config={causeConfig} />;
}
