/**
 * useCatQuota — fetches the user's daily Cat budget so the chat UI can
 * display a meter and surface an upgrade CTA before the chat route 429s.
 *
 * The hook is intentionally cheap: one GET on mount, plus a refresh()
 * callback the chat hook fires after a successful send. Errors are
 * swallowed silently — the meter just disappears, the chat keeps working.
 */

import { useCallback, useEffect, useState } from 'react';
import { API_ROUTES } from '@/config/api-routes';
import { logger } from '@/utils/logger';

export type CatQuotaTier = 'byok' | 'pro' | 'free';

export interface CatQuota {
  tier: CatQuotaTier;
  hasGroqByok: boolean;
  hasOpenRouterByok: boolean;
  dailyLimit: number;
  dailyRequests: number;
  requestsRemaining: number;
  canUsePlatform: boolean;
  resetInSeconds: number;
  /** ISO timestamp of Pro renewal deadline; null on Free/BYOK. */
  expiresAt: string | null;
}

interface UseCatQuotaResult {
  quota: CatQuota | null;
  isLoading: boolean;
  refresh: () => void;
}

export function useCatQuota(): UseCatQuotaResult {
  const [quota, setQuota] = useState<CatQuota | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchQuota = useCallback(async () => {
    try {
      const res = await fetch(API_ROUTES.CAT.QUOTA, { credentials: 'include' });
      if (!res.ok) {
        setQuota(null);
        return;
      }
      const body = (await res.json()) as { success: boolean; data?: CatQuota };
      if (body.success && body.data) {
        setQuota(body.data);
      } else {
        setQuota(null);
      }
    } catch (err) {
      logger.warn('Failed to fetch cat quota', { err }, 'useCatQuota');
      setQuota(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchQuota();
  }, [fetchQuota]);

  return { quota, isLoading, refresh: fetchQuota };
}
