'use client';

import { EntityCreateEditPage } from '@/components/create/EntityCreateEditPage';
import { circleConfig } from '@/config/entity-configs';
import type { CircleFormData } from '@/lib/validation';

export default function CreateCirclePage() {
  return <EntityCreateEditPage<CircleFormData> entityType="circle" config={circleConfig} />;
}
