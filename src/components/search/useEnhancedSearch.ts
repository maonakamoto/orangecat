'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchSuggestions } from '@/hooks/useSearchSuggestions';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/config/routes';
import { useEnhancedSearchKeyboard } from './useEnhancedSearchKeyboard';

export interface SearchItem {
  text: string;
  action: () => void;
}

export interface QuickAction {
  icon: React.ReactNode;
  label: string;
  action: () => void;
}

export interface UseEnhancedSearchProps {
  showQuickActions?: boolean;
  autoFocus?: boolean;
}

export const TRENDING_SEARCHES = [
  'Bitcoin Lightning Network',
  'Open Source Projects',
  'Education Initiatives',
  'Environmental Projects',
];

export function useEnhancedSearch({ showQuickActions = true }: UseEnhancedSearchProps = {}) {
  const router = useRouter();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const { suggestions, loading } = useSearchSuggestions(query, isOpen && query.length > 1);

  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const quickActions: QuickAction[] = useMemo(
    () => [
      {
        icon: null,
        label: 'Find People',
        action: () => router.push(ROUTES.DISCOVER_TYPE('profiles')),
      },
      {
        icon: null,
        label: 'Browse Projects',
        action: () => router.push(ROUTES.DISCOVER_TYPE('projects')),
      },
      { icon: null, label: 'Trending', action: () => router.push(ROUTES.DISCOVER_TRENDING) },
    ],
    [router]
  );

  const trendingSearches = TRENDING_SEARCHES;

  useEffect(() => {
    if (user) {
      const history = localStorage.getItem(`search-history-${user.id}`);
      if (history) {
        setSearchHistory(JSON.parse(history).slice(0, 5));
      }
    }
  }, [user]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = useCallback(
    (searchQuery: string) => {
      if (!searchQuery.trim()) {
        return;
      }
      if (user) {
        const newHistory = [searchQuery, ...searchHistory.filter(h => h !== searchQuery)].slice(
          0,
          5
        );
        setSearchHistory(newHistory);
        localStorage.setItem(`search-history-${user.id}`, JSON.stringify(newHistory));
      }
      // The demand log fires from the discover page (the single point every
      // committed search lands on), where the true result count is known.
      router.push(`/discover?q=${encodeURIComponent(searchQuery)}`);
      setIsOpen(false);
      setQuery('');
      setFocusedIndex(-1);
    },
    [user, searchHistory, router]
  );

  const getVisibleItems = useCallback((): SearchItem[] => {
    const items: SearchItem[] = [];
    if (query.length === 0) {
      if (showQuickActions) {
        quickActions.forEach(action => {
          items.push({ text: action.label, action: action.action });
        });
      }
      searchHistory.forEach(historyItem => {
        items.push({ text: historyItem, action: () => handleSearch(historyItem) });
      });
      trendingSearches.forEach(trending => {
        items.push({ text: trending, action: () => handleSearch(trending) });
      });
    } else if (query.length > 1) {
      suggestions.forEach(suggestion => {
        items.push({ text: suggestion, action: () => handleSearch(suggestion) });
      });
      items.push({ text: `Search for "${query}"`, action: () => handleSearch(query) });
    }
    return items;
  }, [
    query,
    showQuickActions,
    quickActions,
    searchHistory,
    suggestions,
    handleSearch,
    trendingSearches,
  ]);

  useEnhancedSearchKeyboard({
    isOpen,
    focusedIndex,
    query,
    inputRef,
    itemRefs,
    getVisibleItems,
    handleSearch,
    setIsOpen,
    setFocusedIndex,
  });

  useEffect(() => {
    setFocusedIndex(-1);
  }, [query, suggestions, searchHistory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  const clearHistory = () => {
    setSearchHistory([]);
    if (user) {
      localStorage.removeItem(`search-history-${user.id}`);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isOpen && focusedIndex >= 0) {
      e.preventDefault();
    }
    if (e.key === 'ArrowDown' && !isOpen) {
      e.preventDefault();
      setIsOpen(true);
      setFocusedIndex(0);
    }
  };

  return {
    query,
    setQuery,
    isOpen,
    setIsOpen,
    searchHistory,
    focusedIndex,
    suggestions,
    loading,
    searchRef,
    inputRef,
    itemRefs,
    quickActions,
    trendingSearches,
    handleSearch,
    handleSubmit,
    clearHistory,
    handleInputKeyDown,
  };
}
