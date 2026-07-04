'use client';

import { useEffect, useState } from 'react';
import { API_ROUTES } from '@/config/api-routes';
import { logger } from '@/utils/logger';
import { ZERO_DISCOVER_COUNTS, type DiscoverCounts } from '@/services/search/discoverCounts';

// v3: counts now come from /api/discover/counts (server-side, admin client) so
// anonymous visitors see the real public numbers instead of RLS-blocked zeros.
const CACHE_KEY = 'discover_counts_v4';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export type { DiscoverCounts };

export function useDiscoverCounts(): DiscoverCounts {
  const [counts, setCounts] = useState<DiscoverCounts>(ZERO_DISCOVER_COUNTS);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached) as DiscoverCounts & { timestamp: number };
          if (Date.now() - parsed.timestamp < CACHE_DURATION) {
            const { timestamp: _t, ...rest } = parsed;
            setCounts({ ...ZERO_DISCOVER_COUNTS, ...rest });
            return;
          }
        }

        const res = await fetch(API_ROUTES.DISCOVER.COUNTS);
        if (!res.ok) {
          throw new Error(`Discover counts request failed: ${res.status}`);
        }
        const body = (await res.json()) as { success?: boolean; data?: Partial<DiscoverCounts> };
        const next: DiscoverCounts = { ...ZERO_DISCOVER_COUNTS, ...(body.data ?? {}) };

        setCounts(next);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ ...next, timestamp: Date.now() }));
      } catch (error) {
        logger.error('Error fetching discover counts', error, 'Discover');
      }
    };

    fetchCounts();
  }, []);

  return counts;
}
