/**
 * TimelineSearchControls Component
 *
 * Renders search input and controls for timeline feeds.
 */

'use client';

import Button from '@/components/ui/Button';
import { Search, Loader2, X } from 'lucide-react';
import { TIMELINE_SURFACE } from '@/config/timeline';

interface TimelineSearchControlsProps {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onSearch: (e?: React.FormEvent) => void;
  onClearSearch: () => void;
  isSearchActive: boolean;
  searching: boolean;
  searchError: string | null;
  searchResultsCount: number;
  searchTotal: number | null;
}

export function TimelineSearchControls({
  searchQuery,
  onSearchQueryChange,
  onSearch,
  onClearSearch,
  isSearchActive,
  searching,
  searchError,
  searchResultsCount,
  searchTotal,
}: TimelineSearchControlsProps) {
  return (
    <div className="border-b border-subtle bg-surface-page px-4 py-3">
      <form onSubmit={onSearch} className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-fg-tertiary absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearchQueryChange(e.target.value)}
            placeholder="Search posts"
            className="w-full rounded-md border border-subtle bg-surface-page py-2 pl-9 pr-3 text-sm text-fg-primary placeholder:text-fg-secondary focus:border-interactive focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>
        <Button type="submit" size="sm" disabled={searching} className={TIMELINE_SURFACE.chip}>
          {searching ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          {searching ? 'Searching' : 'Search'}
        </Button>
        {isSearchActive && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onClearSearch}
            className={TIMELINE_SURFACE.chip}
          >
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </form>
      {searchError && <p className="text-sm text-status-negative mt-2">{searchError}</p>}
      {isSearchActive && !searchError && (
        <p className="text-xs text-fg-secondary mt-2">
          Showing {searchResultsCount} of {searchTotal ?? searchResultsCount} results
        </p>
      )}
    </div>
  );
}
