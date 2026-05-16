'use client';

import { useRouter } from 'next/navigation';
import { EntityCreationWizard } from '@/components/create';
import { EntityForm } from '@/components/create/EntityForm';
import { researchWizardConfig } from '@/config/entity-configs';
import { useEntityCreateEdit } from '@/hooks/useEntityCreateEdit';
import { getEntityMetadata } from '@/config/entity-registry';
import Loading from '@/components/Loading';
import type { ResearchWizardFormData } from '@/config/entity-configs';

const meta = getEntityMetadata('research');

export default function CreateResearchPage() {
  const router = useRouter();
  const { editId, entityData, loading, editError, initialData } =
    useEntityCreateEdit<ResearchWizardFormData>('research');

  if (loading) {
    return (
      <Loading
        fullScreen
        message={editId ? `Loading ${meta.name.toLowerCase()}...` : 'Loading...'}
      />
    );
  }

  if (editId && editError) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <h3 className="text-lg font-semibold mb-2">{editError}</h3>
        <p className="text-gray-500 dark:text-muted-foreground mb-4">
          Unable to load {meta.name.toLowerCase()} for editing.
        </p>
        <button
          onClick={() => router.push(meta.basePath)}
          className="text-sm font-medium text-gray-600 dark:text-muted-foreground hover:text-gray-900 dark:hover:text-foreground underline"
        >
          Back to {meta.namePlural.toLowerCase()}
        </button>
      </div>
    );
  }

  if (editId && entityData) {
    return (
      <EntityForm
        config={researchWizardConfig}
        initialValues={entityData}
        mode="edit"
        entityId={editId}
      />
    );
  }

  return (
    <EntityCreationWizard<ResearchWizardFormData>
      config={researchWizardConfig}
      initialData={initialData}
      onCancel={() => router.push(meta.basePath)}
    />
  );
}
