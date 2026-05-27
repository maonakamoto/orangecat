/**
 * USE SUGGESTIONS HOOK
 * Fetches context-aware suggestions on mount
 */

import { useEffect, useState } from 'react';
import { logger } from '@/utils/logger';
import { API_ROUTES } from '@/config/api-routes';
import { DEFAULT_SUGGESTIONS } from '@/services/ai/suggestions';

export function useSuggestions() {
  const [suggestions, setSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS);
  const [hasContext, setHasContext] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const fetchSuggestions = async () => {
      try {
        const res = await fetch(API_ROUTES.CAT.SUGGESTIONS, { signal: controller.signal });
        if (controller.signal.aborted) {
          return;
        }
        if (res.ok) {
          const data = await res.json();
          if (controller.signal.aborted) {
            return;
          }
          if (data.success && data.data.suggestions) {
            setSuggestions(data.data.suggestions);
            setHasContext(data.data.hasContext || false);
          }
        }
      } catch (e) {
        if ((e as { name?: string }).name === 'AbortError') {
          return;
        }
        // Keep default suggestions on error
        logger.error('Failed to fetch suggestions', { error: e }, 'useSuggestions');
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingSuggestions(false);
        }
      }
    };

    void fetchSuggestions();
    return () => controller.abort();
  }, []);

  return {
    suggestions,
    hasContext,
    isLoadingSuggestions,
  };
}
