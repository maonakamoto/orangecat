'use client';

import { Calendar, Tag, Filter } from 'lucide-react';
import { BlogPost } from '@/lib/blog';

interface TimeFilterOption {
  key: string;
  label: string;
  count: number;
}

interface BlogFiltersProps {
  tags: string[];
  selectedTag: string | null;
  setSelectedTag: (tag: string | null) => void;
  selectedTimeFilter: string;
  setSelectedTimeFilter: (filter: string) => void;
  timeFilterOptions: TimeFilterOption[];
  filteredPosts: BlogPost[];
  clearFilters: () => void;
}

export function BlogFilters({
  tags,
  selectedTag,
  setSelectedTag,
  selectedTimeFilter,
  setSelectedTimeFilter,
  timeFilterOptions,
  filteredPosts,
  clearFilters,
}: BlogFiltersProps) {
  return (
    <div className="mb-8 space-y-6">
      {tags.length > 0 && (
        <div>
          <div className="flex items-center mb-4">
            <Tag className="w-4 h-4 mr-2 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Filter by Topic</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                !selectedTag
                  ? 'bg-muted/400 text-white'
                  : 'bg-muted text-muted-foreground hover:bg-gray-200 dark:hover:bg-muted/80'
              }`}
            >
              All Topics
            </button>
            {tags.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedTag === tag
                    ? 'bg-muted/400 text-white'
                    : 'bg-muted text-muted-foreground hover:bg-gray-200 dark:hover:bg-muted/80'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center mb-4">
          <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Filter by Time</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {timeFilterOptions.map(option => (
            <button
              key={option.key}
              onClick={() => setSelectedTimeFilter(option.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedTimeFilter === option.key
                  ? 'bg-muted/400 text-white'
                  : 'bg-muted text-muted-foreground hover:bg-gray-200 dark:hover:bg-muted/80'
              }`}
            >
              {option.label}
              <span className="ml-1.5 text-xs opacity-75">({option.count})</span>
            </button>
          ))}
        </div>
      </div>

      {(selectedTag || selectedTimeFilter !== 'all') && (
        <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Showing:</span>
            {selectedTag && (
              <span className="px-2 py-1 bg-muted text-foreground rounded text-xs font-medium">
                {selectedTag}
              </span>
            )}
            {selectedTimeFilter !== 'all' && (
              <span className="px-2 py-1 bg-muted text-foreground rounded text-xs font-medium">
                {timeFilterOptions.find(opt => opt.key === selectedTimeFilter)?.label}
              </span>
            )}
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground font-medium">
              {filteredPosts.length} post{filteredPosts.length !== 1 ? 's' : ''}
            </span>
          </div>
          <button
            onClick={clearFilters}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground underline"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
