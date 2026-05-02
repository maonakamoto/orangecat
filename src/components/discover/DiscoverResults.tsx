'use client';

import { motion } from 'framer-motion';
import {
  ArrowUpDown,
  Loader2,
  Target,
  Users,
  DollarSign,
  TrendingUp,
  Gift,
  FlaskConical,
  Bot,
  Building,
  Heart,
  Package,
  Briefcase,
  Calendar,
  Building2,
} from 'lucide-react';
import type { ReactNode } from 'react';
import Button from '@/components/ui/Button';
import { ProjectCard } from '@/components/entity/variants/ProjectCard';
import ProfileCard from '@/components/ui/ProfileCard';
import {
  ProjectCardSkeleton,
  ProfileCardSkeleton,
  LoanCardSkeleton,
} from '@/components/ui/Skeleton';
import ResultsSection from '@/components/discover/ResultsSection';
import { LoanCard } from '@/components/entity/variants/LoanCard';
import { InvestmentCard } from '@/components/entity/variants/InvestmentCard';
import {
  GenericPublicCard,
  type GenericPublicEntity,
} from '@/components/entity/variants/GenericPublicCard';
import type { SearchFundingPage, SearchProfile } from '@/services/search';
import type { DiscoverTabType } from '@/components/discover/DiscoverTabs';
import type { Loan } from '@/types/loans';
import type { Investment } from '@/types/investments';
import type { EntityType } from '@/config/entity-registry';
import { ROUTES } from '@/config/routes';

type ViewMode = 'grid' | 'list';

interface DiscoverResultsProps {
  activeTab: DiscoverTabType;
  viewMode: ViewMode;
  projects: SearchFundingPage[];
  profiles: SearchProfile[];
  loans?: Loan[];
  investments?: Investment[];
  assets?: GenericPublicEntity[];
  causes?: GenericPublicEntity[];
  events?: GenericPublicEntity[];
  products?: GenericPublicEntity[];
  services?: GenericPublicEntity[];
  groups?: GenericPublicEntity[];
  wishlists?: GenericPublicEntity[];
  research?: GenericPublicEntity[];
  aiAssistants?: GenericPublicEntity[];
  totalResults: number;
  loading: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  onTabChange: (tab: DiscoverTabType) => void;
}

// Single generic grid with animation — replaces 4 near-identical grid components.
function AnimatedGrid<T extends { id: string }>({
  items,
  viewMode,
  renderItem,
}: {
  items: T[];
  viewMode: ViewMode;
  renderItem: (item: T) => ReactNode;
}) {
  return (
    <div
      className={`grid gap-6 ${
        viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'
      }`}
    >
      {items.map((item, index) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: index * 0.05 }}
        >
          {renderItem(item)}
        </motion.div>
      ))}
    </div>
  );
}

export default function DiscoverResults({
  activeTab,
  viewMode,
  projects,
  profiles,
  loans = [],
  investments = [],
  assets = [],
  causes = [],
  events = [],
  products = [],
  services = [],
  groups = [],
  wishlists = [],
  research = [],
  aiAssistants = [],
  totalResults,
  loading,
  hasMore,
  isLoadingMore,
  onLoadMore,
  onTabChange,
}: DiscoverResultsProps) {
  // Config for the 9 generic entity tab types — drives both 'all' sections and individual tabs.
  const genericTabs: Array<{
    id: DiscoverTabType;
    title: string;
    icon: ReactNode;
    items: GenericPublicEntity[];
    entityType: EntityType;
    makeHref: (e: GenericPublicEntity) => string;
  }> = [
    {
      id: 'causes',
      title: 'Causes',
      icon: <Heart className="w-5 h-5" />,
      items: causes,
      entityType: 'cause',
      makeHref: e => ROUTES.CAUSES.VIEW(e.id),
    },
    {
      id: 'assets',
      title: 'Assets',
      icon: <Building className="w-5 h-5" />,
      items: assets,
      entityType: 'asset',
      makeHref: e => ROUTES.ASSETS.VIEW(e.id),
    },
    {
      id: 'products',
      title: 'Products',
      icon: <Package className="w-5 h-5" />,
      items: products,
      entityType: 'product',
      makeHref: e => ROUTES.PRODUCTS.VIEW(e.id),
    },
    {
      id: 'services',
      title: 'Services',
      icon: <Briefcase className="w-5 h-5" />,
      items: services,
      entityType: 'service',
      makeHref: e => ROUTES.SERVICES.VIEW(e.id),
    },
    {
      id: 'events',
      title: 'Events',
      icon: <Calendar className="w-5 h-5" />,
      items: events,
      entityType: 'event',
      makeHref: e => ROUTES.EVENTS.VIEW(e.id),
    },
    {
      id: 'groups',
      title: 'Groups',
      icon: <Building2 className="w-5 h-5" />,
      items: groups,
      entityType: 'group',
      makeHref: e => ROUTES.GROUPS.VIEW(e.slug ?? e.id),
    },
    {
      id: 'wishlists',
      title: 'Wishlists',
      icon: <Gift className="w-5 h-5" />,
      items: wishlists,
      entityType: 'wishlist',
      makeHref: e => ROUTES.WISHLISTS.VIEW(e.id),
    },
    {
      id: 'research',
      title: 'Research',
      icon: <FlaskConical className="w-5 h-5" />,
      items: research,
      entityType: 'research',
      makeHref: e => ROUTES.RESEARCH.VIEW(e.id),
    },
    {
      id: 'ai_assistants',
      title: 'AI Assistants',
      icon: <Bot className="w-5 h-5" />,
      items: aiAssistants,
      entityType: 'ai_assistant',
      makeHref: e => ROUTES.AI_ASSISTANTS.VIEW(e.id),
    },
  ];

  // Loading State
  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        </div>
        <div
          className={`grid gap-6 ${
            viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'
          }`}
        >
          {activeTab === 'profiles' ? (
            Array.from({ length: 6 }).map((_, i) => (
              <ProfileCardSkeleton key={i} viewMode={viewMode} />
            ))
          ) : activeTab === 'projects' ? (
            Array.from({ length: 6 }).map((_, i) => <ProjectCardSkeleton key={i} />)
          ) : activeTab === 'loans' || activeTab === 'investments' ? (
            Array.from({ length: 6 }).map((_, i) => (
              <LoanCardSkeleton key={i} viewMode={viewMode} />
            ))
          ) : (
            <>
              {Array.from({ length: 2 }).map((_, i) => (
                <ProjectCardSkeleton key={`project-${i}`} />
              ))}
              {Array.from({ length: 2 }).map((_, i) => (
                <ProfileCardSkeleton key={`profile-${i}`} viewMode={viewMode} />
              ))}
              {Array.from({ length: 2 }).map((_, i) => (
                <LoanCardSkeleton key={`loan-${i}`} viewMode={viewMode} />
              ))}
            </>
          )}
        </div>
      </div>
    );
  }

  const displayedCount =
    projects.length +
    profiles.length +
    loans.length +
    investments.length +
    genericTabs.reduce((sum, t) => sum + t.items.length, 0);

  const resultsHeader = (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-2xl font-semibold text-gray-900">
        {totalResults > 0 ? (
          <>
            {totalResults} result{totalResults !== 1 ? 's' : ''} found
            {displayedCount < totalResults && (
              <span className="text-gray-500 text-lg font-normal ml-2">
                (showing {displayedCount})
              </span>
            )}
          </>
        ) : (
          'No results found'
        )}
      </h2>
    </div>
  );

  const LoadMoreButton = ({ label }: { label: string }) => (
    <div className="mt-8 flex justify-center">
      <Button
        onClick={onLoadMore}
        disabled={isLoadingMore}
        variant="outline"
        size="lg"
        className="min-w-[200px]"
      >
        {isLoadingMore ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Loading...
          </>
        ) : (
          <>
            {label}
            <ArrowUpDown className="w-4 h-4 ml-2" />
          </>
        )}
      </Button>
    </div>
  );

  // All Tab
  if (activeTab === 'all') {
    const sectionCounts = [
      projects.length,
      profiles.length,
      loans.length,
      investments.length,
      ...genericTabs.map(t => t.items.length),
    ];
    const hasMultipleSections = sectionCounts.filter(n => n > 0).length > 1;

    return (
      <div className="space-y-8">
        {resultsHeader}
        {projects.length > 0 && (
          <ResultsSection
            title="Projects"
            count={projects.length}
            icon={<Target className="w-5 h-5" />}
            onViewAll={() => onTabChange('projects')}
            showViewAll={hasMultipleSections}
            viewAllLabel="View All Projects"
          >
            <AnimatedGrid
              items={projects.slice(0, 6)}
              viewMode={viewMode}
              renderItem={item => <ProjectCard project={item} />}
            />
          </ResultsSection>
        )}
        {causes.length > 0 && (
          <ResultsSection
            title="Causes"
            count={causes.length}
            icon={<Heart className="w-5 h-5" />}
            onViewAll={() => onTabChange('causes')}
            showViewAll={hasMultipleSections}
            viewAllLabel="View All Causes"
          >
            <AnimatedGrid
              items={causes.slice(0, 6)}
              viewMode={viewMode}
              renderItem={item => (
                <GenericPublicCard
                  entity={item}
                  entityType="cause"
                  href={ROUTES.CAUSES.VIEW(item.id)}
                  viewMode={viewMode}
                />
              )}
            />
          </ResultsSection>
        )}
        {investments.length > 0 && (
          <ResultsSection
            title="Investments"
            count={investments.length}
            icon={<TrendingUp className="w-5 h-5" />}
            onViewAll={() => onTabChange('investments')}
            showViewAll={hasMultipleSections}
            viewAllLabel="View All Investments"
          >
            <AnimatedGrid
              items={investments.slice(0, 6)}
              viewMode={viewMode}
              renderItem={item => <InvestmentCard investment={item} viewMode={viewMode} />}
            />
          </ResultsSection>
        )}
        {assets.length > 0 && (
          <ResultsSection
            title="Assets"
            count={assets.length}
            icon={<Building className="w-5 h-5" />}
            onViewAll={() => onTabChange('assets')}
            showViewAll={hasMultipleSections}
            viewAllLabel="View All Assets"
          >
            <AnimatedGrid
              items={assets.slice(0, 6)}
              viewMode={viewMode}
              renderItem={item => (
                <GenericPublicCard
                  entity={item}
                  entityType="asset"
                  href={ROUTES.ASSETS.VIEW(item.id)}
                  viewMode={viewMode}
                />
              )}
            />
          </ResultsSection>
        )}
        {loans.length > 0 && (
          <ResultsSection
            title="Loans"
            count={loans.length}
            icon={<DollarSign className="w-5 h-5" />}
            onViewAll={() => onTabChange('loans')}
            showViewAll={hasMultipleSections}
            viewAllLabel="View All Loans"
          >
            <AnimatedGrid
              items={loans.slice(0, 6)}
              viewMode={viewMode}
              renderItem={item => <LoanCard loan={item} viewMode={viewMode} />}
            />
          </ResultsSection>
        )}
        {products.length > 0 && (
          <ResultsSection
            title="Products"
            count={products.length}
            icon={<Package className="w-5 h-5" />}
            onViewAll={() => onTabChange('products')}
            showViewAll={hasMultipleSections}
            viewAllLabel="View All Products"
          >
            <AnimatedGrid
              items={products.slice(0, 6)}
              viewMode={viewMode}
              renderItem={item => (
                <GenericPublicCard
                  entity={item}
                  entityType="product"
                  href={ROUTES.PRODUCTS.VIEW(item.id)}
                  viewMode={viewMode}
                />
              )}
            />
          </ResultsSection>
        )}
        {services.length > 0 && (
          <ResultsSection
            title="Services"
            count={services.length}
            icon={<Briefcase className="w-5 h-5" />}
            onViewAll={() => onTabChange('services')}
            showViewAll={hasMultipleSections}
            viewAllLabel="View All Services"
          >
            <AnimatedGrid
              items={services.slice(0, 6)}
              viewMode={viewMode}
              renderItem={item => (
                <GenericPublicCard
                  entity={item}
                  entityType="service"
                  href={ROUTES.SERVICES.VIEW(item.id)}
                  viewMode={viewMode}
                />
              )}
            />
          </ResultsSection>
        )}
        {events.length > 0 && (
          <ResultsSection
            title="Events"
            count={events.length}
            icon={<Calendar className="w-5 h-5" />}
            onViewAll={() => onTabChange('events')}
            showViewAll={hasMultipleSections}
            viewAllLabel="View All Events"
          >
            <AnimatedGrid
              items={events.slice(0, 6)}
              viewMode={viewMode}
              renderItem={item => (
                <GenericPublicCard
                  entity={item}
                  entityType="event"
                  href={ROUTES.EVENTS.VIEW(item.id)}
                  viewMode={viewMode}
                />
              )}
            />
          </ResultsSection>
        )}
        {groups.length > 0 && (
          <ResultsSection
            title="Groups"
            count={groups.length}
            icon={<Building2 className="w-5 h-5" />}
            onViewAll={() => onTabChange('groups')}
            showViewAll={hasMultipleSections}
            viewAllLabel="View All Groups"
          >
            <AnimatedGrid
              items={groups.slice(0, 6)}
              viewMode={viewMode}
              renderItem={item => (
                <GenericPublicCard
                  entity={item}
                  entityType="group"
                  href={ROUTES.GROUPS.VIEW(item.slug ?? item.id)}
                  viewMode={viewMode}
                />
              )}
            />
          </ResultsSection>
        )}
        {wishlists.length > 0 && (
          <ResultsSection
            title="Wishlists"
            count={wishlists.length}
            icon={<Gift className="w-5 h-5" />}
            onViewAll={() => onTabChange('wishlists')}
            showViewAll={hasMultipleSections}
            viewAllLabel="View All Wishlists"
          >
            <AnimatedGrid
              items={wishlists.slice(0, 6)}
              viewMode={viewMode}
              renderItem={item => (
                <GenericPublicCard
                  entity={item}
                  entityType="wishlist"
                  href={ROUTES.WISHLISTS.VIEW(item.id)}
                  viewMode={viewMode}
                />
              )}
            />
          </ResultsSection>
        )}
        {research.length > 0 && (
          <ResultsSection
            title="Research"
            count={research.length}
            icon={<FlaskConical className="w-5 h-5" />}
            onViewAll={() => onTabChange('research')}
            showViewAll={hasMultipleSections}
            viewAllLabel="View All Research"
          >
            <AnimatedGrid
              items={research.slice(0, 6)}
              viewMode={viewMode}
              renderItem={item => (
                <GenericPublicCard
                  entity={item}
                  entityType="research"
                  href={ROUTES.RESEARCH.VIEW(item.id)}
                  viewMode={viewMode}
                />
              )}
            />
          </ResultsSection>
        )}
        {aiAssistants.length > 0 && (
          <ResultsSection
            title="AI Assistants"
            count={aiAssistants.length}
            icon={<Bot className="w-5 h-5" />}
            onViewAll={() => onTabChange('ai_assistants')}
            showViewAll={hasMultipleSections}
            viewAllLabel="View All AI Assistants"
          >
            <AnimatedGrid
              items={aiAssistants.slice(0, 6)}
              viewMode={viewMode}
              renderItem={item => (
                <GenericPublicCard
                  entity={item}
                  entityType="ai_assistant"
                  href={ROUTES.AI_ASSISTANTS.VIEW(item.id)}
                  viewMode={viewMode}
                />
              )}
            />
          </ResultsSection>
        )}
        {profiles.length > 0 && (
          <ResultsSection
            title="People"
            count={profiles.length}
            icon={<Users className="w-5 h-5" />}
            onViewAll={() => onTabChange('profiles')}
            showViewAll={hasMultipleSections}
            viewAllLabel="View All People"
          >
            <AnimatedGrid
              items={profiles.slice(0, 6)}
              viewMode={viewMode}
              renderItem={item => <ProfileCard profile={item} viewMode={viewMode} />}
            />
          </ResultsSection>
        )}
      </div>
    );
  }

  // Individual tab — investments
  if (activeTab === 'investments') {
    return (
      <>
        {resultsHeader}
        <AnimatedGrid
          items={investments}
          viewMode={viewMode}
          renderItem={item => <InvestmentCard investment={item} viewMode={viewMode} />}
        />
        {hasMore && <LoadMoreButton label="Load More Investments" />}
      </>
    );
  }

  // Individual tab — loans
  if (activeTab === 'loans') {
    return (
      <>
        {resultsHeader}
        <AnimatedGrid
          items={loans}
          viewMode={viewMode}
          renderItem={item => <LoanCard loan={item} viewMode={viewMode} />}
        />
        {hasMore && <LoadMoreButton label="Load More Loans" />}
      </>
    );
  }

  // Individual tab — projects
  if (activeTab === 'projects') {
    return (
      <>
        {resultsHeader}
        <AnimatedGrid
          items={projects}
          viewMode={viewMode}
          renderItem={item => <ProjectCard project={item} />}
        />
        {hasMore && <LoadMoreButton label="Load More Projects" />}
      </>
    );
  }

  // Individual tab — profiles
  if (activeTab === 'profiles') {
    return (
      <>
        {resultsHeader}
        <AnimatedGrid
          items={profiles}
          viewMode={viewMode}
          renderItem={item => <ProfileCard profile={item} viewMode={viewMode} />}
        />
        {hasMore && <LoadMoreButton label="Load More People" />}
      </>
    );
  }

  // Individual tab — all 9 generic entity types via config lookup
  const genericTab = genericTabs.find(t => t.id === activeTab);
  if (genericTab) {
    return (
      <>
        {resultsHeader}
        <AnimatedGrid
          items={genericTab.items}
          viewMode={viewMode}
          renderItem={item => (
            <GenericPublicCard
              entity={item}
              entityType={genericTab.entityType}
              href={genericTab.makeHref(item)}
              viewMode={viewMode}
            />
          )}
        />
        {hasMore && <LoadMoreButton label={`Load More ${genericTab.title}`} />}
      </>
    );
  }

  return null;
}
