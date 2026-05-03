'use client';

import { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSearch } from '@/hooks/useSearch';
import { SearchFundingPage, SearchProfile } from '@/services/search';
import { PUBLIC_SEARCH_STATUSES } from '@/config/project-statuses';
import { useDiscoverCounts } from './useDiscoverCounts';
import { useDiscoverFinancialData } from './useDiscoverFinancialData';
import { useDiscoverGenericData } from './useDiscoverGenericData';
import { useDiscoverFilters } from './useDiscoverFilters';
import { useDiscoverUrlSync } from './useDiscoverUrlSync';
import { useDiscoverHandlers } from './useDiscoverHandlers';
import { VALID_TAB_TYPES } from './discoverConstants';
import type { DiscoverTabType } from '@/components/discover/DiscoverTabs';

export type ViewMode = 'grid' | 'list';

export function useDiscoverState() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialSearchTerm = searchParams?.get('search') || '';
  const initialCategories = (searchParams?.get('category') || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const urlSort = searchParams?.get('sort') || 'recent';
  const initialSort = (['recent', 'relevance'].includes(urlSort) ? urlSort : 'recent') as
    | 'relevance'
    | 'recent';
  const urlType = (searchParams?.get('type') || 'all') as DiscoverTabType;
  const initialType = VALID_TAB_TYPES.includes(urlType) ? urlType : 'all';
  const initialCountry = searchParams?.get('country') || '';
  const initialCity = searchParams?.get('city') || '';
  const initialPostal = searchParams?.get('postal') || '';
  const initialRadiusKm = Number(searchParams?.get('radius_km') || 0);

  const {
    query: searchTerm,
    setQuery: setSearchTerm,
    setSearchType,
    sortBy,
    setSortBy,
    setFilters,
    results: searchResults,
    loading,
    totalResults,
    hasMore,
    loadMore,
    error: searchError,
  } = useSearch({
    initialQuery: initialSearchTerm,
    initialType:
      initialType === 'all' ? 'all' : initialType === 'profiles' ? 'profiles' : 'projects',
    initialSort,
    initialFilters: {
      categories: initialCategories.length > 0 ? initialCategories : undefined,
      statuses: PUBLIC_SEARCH_STATUSES as ('active' | 'paused' | 'completed' | 'cancelled')[],
      country: initialCountry || undefined,
      city: initialCity || undefined,
      postal_code: initialPostal || undefined,
      radius_km: initialRadiusKm || undefined,
    },
    autoSearch: true,
    debounceMs: 300,
  });

  const [activeTab, setActiveTab] = useState<DiscoverTabType>(initialType);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showFilters, setShowFilters] = useState(false);

  const filters = useDiscoverFilters({
    setFilters,
    setSearchTerm,
    setSortBy,
    router,
    initialCategories,
    initialCountry,
    initialCity,
    initialPostal,
    initialRadiusKm,
  });

  useDiscoverUrlSync({
    activeTab,
    searchTerm,
    selectedCategories: filters.selectedCategories,
    sortBy,
    country: filters.country,
    city: filters.city,
    postal: filters.postal,
    radiusKm: filters.radiusKm,
    router,
    searchParams,
  });

  const { isLoadingMore, handleLoadMore, handleSearch, handleSortChange, handleTabChange } =
    useDiscoverHandlers({
      hasMore,
      loadMore,
      setSearchTerm,
      setSortBy,
      setSearchType,
      setActiveTab,
    });

  const counts = useDiscoverCounts();
  const financial = useDiscoverFinancialData(activeTab, searchTerm);
  const generic = useDiscoverGenericData(activeTab, searchTerm);

  const projects = useMemo(
    () => searchResults.filter(r => r.type === 'project').map(r => r.data as SearchFundingPage),
    [searchResults]
  );
  const profiles = useMemo(
    () => searchResults.filter(r => r.type === 'profile').map(r => r.data as SearchProfile),
    [searchResults]
  );

  const tabItems: Partial<Record<DiscoverTabType, unknown[]>> = {
    projects,
    profiles,
    loans: financial.loans,
    investments: financial.investments,
    assets: financial.assets,
    causes: generic.causes,
    events: generic.events,
    products: generic.products,
    services: generic.services,
    groups: generic.groups,
    wishlists: generic.wishlists,
    research: generic.research,
    ai_assistants: generic.aiAssistants,
  };

  const isEmpty =
    activeTab === 'all'
      ? Object.values(tabItems).every(items => items.length === 0)
      : (tabItems[activeTab]?.length ?? 0) === 0;

  return {
    searchTerm,
    searchError,
    loading,
    loansLoading: financial.loansLoading,
    investmentsLoading: financial.investmentsLoading,
    assetsLoading: financial.assetsLoading,
    genericLoading: generic.genericLoading,
    totalResults,
    hasMore,
    isLoadingMore,
    projects,
    profiles,
    loans: financial.loans,
    investments: financial.investments,
    assets: financial.assets,
    causes: generic.causes,
    events: generic.events,
    products: generic.products,
    services: generic.services,
    groups: generic.groups,
    wishlists: generic.wishlists,
    research: generic.research,
    aiAssistants: generic.aiAssistants,
    totalInvestmentsCount: counts.totalInvestmentsCount,
    stats: {
      totalProjects: counts.totalProjectsCount,
      totalProfiles: counts.totalProfilesCount,
      totalFinancial:
        counts.totalLoansCount + counts.totalInvestmentsCount + counts.totalAssetsCount,
    },
    activeTab,
    viewMode,
    setViewMode,
    showFilters,
    setShowFilters,
    sortBy,
    ...filters,
    isEmpty,
    hasFilters: !!(searchTerm || filters.selectedCategories.length > 0),
    handleSearch,
    handleSortChange,
    handleTabChange,
    handleLoadMore,
  };
}
