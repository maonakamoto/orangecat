import { useState, useEffect, useCallback, useRef } from 'react';
import {
  search,
  getTrending,
  SearchResult,
  SearchType,
  SortOption,
  SearchFilters,
  SearchResponse,
} from '@/services/search';
import { fetchSuggestions } from './searchUtils';

interface UseSearchOptions {
  initialQuery?: string;
  initialType?: SearchType;
  initialSort?: SortOption;
  initialFilters?: SearchFilters;
  autoSearch?: boolean;
  debounceMs?: number;
}

interface UseSearchReturn {
  query: string;
  searchType: SearchType;
  sortBy: SortOption;
  filters: SearchFilters;
  results: SearchResult[];
  loading: boolean;
  error: string | null;
  totalResults: number;
  hasMore: boolean;
  suggestions: string[];
  setQuery: (query: string) => void;
  setSearchType: (type: SearchType) => void;
  setSortBy: (sort: SortOption) => void;
  setFilters: (filters: SearchFilters) => void;
  executeSearch: () => Promise<void>;
  loadMore: () => Promise<void>;
  clearSearch: () => void;
  clearError: () => void;
  isEmpty: boolean;
  isSearching: boolean;
  hasResults: boolean;
}

export function useSearch(options: UseSearchOptions = {}): UseSearchReturn {
  const {
    initialQuery = '',
    initialType = 'all',
    initialSort = 'relevance',
    initialFilters = {},
    autoSearch = true,
    debounceMs = 300,
  } = options;

  const [query, setQuery] = useState(initialQuery);
  const [searchType, setSearchType] = useState<SearchType>(initialType);
  const [sortBy, setSortBy] = useState<SortOption>(initialSort);
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);

  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalResults, setTotalResults] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [currentOffset, setCurrentOffset] = useState(0);

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  // Monotonic request id: only the latest in-flight search may write state, so
  // a slow earlier query can't clobber the results of a newer one.
  const requestIdRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  const executeSearch = useCallback(
    async (offset = 0, append = false) => {
      const requestId = ++requestIdRef.current;
      try {
        setLoading(true);
        setError(null);

        let response: SearchResponse;

        const hasActiveFilters = Object.values(filters).some(
          value =>
            value !== undefined &&
            value !== null &&
            value !== '' &&
            !(Array.isArray(value) && value.length === 0)
        );

        if (!debouncedQuery && searchType === 'all' && !hasActiveFilters) {
          response = await getTrending();
        } else {
          response = await search({
            query: debouncedQuery || undefined,
            type: searchType,
            sortBy,
            filters,
            limit: 20,
            offset,
          });
        }

        // A newer search started while this one was in flight — drop it.
        if (requestId !== requestIdRef.current) {
          return;
        }

        if (append) {
          setResults(prev => [...prev, ...response.results]);
        } else {
          setResults(response.results);
          setCurrentOffset(0);
        }

        setTotalResults(response.totalCount);
        setHasMore(response.hasMore);
        setCurrentOffset(offset + response.results.length);
      } catch (err: unknown) {
        if (requestId !== requestIdRef.current) {
          return;
        }
        setError(err instanceof Error ? err.message : 'Failed to perform search');
      } finally {
        // Only the latest request controls the spinner.
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [debouncedQuery, searchType, sortBy, filters]
  );

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) {
      return;
    }
    await executeSearch(currentOffset, true);
  }, [hasMore, loading, currentOffset, executeSearch]);

  const loadSuggestions = useCallback(
    (searchQuery: string) => fetchSuggestions(searchQuery, setSuggestions),
    []
  );

  useEffect(() => {
    if (autoSearch) {
      executeSearch();
    }
  }, [executeSearch, autoSearch]);

  useEffect(() => {
    loadSuggestions(debouncedQuery);
  }, [debouncedQuery, loadSuggestions]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setSearchType('all');
    setSortBy('relevance');
    setFilters({});
    setResults([]);
    setError(null);
    setTotalResults(0);
    setHasMore(false);
    setCurrentOffset(0);
    setSuggestions([]);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const isEmpty = results.length === 0;
  const isSearching = loading;
  const hasResults = results.length > 0;

  return {
    query,
    searchType,
    sortBy,
    filters,
    results,
    loading,
    error,
    totalResults,
    hasMore,
    suggestions,

    setQuery,
    setSearchType,
    setSortBy,
    setFilters,
    executeSearch: () => executeSearch(),
    loadMore,
    clearSearch,
    clearError,

    isEmpty,
    isSearching,
    hasResults,
  };
}
