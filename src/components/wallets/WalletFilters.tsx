'use client';

import { useState } from 'react';
import { Filter, Search, X, Smartphone, Monitor, Globe, Shield } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { cn } from '@/lib/utils';

export interface WalletFilters {
  type: string[];
  difficulty: string[];
  privacy: string[];
  custody: string[];
  countries: string[];
  features: string[];
  search: string;
}

interface WalletFiltersProps {
  filters: WalletFilters;
  onFiltersChange: (filters: WalletFilters) => void;
  className?: string;
}

const filterOptions = {
  type: [
    { value: 'hardware', label: 'Hardware', icon: Shield },
    { value: 'mobile', label: 'Mobile', icon: Smartphone },
    { value: 'desktop', label: 'Desktop', icon: Monitor },
    { value: 'browser', label: 'Browser', icon: Globe },
  ],
  difficulty: [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
  ],
  privacy: [
    { value: 'low', label: 'Low Privacy' },
    { value: 'medium', label: 'Medium Privacy' },
    { value: 'high', label: 'High Privacy' },
  ],
  custody: [
    { value: 'self-custody', label: 'Self-Custody' },
    { value: 'custodial', label: 'Custodial' },
    { value: 'hybrid', label: 'Hybrid' },
  ],
  countries: [
    { value: 'All countries', label: 'All Countries' },
    { value: 'US', label: 'United States' },
    { value: 'EU', label: 'European Union' },
    { value: 'UK', label: 'United Kingdom' },
  ],
};

const ADVANCED_FILTER_GROUPS = [
  { key: 'difficulty' as const, label: 'Difficulty Level' },
  { key: 'privacy' as const, label: 'Privacy Level' },
  { key: 'custody' as const, label: 'Custody Type' },
  { key: 'countries' as const, label: 'Supported Countries' },
];

const ACTIVE_CHIP_COLORS: Record<string, { bg: string; text: string; hover: string }> = {
  type: { bg: 'bg-blue-100', text: 'text-blue-800', hover: 'hover:text-blue-600' },
  difficulty: { bg: 'bg-green-100', text: 'text-green-800', hover: 'hover:text-green-600' },
  privacy: { bg: 'bg-purple-100', text: 'text-purple-800', hover: 'hover:text-purple-600' },
  custody: { bg: 'bg-orange-100', text: 'text-orange-800', hover: 'hover:text-orange-600' },
};

export function WalletFilters({ filters, onFiltersChange, className }: WalletFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateFilters = (key: keyof WalletFilters, value: string | string[]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      type: [],
      difficulty: [],
      privacy: [],
      custody: [],
      countries: [],
      features: [],
      search: '',
    });
  };

  const hasActiveFilters = Object.values(filters).some(value =>
    Array.isArray(value) ? value.length > 0 : Boolean(value)
  );

  const toggleArrayFilter = (key: keyof WalletFilters, value: string) => {
    const current = filters[key] as string[];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    updateFilters(key, updated);
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search wallets..."
          value={filters.search}
          onChange={e => updateFilters('search', e.target.value)}
          className="pl-10"
        />
        {filters.search && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => updateFilters('search', '')}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {filterOptions.type.map(option => {
          const Icon = option.icon;
          return (
            <Button
              key={option.value}
              variant={filters.type.includes(option.value) ? 'primary' : 'outline'}
              size="sm"
              onClick={() => toggleArrayFilter('type', option.value)}
              className="flex items-center gap-2"
            >
              <Icon className="w-3 h-3" />
              {option.label}
            </Button>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2"
        >
          <Filter className="w-4 h-4" />
          {showAdvanced ? 'Hide' : 'Show'} Advanced Filters
        </Button>
        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={clearAllFilters} className="text-sm">
            Clear All
          </Button>
        )}
      </div>

      {showAdvanced && (
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
          {ADVANCED_FILTER_GROUPS.map(({ key, label }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
              <div className="flex flex-wrap gap-2">
                {filterOptions[key].map(option => (
                  <Button
                    key={option.value}
                    variant={filters[key].includes(option.value) ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => toggleArrayFilter(key, option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {(['type', 'difficulty', 'privacy', 'custody'] as const).flatMap(key => {
            const colors = ACTIVE_CHIP_COLORS[key];
            return (filters[key] as string[]).map(value => (
              <span
                key={`${key}-${value}`}
                className={`inline-flex items-center gap-1 px-2 py-1 ${colors.bg} ${colors.text} text-xs rounded-full`}
              >
                {filterOptions[key]?.find(opt => opt.value === value)?.label}
                <X
                  className={`w-3 h-3 cursor-pointer ${colors.hover}`}
                  onClick={() => toggleArrayFilter(key, value)}
                />
              </span>
            ));
          })}
        </div>
      )}
    </div>
  );
}
