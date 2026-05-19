'use client';

import { EntityCreateEditPage } from '@/components/create/EntityCreateEditPage';
import { groupConfig } from '@/config/entity-configs';
import type { CreateGroupSchemaType } from '@/services/groups/validation';

export default function CreateGroupPage() {
  return <EntityCreateEditPage<CreateGroupSchemaType> entityType="group" config={groupConfig} />;
}
