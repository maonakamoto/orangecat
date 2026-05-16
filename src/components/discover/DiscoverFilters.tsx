'use client';

import { Search, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { simpleCategories } from '@/config/categories';
import { SortOption } from '@/services/search';
import { SortViewControl, type ViewMode } from './SortViewControl';

// Status styles mapping for Tailwind (dynamic classes don't work with string interpolation)
const STATUS_STYLES = {
  active: {
    selected: 'bg-green-100 border-green-300 text-green-700',
    label: 'Active',
  },
  paused: {
    selected: 'bg-yellow-100 border-yellow-300 text-yellow-700',
    label: 'Paused',
  },
  completed: {
    selected: 'bg-tiffany-100 border-tiffany-300 text-tiffany-700',
    label: 'Completed',
  },
  cancelled: {
    selected: 'bg-muted border-gray-300 dark:border-border text-gray-700 dark:text-foreground',
    label: 'Cancelled',
  },
} as const;

type StatusKey = keyof typeof STATUS_STYLES;

interface DiscoverFiltersProps {
  variant: 'desktop' | 'mobile';
  searchTerm: string;
  onSearchChange: (value: string) => void;
  loading?: boolean;
  sortBy: SortOption;
  onSortChange: (value: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  selectedStatuses: StatusKey[];
  onToggleStatus: (status: StatusKey) => void;
  showStatusFilter?: boolean;
  selectedCategories: string[];
  onToggleCategory: (category: string) => void;
  showCategoryFilter?: boolean;
  country: string;
  onCountryChange: (value: string) => void;
  city: string;
  onCityChange: (value: string) => void;
  postal: string;
  onPostalChange: (value: string) => void;
  radiusKm: number;
  onRadiusChange: (value: number) => void;
  onClearFilters: () => void;
}

export default function DiscoverFilters({
  variant,
  searchTerm,
  onSearchChange,
  loading = false,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  selectedStatuses,
  onToggleStatus,
  showStatusFilter = true,
  selectedCategories,
  onToggleCategory,
  showCategoryFilter = true,
  country,
  onCountryChange,
  city,
  onCityChange,
  postal,
  onPostalChange,
  radiusKm,
  onRadiusChange,
  onClearFilters,
}: DiscoverFiltersProps) {
  const isMobile = variant === 'mobile';

  return (
    <>
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-foreground mb-2">
          Search
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400 dark:text-muted-foreground" />
          </div>
          <Input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            className="pl-10 pr-4 py-2 text-sm bg-white/80 dark:bg-muted border-gray-200/80 dark:border-border rounded-xl"
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-gray-400 dark:text-muted-foreground" />
            </div>
          )}
        </div>
      </div>

      <SortViewControl
        isMobile={isMobile}
        sortBy={sortBy}
        onSortChange={onSortChange}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
      />

      {showStatusFilter && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-foreground mb-2">
            Project Status
          </label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(STATUS_STYLES) as StatusKey[]).map(statusKey => (
              <button
                key={statusKey}
                onClick={() => onToggleStatus(statusKey)}
                className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                  selectedStatuses.includes(statusKey)
                    ? STATUS_STYLES[statusKey].selected
                    : 'bg-white/80 dark:bg-muted border-border text-gray-700 dark:text-foreground hover:bg-muted/80'
                }`}
              >
                {STATUS_STYLES[statusKey].label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Draft projects are not shown in search results
          </p>
        </div>
      )}

      {showCategoryFilter && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-foreground mb-2">
            Categories
          </label>
          <div className="flex flex-wrap gap-2">
            {simpleCategories.map(cat => (
              <button
                key={cat.value}
                onClick={() => onToggleCategory(cat.value)}
                className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                  selectedCategories.includes(cat.value)
                    ? 'bg-orange-100 border-orange-300 text-orange-700'
                    : 'bg-white/80 dark:bg-muted border-border text-gray-700 dark:text-foreground hover:bg-muted/80'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3 mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-foreground">
          Location
        </label>
        <input
          value={country}
          onChange={e => onCountryChange(e.target.value)}
          placeholder="Country"
          className="w-full px-3 py-2 bg-white/80 dark:bg-muted border border-gray-200/80 dark:border-border rounded-xl text-sm dark:text-foreground"
        />
        <input
          value={city}
          onChange={e => onCityChange(e.target.value)}
          placeholder="City/Region"
          className="w-full px-3 py-2 bg-white/80 dark:bg-muted border border-gray-200/80 dark:border-border rounded-xl text-sm dark:text-foreground"
        />
        <input
          value={postal}
          onChange={e => onPostalChange(e.target.value)}
          placeholder="Postal code"
          className="w-full px-3 py-2 bg-white/80 dark:bg-muted border border-gray-200/80 dark:border-border rounded-xl text-sm dark:text-foreground"
        />
        <select
          value={radiusKm}
          onChange={e => onRadiusChange(Number(e.target.value))}
          className="w-full px-3 py-2 bg-white/80 dark:bg-muted border border-gray-200/80 dark:border-border rounded-xl text-sm dark:text-foreground"
        >
          <option value={0}>Anywhere</option>
          <option value={10}>Within 10 km</option>
          <option value={25}>Within 25 km</option>
          <option value={50}>Within 50 km</option>
          <option value={100}>Within 100 km</option>
        </select>
      </div>

      {!isMobile &&
        (searchTerm ||
          selectedCategories.length > 0 ||
          country ||
          city ||
          postal ||
          radiusKm ||
          sortBy !== 'recent') && (
          <div className="mb-6 pb-6 border-b border-border">
            <label className="block text-sm font-medium text-gray-700 dark:text-foreground mb-2">
              Active filters
            </label>
            <div className="flex flex-wrap gap-2">
              {searchTerm && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-muted text-gray-700 dark:text-foreground">
                  &quot;{searchTerm}&quot;
                </span>
              )}
              {selectedCategories.map(cat => (
                <span
                  key={cat}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-muted text-gray-700 dark:text-foreground"
                >
                  {cat}
                </span>
              ))}
              {(country || city || postal) && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-muted text-gray-700 dark:text-foreground">
                  {country || city || postal}
                </span>
              )}
              {sortBy !== 'recent' && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-muted text-gray-700 dark:text-foreground">
                  {sortBy}
                </span>
              )}
            </div>
          </div>
        )}

      <div className={isMobile ? '' : 'pt-2'}>
        <Button onClick={onClearFilters} variant="outline" size="sm" className="w-full">
          Clear all
        </Button>
      </div>
    </>
  );
}

export type { StatusKey };
export { STATUS_STYLES };
