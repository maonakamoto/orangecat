import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import type { FormState, EntityConfig } from '../../types';

export function formatRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) {
    return 'just now';
  }
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)} minute${Math.floor(seconds / 60) > 1 ? 's' : ''} ago`;
  }
  if (seconds < 86400) {
    return `${Math.floor(seconds / 3600)} hour${Math.floor(seconds / 3600) > 1 ? 's' : ''} ago`;
  }
  return `${Math.floor(seconds / 86400)} day${Math.floor(seconds / 86400) > 1 ? 's' : ''} ago`;
}

interface UseEntityFormDraftOptions<T extends Record<string, unknown>> {
  mode: 'create' | 'edit';
  userId?: string;
  config: EntityConfig<T>;
  formStateData: T;
  setFormState: React.Dispatch<React.SetStateAction<FormState<T>>>;
  initialValues?: Partial<T>;
}

export function useEntityFormDraft<T extends Record<string, unknown>>({
  mode,
  userId,
  config,
  formStateData,
  setFormState,
  initialValues,
}: UseEntityFormDraftOptions<T>) {
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (mode === 'edit' || !userId) {
      return;
    }

    const hasInitialContent =
      initialValues &&
      (('title' in initialValues && initialValues.title) ||
        ('description' in initialValues && initialValues.description));

    const draftKey = `${config.type}-draft-${userId}`;
    if (hasInitialContent) {
      localStorage.removeItem(draftKey);
      return;
    }

    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft) {
      try {
        const { formData, savedAt } = JSON.parse(savedDraft);
        const age = Date.now() - new Date(savedAt).getTime();
        if (age < 7 * 24 * 60 * 60 * 1000) {
          setFormState(prev => ({ ...prev, data: { ...prev.data, ...formData } }));
          toast.info(`Draft loaded from ${formatRelativeTime(savedAt)}`, {
            description: 'Your previous work has been restored',
            duration: 4000,
          });
          setLastSavedAt(new Date(savedAt));
        } else {
          localStorage.removeItem(draftKey);
        }
      } catch (error) {
        logger.error('Failed to parse draft', { error }, 'EntityForm');
        localStorage.removeItem(draftKey);
      }
    }
  }, [config.type, userId, mode, initialValues, setFormState]);

  useEffect(() => {
    if (mode === 'edit' || !userId) {
      return;
    }

    const interval = setInterval(() => {
      const hasContent = Object.values(formStateData).some(v => {
        if (typeof v === 'string') {
          return v.trim().length > 0;
        }
        if (Array.isArray(v)) {
          return v.length > 0;
        }
        return v !== null && v !== undefined;
      });
      if (!hasContent) {
        return;
      }

      const draftKey = `${config.type}-draft-${userId}`;
      const savedAt = new Date().toISOString();
      localStorage.setItem(draftKey, JSON.stringify({ formData: formStateData, savedAt }));
      setLastSavedAt(new Date(savedAt));
    }, 10000);

    return () => clearInterval(interval);
  }, [formStateData, config.type, userId, mode]);

  const clearDraft = useCallback(() => {
    if (userId) {
      localStorage.removeItem(`${config.type}-draft-${userId}`);
    }
  }, [config.type, userId]);

  return { lastSavedAt, clearDraft };
}
