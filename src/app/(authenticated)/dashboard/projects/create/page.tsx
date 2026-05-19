'use client';

import { EntityCreateEditPage } from '@/components/create/EntityCreateEditPage';
import { projectConfig } from '@/config/entity-configs/project-config';
import type { ProjectData } from '@/lib/validation';

export default function CreateProjectPage() {
  return <EntityCreateEditPage<ProjectData> entityType="project" config={projectConfig} />;
}
