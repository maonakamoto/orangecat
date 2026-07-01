'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import DiscoverTabs from '@/components/discover/DiscoverTabs';
import DiscoverFilters from '@/components/discover/DiscoverFilters';
import DiscoverHero from '@/components/discover/DiscoverHero';
import DiscoverEmptyState from '@/components/discover/DiscoverEmptyState';
import { DiscoverLoadingState } from '@/components/discover/DiscoverLoadingState';
import DiscoverResults from '@/components/discover/DiscoverResults';
import { GRADIENTS } from '@/config/gradients';
import { API_ROUTES } from '@/config/api-routes';
import { useDiscoverState } from './useDiscoverState';

export default function DiscoverPage() {
  const { user: _user } = useAuth();

  const {
    // Search state
    searchTerm,
    searchError,
    loading,
    loansLoading,
    assetsLoading,
    totalResults,
    hasMore,
    isLoadingMore,

    // Data
    projects,
    profiles,
    loans,
    investments,
    assets,
    causes,
    events,
    products,
    services,
    groups,
    wishlists,
    research,
    aiAssistants,
    investmentsLoading,
    genericLoading,
    tabCounts,
    stats,

    // UI state
    activeTab,
    viewMode,
    setViewMode,
    showFilters,
    setShowFilters,
    selectedCategories,
    selectedStatuses,
    sortBy,
    country,
    setCountry,
    city,
    setCity,
    postal,
    setPostal,
    radiusKm,
    setRadiusKm,

    // Derived state
    isEmpty,
    showInitialLoading,
    showEmptyState,
    hasFilters,

    // Handlers
    handleSearch,
    handleSortChange,
    handleToggleCategory,
    handleToggleStatus,
    handleTabChange,
    handleLoadMore,
    clearFilters,
  } = useDiscoverState();

  // The total the page shows as "N results found" — single source for the UI and
  // the demand log below. Mirrors the per-tab handling: useSearch only counts
  // projects/profiles/all; entity tabs add their own loaded lengths.
  const resultsFound =
    (activeTab === 'all' || activeTab === 'projects' || activeTab === 'profiles'
      ? totalResults
      : 0) +
    loans.length +
    investments.length +
    assets.length +
    causes.length +
    events.length +
    products.length +
    services.length +
    groups.length +
    wishlists.length +
    research.length +
    aiAssistants.length;

  // Log each committed search as an aggregate demand signal WITH its true result
  // count — zero/low-result searches are the sharpest unmet-demand signal. This is
  // the single logging point (every committed search lands here, from ⌘K, a direct
  // link, or the in-page box). No PII; deduped per query; only once results settle;
  // sendBeacon survives navigation.
  const loggedSearchRef = useRef<string | null>(null);
  useEffect(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q || showInitialLoading || searchError || loggedSearchRef.current === q) {
      return;
    }
    loggedSearchRef.current = q;
    try {
      const payload = JSON.stringify({ query: q, resultCount: resultsFound });
      const beacon = navigator.sendBeacon?.bind(navigator);
      if (beacon) {
        beacon(API_ROUTES.SEARCH.LOG, new Blob([payload], { type: 'application/json' }));
      } else {
        void fetch(API_ROUTES.SEARCH.LOG, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      /* logging must never disrupt discovery */
    }
  }, [searchTerm, showInitialLoading, searchError, resultsFound]);

  // Shared filter props to avoid duplication between desktop and mobile
  const filterProps = {
    searchTerm,
    onSearchChange: handleSearch,
    loading,
    sortBy,
    onSortChange: handleSortChange,
    viewMode,
    onViewModeChange: setViewMode,
    selectedStatuses,
    onToggleStatus: handleToggleStatus,
    showStatusFilter: activeTab !== 'profiles',
    selectedCategories,
    onToggleCategory: handleToggleCategory,
    showCategoryFilter: activeTab !== 'profiles',
    country,
    onCountryChange: setCountry,
    city,
    onCityChange: setCity,
    postal,
    onPostalChange: setPostal,
    radiusKm,
    onRadiusChange: setRadiusKm,
    onClearFilters: clearFilters,
  };

  return (
    <div className={`min-h-screen ${GRADIENTS.pageBg}`}>
      {/* Hero Section */}
      <DiscoverHero
        totalProjects={stats.totalProjects}
        totalProfiles={stats.totalProfiles}
        totalFinancial={stats.totalFinancial}
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Layout: left vertical sidebar (desktop), content on right */}
        <div className="flex flex-col lg:grid lg:grid-cols-12 lg:gap-6">
          {/* Left Sidebar - always visible on desktop, collapsible on mobile */}
          <aside className="hidden lg:block lg:col-span-3">
            <div className="sticky top-20">
              <div className="bg-surface-base/70 dark:bg-surface-base/70 backdrop-blur-sm rounded-lg border border-default dark:border-default/60 p-5">
                <h3 className="text-lg font-semibold text-fg-primary mb-4">Filters</h3>
                <DiscoverFilters variant="desktop" {...filterProps} />
              </div>
            </div>
          </aside>

          {/* Content column */}
          <div className="w-full lg:col-span-9">
            {/* Tabs */}
            <DiscoverTabs
              activeTab={activeTab}
              onTabChange={handleTabChange}
              counts={tabCounts}
              loading={
                loading || loansLoading || investmentsLoading || assetsLoading || genericLoading
              }
            />

            <div className="bg-surface-base/70 dark:bg-surface-base/70 backdrop-blur-sm rounded-b-lg border border-default dark:border-default/60 border-t-0 p-6">
              {/* Mobile Filter Button */}
              <div className="lg:hidden mb-4">
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="w-full"
                >
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  {showFilters ? 'Hide Filters' : 'Show Filters'}
                </Button>
              </div>

              {/* Mobile Filter Panel */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="lg:hidden mb-6 overflow-hidden"
                  >
                    <div className="bg-surface-base/70 dark:bg-surface-base/70 backdrop-blur-sm rounded-lg border border-default dark:border-default/60 p-5">
                      <DiscoverFilters variant="mobile" {...filterProps} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error State */}
              {searchError && (
                <div className="text-center py-16">
                  <div className="oc-error-surface rounded-lg p-6 max-w-md mx-auto">
                    <p className="text-status-negative font-medium mb-2">Error loading projects</p>
                    <p className="text-status-negative text-sm">{searchError}</p>
                  </div>
                </div>
              )}

              {/* Loading skeleton — shown while fetching and until the first
                  load cycle settles, so a populated platform never flashes the
                  empty state on a slow connection. */}
              {showInitialLoading && (
                <DiscoverLoadingState viewMode={viewMode} activeTab={activeTab} />
              )}

              {/* Empty State — only after a load has genuinely completed empty */}
              {showEmptyState && (
                <DiscoverEmptyState
                  activeTab={activeTab}
                  hasFilters={hasFilters}
                  onClearFilters={clearFilters}
                />
              )}

              {/* Results */}
              {!showInitialLoading && !searchError && !isEmpty && (
                <DiscoverResults
                  activeTab={activeTab}
                  viewMode={viewMode}
                  projects={projects}
                  profiles={profiles}
                  loans={loans}
                  investments={investments}
                  assets={assets}
                  causes={causes}
                  events={events}
                  products={products}
                  services={services}
                  groups={groups}
                  wishlists={wishlists}
                  research={research}
                  aiAssistants={aiAssistants}
                  totalResults={resultsFound}
                  loading={
                    loading || loansLoading || investmentsLoading || assetsLoading || genericLoading
                  }
                  hasMore={hasMore}
                  isLoadingMore={isLoadingMore}
                  onLoadMore={handleLoadMore}
                  onTabChange={handleTabChange}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
