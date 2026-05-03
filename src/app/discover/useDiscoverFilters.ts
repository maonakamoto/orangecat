'use client';

import { useState, useCallback, useEffect } from 'react';
import type { useRouter } from 'next/navigation';
import type { SortOption, SearchFilters } from '@/services/search';
import { PUBLIC_SEARCH_STATUSES } from '@/config/project-statuses';

type StatusType = 'active' | 'paused' | 'completed' | 'cancelled';

interface UseDiscoverFiltersOptions {
  setFilters: (filters: SearchFilters) => void;
  setSearchTerm: (term: string) => void;
  setSortBy: (sort: SortOption) => void;
  router: ReturnType<typeof useRouter>;
  initialCategories: string[];
  initialCountry: string;
  initialCity: string;
  initialPostal: string;
  initialRadiusKm: number;
}

export function useDiscoverFilters({
  setFilters,
  setSearchTerm,
  setSortBy,
  router,
  initialCategories,
  initialCountry,
  initialCity,
  initialPostal,
  initialRadiusKm,
}: UseDiscoverFiltersOptions) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialCategories);
  const [selectedStatuses, setSelectedStatuses] = useState<StatusType[]>(
    PUBLIC_SEARCH_STATUSES as StatusType[]
  );
  const [country, setCountry] = useState(initialCountry);
  const [city, setCity] = useState(initialCity);
  const [postal, setPostal] = useState(initialPostal);
  const [radiusKm, setRadiusKm] = useState<number>(initialRadiusKm);

  useEffect(() => {
    setFilters({
      categories: selectedCategories.length > 0 ? selectedCategories : undefined,
      statuses: selectedStatuses.length > 0 ? selectedStatuses : undefined,
      country: country || undefined,
      city: city || undefined,
      postal_code: postal || undefined,
      radius_km: radiusKm || undefined,
    });
  }, [selectedCategories, selectedStatuses, country, city, postal, radiusKm, setFilters]);

  const handleToggleCategory = useCallback((category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  }, []);

  const handleToggleStatus = useCallback((status: StatusType) => {
    setSelectedStatuses(prev => {
      const next = prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status];
      return next.length > 0 ? next : ['active', 'paused'];
    });
  }, []);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategories([]);
    setSelectedStatuses(PUBLIC_SEARCH_STATUSES as StatusType[]);
    setSortBy('recent');
    setCountry('');
    setCity('');
    setPostal('');
    setRadiusKm(0);
    router.push('/discover');
  };

  return {
    selectedCategories,
    selectedStatuses,
    country,
    setCountry,
    city,
    setCity,
    postal,
    setPostal,
    radiusKm,
    setRadiusKm,
    handleToggleCategory,
    handleToggleStatus,
    clearFilters,
  };
}
