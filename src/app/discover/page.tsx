'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import DiscoverTabs from '@/components/discover/DiscoverTabs';
import DiscoverFilters from '@/components/discover/DiscoverFilters';
import DiscoverHero from '@/components/discover/DiscoverHero';
import DiscoverEmptyState from '@/components/discover/DiscoverEmptyState';
import DiscoverResults from '@/components/discover/DiscoverResults';
import { GRADIENTS } from '@/config/gradients';
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
    totalInvestmentsCount,
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
              <div className="bg-card/70 dark:bg-card/70 backdrop-blur-sm rounded-lg border border-border dark:border-border/60 p-5">
                <h3 className="text-lg font-semibold text-foreground mb-4">Filters</h3>
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
              counts={{
                projects: projects.length,
                profiles: profiles.length,
                loans: loans.length,
                investments: investments.length || totalInvestmentsCount,
                assets: assets.length,
                causes: causes.length,
                events: events.length,
                products: products.length,
                services: services.length,
                groups: groups.length,
                wishlists: wishlists.length,
                research: research.length,
                ai_assistants: aiAssistants.length,
              }}
              loading={
                loading || loansLoading || investmentsLoading || assetsLoading || genericLoading
              }
            />

            <div className="bg-card/70 dark:bg-card/70 backdrop-blur-sm rounded-b-lg border border-border dark:border-border/60 border-t-0 p-6">
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
                    <div className="bg-card/70 dark:bg-card/70 backdrop-blur-sm rounded-lg border border-border dark:border-border/60 p-5">
                      <DiscoverFilters variant="mobile" {...filterProps} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error State */}
              {searchError && (
                <div className="text-center py-16">
                  <div className="oc-error-surface rounded-lg p-6 max-w-md mx-auto">
                    <p className="text-destructive font-medium mb-2">Error loading projects</p>
                    <p className="text-destructive text-sm">{searchError}</p>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!loading &&
                !loansLoading &&
                !investmentsLoading &&
                !assetsLoading &&
                !genericLoading &&
                !searchError &&
                isEmpty && (
                  <DiscoverEmptyState
                    activeTab={activeTab}
                    hasFilters={hasFilters}
                    onClearFilters={clearFilters}
                  />
                )}

              {/* Results */}
              {!loading &&
                !loansLoading &&
                !investmentsLoading &&
                !assetsLoading &&
                !genericLoading &&
                !searchError &&
                !isEmpty && (
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
                    totalResults={
                      totalResults +
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
                      aiAssistants.length
                    }
                    loading={
                      loading ||
                      loansLoading ||
                      investmentsLoading ||
                      assetsLoading ||
                      genericLoading
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
