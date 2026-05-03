'use client';

import { useEffect } from 'react';
import type { useRouter, useSearchParams } from 'next/navigation';
import type { SortOption } from '@/services/search';
import type { DiscoverTabType } from '@/components/discover/DiscoverTabs';

interface UseDiscoverUrlSyncOptions {
  activeTab: DiscoverTabType;
  searchTerm: string;
  selectedCategories: string[];
  sortBy: SortOption;
  country: string;
  city: string;
  postal: string;
  radiusKm: number;
  router: ReturnType<typeof useRouter>;
  searchParams: ReturnType<typeof useSearchParams>;
}

export function useDiscoverUrlSync({
  activeTab,
  searchTerm,
  selectedCategories,
  sortBy,
  country,
  city,
  postal,
  radiusKm,
  router,
  searchParams,
}: UseDiscoverUrlSyncOptions) {
  useEffect(() => {
    const p = new URLSearchParams(searchParams?.toString() || '');
    if (activeTab !== 'all') {
      p.set('type', activeTab);
    } else {
      p.delete('type');
    }
    if (searchTerm) {
      p.set('search', searchTerm);
    } else {
      p.delete('search');
    }
    if (selectedCategories.length > 0) {
      p.set('category', selectedCategories.join(','));
    } else {
      p.delete('category');
    }
    if (sortBy !== 'recent') {
      p.set('sort', sortBy);
    } else {
      p.delete('sort');
    }
    if (country) {
      p.set('country', country);
    } else {
      p.delete('country');
    }
    if (city) {
      p.set('city', city);
    } else {
      p.delete('city');
    }
    if (postal) {
      p.set('postal', postal);
    } else {
      p.delete('postal');
    }
    if (radiusKm) {
      p.set('radius_km', String(radiusKm));
    } else {
      p.delete('radius_km');
    }
    const newUrl = `/discover?${p.toString()}`;
    const currentUrl = searchParams ? `/discover?${searchParams.toString()}` : '/discover';
    if (newUrl !== currentUrl) {
      router.replace(newUrl, { scroll: false });
    }
  }, [
    activeTab,
    searchTerm,
    selectedCategories,
    sortBy,
    country,
    city,
    postal,
    radiusKm,
    router,
    searchParams,
  ]);
}
