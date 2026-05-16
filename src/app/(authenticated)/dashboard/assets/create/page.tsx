'use client';

import { useRouter } from 'next/navigation';
import { EntityCreationWizard } from '@/components/create';
import { EntityForm } from '@/components/create/EntityForm';
import { assetConfig } from '@/config/entity-configs';
import { useEntityCreateEdit } from '@/hooks/useEntityCreateEdit';
import { getEntityMetadata } from '@/config/entity-registry';
import Loading from '@/components/Loading';
import type { AssetFormData } from '@/lib/validation';

const meta = getEntityMetadata('asset');

export default function CreateAssetPage() {
  const router = useRouter();
  const { editId, entityData, loading, editError, initialData } =
    useEntityCreateEdit<AssetFormData>('asset');

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
        <p className="text-muted-foreground mb-4">
          Unable to load {meta.name.toLowerCase()} for editing.
        </p>
        <button
          onClick={() => router.push(meta.basePath)}
          className="text-sm font-medium text-muted-foreground hover:text-gray-900 dark:hover:text-foreground underline"
        >
          Back to {meta.namePlural.toLowerCase()}
        </button>
      </div>
    );
  }

  if (editId && entityData) {
    return (
      <EntityForm config={assetConfig} initialValues={entityData} mode="edit" entityId={editId} />
    );
  }

  return (
    <EntityCreationWizard<AssetFormData>
      config={assetConfig}
      initialData={initialData}
      onCancel={() => router.push(meta.basePath)}
    />
  );
}
