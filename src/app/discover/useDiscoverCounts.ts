'use client';

import { useEffect, useState } from 'react';
import { logger } from '@/utils/logger';
import supabase from '@/lib/supabase/browser';
import { getTableName } from '@/config/entity-registry';
import { DATABASE_TABLES } from '@/config/database-tables';
import { STATUS, ENTITY_STATUS } from '@/config/database-constants';

const CACHE_KEY = 'discover_counts_v2';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface DiscoverCounts {
  totalProjectsCount: number;
  totalProfilesCount: number;
  totalLoansCount: number;
  totalInvestmentsCount: number;
  totalAssetsCount: number;
  totalCausesCount: number;
  totalEventsCount: number;
  totalProductsCount: number;
  totalServicesCount: number;
  totalGroupsCount: number;
  totalWishlistsCount: number;
  totalResearchCount: number;
  totalAiAssistantsCount: number;
}

const ZERO: DiscoverCounts = {
  totalProjectsCount: 0,
  totalProfilesCount: 0,
  totalLoansCount: 0,
  totalInvestmentsCount: 0,
  totalAssetsCount: 0,
  totalCausesCount: 0,
  totalEventsCount: 0,
  totalProductsCount: 0,
  totalServicesCount: 0,
  totalGroupsCount: 0,
  totalWishlistsCount: 0,
  totalResearchCount: 0,
  totalAiAssistantsCount: 0,
};

export function useDiscoverCounts(): DiscoverCounts {
  const [counts, setCounts] = useState<DiscoverCounts>(ZERO);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached) as DiscoverCounts & { timestamp: number };
          if (Date.now() - parsed.timestamp < CACHE_DURATION) {
            const { timestamp: _t, ...rest } = parsed;
            setCounts({ ...ZERO, ...rest });
            return;
          }
        }

        // Filter shapes mirror discoverGenericFetcher.ts so badge totals match
        // the entity-tab views.
        const head = (q: ReturnType<ReturnType<typeof supabase.from>['select']>) =>
          q as unknown as Promise<{ count: number | null }>;

        const [
          projectsRes,
          profilesRes,
          loansRes,
          investmentsRes,
          assetsRes,
          causesRes,
          eventsRes,
          productsRes,
          servicesRes,
          groupsRes,
          wishlistsRes,
          researchRes,
          aiAssistantsRes,
        ] = await Promise.all([
          head(
            supabase
              .from(getTableName('project'))
              .select('*', { count: 'exact', head: true })
              .eq('status', ENTITY_STATUS.ACTIVE)
          ),
          head(supabase.from(DATABASE_TABLES.PROFILES).select('*', { count: 'exact', head: true })),
          head(
            supabase
              .from(getTableName('loan'))
              .select('*', { count: 'exact', head: true })
              .eq('is_public', true)
              .eq('status', ENTITY_STATUS.ACTIVE)
          ),
          head(
            supabase
              .from(getTableName('investment'))
              .select('*', { count: 'exact', head: true })
              .eq('is_public', true)
          ),
          head(
            supabase
              .from(getTableName('asset'))
              .select('*', { count: 'exact', head: true })
              .eq('public_visibility', true)
              .eq('status', ENTITY_STATUS.ACTIVE)
          ),
          head(
            supabase
              .from(getTableName('cause'))
              .select('*', { count: 'exact', head: true })
              .eq('status', STATUS.CAUSES.ACTIVE)
          ),
          head(
            supabase
              .from(getTableName('event'))
              .select('*', { count: 'exact', head: true })
              .in('status', [STATUS.EVENTS.PUBLISHED, STATUS.EVENTS.OPEN, STATUS.EVENTS.ONGOING])
          ),
          head(
            supabase
              .from(getTableName('product'))
              .select('*', { count: 'exact', head: true })
              .eq('status', STATUS.PRODUCTS.ACTIVE)
          ),
          head(
            supabase
              .from(getTableName('service'))
              .select('*', { count: 'exact', head: true })
              .eq('status', STATUS.SERVICES.ACTIVE)
          ),
          head(
            supabase
              .from(getTableName('group'))
              .select('*', { count: 'exact', head: true })
              .eq('is_public', true)
          ),
          head(
            supabase
              .from(getTableName('wishlist'))
              .select('*', { count: 'exact', head: true })
              .eq('visibility', 'public')
              .eq('is_active', true)
          ),
          head(
            supabase
              .from(getTableName('research'))
              .select('*', { count: 'exact', head: true })
              .eq('is_public', true)
              .eq('status', ENTITY_STATUS.ACTIVE)
          ),
          head(
            supabase
              .from(getTableName('ai_assistant'))
              .select('*', { count: 'exact', head: true })
              .eq('is_public', true)
              .eq('status', STATUS.AI_ASSISTANTS.ACTIVE)
          ),
        ]);

        const next: DiscoverCounts = {
          totalProjectsCount: projectsRes.count ?? 0,
          totalProfilesCount: profilesRes.count ?? 0,
          totalLoansCount: loansRes.count ?? 0,
          totalInvestmentsCount: investmentsRes.count ?? 0,
          totalAssetsCount: assetsRes.count ?? 0,
          totalCausesCount: causesRes.count ?? 0,
          totalEventsCount: eventsRes.count ?? 0,
          totalProductsCount: productsRes.count ?? 0,
          totalServicesCount: servicesRes.count ?? 0,
          totalGroupsCount: groupsRes.count ?? 0,
          totalWishlistsCount: wishlistsRes.count ?? 0,
          totalResearchCount: researchRes.count ?? 0,
          totalAiAssistantsCount: aiAssistantsRes.count ?? 0,
        };

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
