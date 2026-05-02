'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ZodError } from 'zod';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { API_ROUTES } from '@/config/api-routes';
import { entityEvents } from '@/lib/analytics';
import type { EntityConfig, FormState } from '../../types';

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
}: UseEntityFormSubmitParams<T>) {
  const router = useRouter();
  const existingWalletLinkIdRef = useRef<string | undefined>(undefined);

  // Pre-populate wallet selector when editing an entity that already has a wallet linked
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

      try {
        setSubmitting(true);

        const dataToValidate = { ...config.defaultValues, ...formState.data };
        const validatedData = config.validationSchema.parse(dataToValidate);

        const url =
          mode === 'edit' && entityId ? `${config.apiEndpoint}/${entityId}` : config.apiEndpoint;

        const response = await fetch(url, {
          method: mode === 'edit' ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(validatedData),
        });

        if (!response.ok) {
          let errorMessage = `Failed to ${mode} ${config.name.toLowerCase()}`;
          try {
            const errorData = await response.clone().json();
            logger.error('EntityForm: API error response', { errorData }, 'EntityForm');
            errorMessage =
              errorData.error?.message || errorData.message || errorData.error || errorMessage;
          } catch {
            try {
              const text = await response.clone().text();
              logger.error('EntityForm: API error (non-JSON)', { text }, 'EntityForm');
              errorMessage = text || errorMessage;
            } catch (textError) {
              logger.error(
                'EntityForm: Could not read error response',
                { textError },
                'EntityForm'
              );
            }
          }
          throw new Error(errorMessage);
        }

        const result = await response.json();

        if (mode === 'create') {
          clearDraft();
          if (result.data?.id) {
            entityEvents.created(config.type, result.data.id, user?.id);
          }
        }

        // Link wallet to entity (non-blocking fire-and-forget)
        const walletId = (formState.data as Record<string, unknown>)._wallet_id as
          | string
          | undefined;
        if (walletId && result.data?.id) {
          (async () => {
            try {
              if (mode === 'edit' && existingWalletLinkIdRef.current) {
                await fetch(`${API_ROUTES.ENTITY_WALLETS}/${existingWalletLinkIdRef.current}`, {
                  method: 'DELETE',
                  credentials: 'include',
                });
              }
              await fetch(API_ROUTES.ENTITY_WALLETS, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                  entity_type: config.type,
                  entity_id: result.data.id,
                  wallet_id: walletId,
                }),
              });
            } catch (err) {
              logger.warn('Failed to link wallet to entity', { err }, 'EntityForm');
            }
          })();
        }

        const showSuccessToast = () =>
          toast.success(
            `${config.name} ${mode === 'create' ? 'created' : 'updated'} successfully!`,
            {
              description:
                mode === 'create'
                  ? `Your ${config.name.toLowerCase()} "${result.data?.title || result.data?.name || ''}" has been created.`
                  : 'Your changes have been saved.',
              duration: 4000,
            }
          );

        if (onSuccess) {
          showSuccessToast();
          onSuccess(result.data);
        } else if (mode === 'create' && result.data?.id) {
          onEntityCreated({
            id: result.data.id,
            title: result.data.title || result.data.name || config.name,
          });
        } else {
          showSuccessToast();
          let redirectUrl = config.successUrl;
          if (result.data) {
            redirectUrl = redirectUrl.replace(/:(\w+)/g, (_, field) => result.data[field] || '');
            redirectUrl = redirectUrl.replace(/\[(\w+)\]/g, (_, field) => result.data[field] || '');
          }
          router.push(redirectUrl);
        }
      } catch (error) {
        if (error instanceof ZodError) {
          const fieldErrors: Record<string, string> = {};
          error.errors.forEach(err => {
            const path = err.path[0] as string;
            fieldErrors[path] = err.message;
          });
          setErrors(fieldErrors);
        } else {
          const errorMsg =
            error instanceof Error
              ? error.message
              : `Failed to ${mode} ${config.name.toLowerCase()}`;
          setErrors({ general: errorMsg });
          toast.error(`Failed to ${mode} ${config.name.toLowerCase()}`, {
            description: errorMsg,
            duration: 5000,
          });
          if (onError) {
            onError(errorMsg);
          }
        }
      } finally {
        setSubmitting(false);
      }
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
    ]
  );

  return { handleSubmit };
}
