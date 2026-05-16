'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/utils/logger';
import { API_ROUTES } from '@/config/api-routes';
import type { EntityConfig, FormState } from '../../types';
import { executeEntityFormSubmit } from './entityFormSubmitAction';

interface WizardMode {
  currentStep: number;
  totalSteps: number;
  visibleFields: string[];
  onNext?: () => void;
  onPrevious?: () => void;
  onSkip?: () => void;
  isLastStep?: boolean;
}

interface UseEntityFormSubmitParams<T extends Record<string, unknown>> {
  config: EntityConfig<T>;
  formState: FormState<T>;
  mode: 'create' | 'edit';
  entityId?: string;
  user: { id: string } | null;
  onSuccess?: (data: T & { id: string }) => void;
  onError?: (error: string) => void;
  clearDraft: () => void;
  setSubmitting: (v: boolean) => void;
  setErrors: (errors: Record<string, string>) => void;
  onEntityCreated: (entity: { id: string; title: string }) => void;
  handleFieldChange: (name: keyof T, value: unknown) => void;
  wizardMode?: WizardMode;
}

export function useEntityFormSubmit<T extends Record<string, unknown>>({
  config,
  formState,
  mode,
  entityId,
  user,
  onSuccess,
  onError,
  clearDraft,
  setSubmitting,
  setErrors,
  onEntityCreated,
  handleFieldChange,
  wizardMode,
}: UseEntityFormSubmitParams<T>) {
  const router = useRouter();
  const existingWalletLinkIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const hasWalletGroup = config.fieldGroups.some(g => g.customComponent);
    if (mode !== 'edit' || !entityId || !hasWalletGroup) {
      return;
    }

    fetch(`${API_ROUTES.ENTITY_WALLETS}?entity_type=${config.type}&entity_id=${entityId}`, {
      credentials: 'include',
    })
      .then(r => r.json())
      .then(data => {
        const link = data.data?.[0];
        if (link?.wallet_id) {
          handleFieldChange('_wallet_id' as keyof T, link.wallet_id);
          existingWalletLinkIdRef.current = link.id;
        }
      })
      .catch((err: unknown) => {
        logger.warn('Wallet link failed (non-blocking)', { err }, 'EntityForm');
      });
  }, [mode, entityId, config.type, config.fieldGroups, handleFieldChange]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      await executeEntityFormSubmit({
        config,
        formStateData: formState.data,
        mode,
        entityId,
        user,
        onSuccess,
        onError,
        clearDraft,
        setSubmitting,
        setErrors,
        onEntityCreated,
        router,
        existingWalletLinkIdRef,
        wizardMode,
      });
    },
    [
      config,
      formState.data,
      mode,
      entityId,
      onSuccess,
      onError,
      router,
      clearDraft,
      setSubmitting,
      setErrors,
      user,
      onEntityCreated,
      wizardMode,
    ]
  );

  return { handleSubmit };
}
