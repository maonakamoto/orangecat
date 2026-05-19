'use client';

import { EntityCreateEditPage } from '@/components/create/EntityCreateEditPage';
import { eventConfig } from '@/config/entity-configs';
import type { EventFormData } from '@/lib/validation';

export default function CreateEventPage() {
  return <EntityCreateEditPage<EventFormData> entityType="event" config={eventConfig} />;
}
