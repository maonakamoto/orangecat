'use client';

import { EntityCreateEditPage } from '@/components/create/EntityCreateEditPage';
import { serviceConfig } from '@/config/entity-configs';
import type { UserServiceFormData } from '@/lib/validation';

export default function CreateServicePage() {
  return <EntityCreateEditPage<UserServiceFormData> entityType="service" config={serviceConfig} />;
}
