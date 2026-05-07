'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCreatePrefill } from '@/hooks/useCreatePrefill';
import { getEntityMetadata } from '@/config/entity-registry';
import { logger } from '@/utils/logger';
import type { EntityType } from '@/config/entity-registry';

interface UseEntityCreateEditReturn<T extends Record<string, unknown>> {
  editId: string | null;
  entityData: Partial<T> | null;
  loading: boolean;
  editError: string | null;
  initialData: Partial<T> | undefined;
}

/**
 * Shared hook for entity create/edit pages.
 * Handles edit mode data fetching and create mode URL/localStorage prefill.
 *
 * Edit mode:  ?edit=<id> → fetches entity from API
 * Create mode: populates initialData from URL params or localStorage
 */
export function useEntityCreateEdit<T extends Record<string, unknown>>(
  entityType: EntityType
): UseEntityCreateEditReturn<T> {
  const searchParams = useSearchParams();
  const editId = searchParams?.get('edit') ?? null;
  const { user, hydrated } = useAuth();
  const [entityData, setEntityData] = useState<Partial<T> | null>(null);
  const [loading, setLoading] = useState(!!editId);
  const [editError, setEditError] = useState<string | null>(null);

  const { initialData } = useCreatePrefill<T>({
    entityType,
    enabled: !editId,
  });

  useEffect(() => {
    if (!editId) {
      setLoading(false);
      return;
    }
    if (!user?.id || !hydrated) {
      return;
    }

    const meta = getEntityMetadata(entityType);

    const fetchEntity = async () => {
      try {
        const response = await fetch(`${meta.apiEndpoint}/${editId}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setEntityData(result.data as Partial<T>);
          } else {
            setEditError(`Failed to load ${meta.name.toLowerCase()} data`);
          }
        } else {
          setEditError(
            response.status === 404
              ? `${meta.name} not found`
              : `Failed to load ${meta.name.toLowerCase()} data`
          );
        }
      } catch (error) {
        logger.error(`Failed to fetch ${meta.name.toLowerCase()}:`, error);
        setEditError(`Failed to load ${meta.name.toLowerCase()} data`);
      } finally {
        setLoading(false);
      }
    };

    fetchEntity();
  }, [editId, user?.id, hydrated, entityType]);

  return { editId, entityData, loading, editError, initialData };
}
