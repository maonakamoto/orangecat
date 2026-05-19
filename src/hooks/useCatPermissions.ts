'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { API_ROUTES } from '@/config/api-routes';

interface CategorySummary {
  category: string;
  name: string;
  description: string;
  enabled: boolean;
  actionCount: number;
  enabledActionCount: number;
}

export interface PermissionData {
  summary: {
    categories: CategorySummary[];
    totalActions: number;
    enabledActions: number;
    highRiskEnabled: boolean;
  };
}

interface UseCatPermissionsReturn {
  permissions: PermissionData | null;
  isLoading: boolean;
  isSaving: string | null;
  toggleCategory: (categoryId: string, enabled: boolean) => Promise<void>;
}

export function useCatPermissions(): UseCatPermissionsReturn {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<PermissionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);

  const fetchPermissions = useCallback(async () => {
    try {
      const res = await fetch(API_ROUTES.CAT.PERMISSIONS);
      if (!res.ok) {
        return;
      }
      const data = await res.json();
      if (data.success) {
        setPermissions(data.data);
      }
    } catch {
      // permissions unavailable
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchPermissions();
    }
  }, [user, fetchPermissions]);

  const toggleCategory = useCallback(
    async (categoryId: string, enabled: boolean) => {
      setIsSaving(categoryId);
      try {
        const res = await fetch(API_ROUTES.CAT.PERMISSIONS, {
          method: enabled ? 'POST' : 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            actionId: '*',
            category: categoryId,
            requiresConfirmation: true,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error ?? `Request failed (${res.status})`);
        }
        if (data.success) {
          await fetchPermissions();
        }
      } catch {
        // ignore toggle errors
      } finally {
        setIsSaving(null);
      }
    },
    [fetchPermissions]
  );

  return { permissions, isLoading, isSaving, toggleCategory };
}
