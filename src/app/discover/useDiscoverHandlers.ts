'use client';

import { useState, useCallback } from 'react';
import type { SearchType, SortOption } from '@/services/search';
import type { DiscoverTabType } from '@/components/discover/DiscoverTabs';

interface UseDiscoverHandlersOptions {
  hasMore: boolean;
  loadMore: () => Promise<void>;
  setSearchTerm: (term: string) => void;
  setSortBy: (sort: SortOption) => void;
  setSearchType: (type: SearchType) => void;
  setActiveTab: (tab: DiscoverTabType) => void;
}

export function useDiscoverHandlers({
  hasMore,
  loadMore,
  setSearchTerm,
  setSortBy,
  setSearchType,
  setActiveTab,
}: UseDiscoverHandlersOptions) {
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const handleLoadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore) {
      return;
    }
    setIsLoadingMore(true);
    try {
      await loadMore();
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, loadMore]);

  const handleSearch = (value: string) => setSearchTerm(value);

  const handleSortChange = (sort: string) => {
    const validSorts: SortOption[] = ['relevance', 'recent'];
    if (validSorts.includes(sort as SortOption)) {
      setSortBy(sort as SortOption);
    }
  };

  const handleTabChange = useCallback(
    (tab: DiscoverTabType) => {
      setActiveTab(tab);
      const newType: SearchType =
        tab === 'all' ? 'all' : tab === 'profiles' ? 'profiles' : 'projects';
      setSearchType(newType);
    },
    [setSearchType, setActiveTab]
  );

  return { isLoadingMore, handleLoadMore, handleSearch, handleSortChange, handleTabChange };
}
