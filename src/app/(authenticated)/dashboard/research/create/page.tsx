'use client';

import { EntityCreateEditPage } from '@/components/create/EntityCreateEditPage';
import { researchWizardConfig } from '@/config/entity-configs';
import type { ResearchWizardFormData } from '@/config/entity-configs';

export default function CreateResearchPage() {
  return (
    <EntityCreateEditPage<ResearchWizardFormData>
      entityType="research"
      config={researchWizardConfig}
    />
  );
}
