'use client';

import { useEffect } from 'react';
import type { SearchItem } from './useEnhancedSearch';

interface UseEnhancedSearchKeyboardOptions {
  isOpen: boolean;
  focusedIndex: number;
  query: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  itemRefs: React.MutableRefObject<(HTMLButtonElement | null)[]>;
  getVisibleItems: () => SearchItem[];
  handleSearch: (query: string) => void;
  setIsOpen: (open: boolean) => void;
  setFocusedIndex: React.Dispatch<React.SetStateAction<number>>;
}

export function useEnhancedSearchKeyboard({
  isOpen,
  focusedIndex,
  query,
  inputRef,
  itemRefs,
  getVisibleItems,
  handleSearch,
  setIsOpen,
  setFocusedIndex,
}: UseEnhancedSearchKeyboardOptions) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
        setFocusedIndex(-1);
        return;
      }

      if (!isOpen) {
        return;
      }

      const visibleItems = getVisibleItems();
      const maxIndex = visibleItems.length - 1;

      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          setIsOpen(false);
          setFocusedIndex(-1);
          inputRef.current?.blur();
          break;

        case 'ArrowDown':
          event.preventDefault();
          setFocusedIndex(prev => {
            const nextIndex = prev < maxIndex ? prev + 1 : 0;
            setTimeout(() => {
              itemRefs.current[nextIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }, 0);
            return nextIndex;
          });
          break;

        case 'ArrowUp':
          event.preventDefault();
          setFocusedIndex(prev => {
            const nextIndex = prev > 0 ? prev - 1 : maxIndex;
            setTimeout(() => {
              itemRefs.current[nextIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }, 0);
            return nextIndex;
          });
          break;

        case 'Enter':
          event.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < visibleItems.length) {
            visibleItems[focusedIndex].action();
          } else {
            handleSearch(query);
          }
          break;

        case 'Tab':
          setIsOpen(false);
          setFocusedIndex(-1);
          break;
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    isOpen,
    focusedIndex,
    query,
    getVisibleItems,
    handleSearch,
    inputRef,
    itemRefs,
    setIsOpen,
    setFocusedIndex,
  ]);
}
