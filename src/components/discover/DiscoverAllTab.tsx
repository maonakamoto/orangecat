'use client';

import { Target, Users, DollarSign, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';
import { ProjectCard } from '@/components/entity/variants/ProjectCard';
import ProfileCard from '@/components/ui/ProfileCard';
import { LoanCard } from '@/components/entity/variants/LoanCard';
import { InvestmentCard } from '@/components/entity/variants/InvestmentCard';
import {
  GenericPublicCard,
  type GenericPublicEntity,
} from '@/components/entity/variants/GenericPublicCard';
import ResultsSection from '@/components/discover/ResultsSection';
import type { SearchFundingPage, SearchProfile } from '@/services/search';
import type { DiscoverTabType } from './DiscoverTabs';
import type { Loan } from '@/types/loans';
import type { Investment } from '@/types/investments';
import type { EntityType } from '@/config/entity-registry';
import { AnimatedGrid, type ViewMode } from './AnimatedGrid';

type AllSection = {
  id: string;
  title: string;
  icon: ReactNode;
  count: number;
  tabType: DiscoverTabType;
  renderContent: () => ReactNode;
};

interface DiscoverAllTabProps {
  genericTabs: Array<{
    id: DiscoverTabType;
    title: string;
    icon: ReactNode;
    items: GenericPublicEntity[];
    entityType: EntityType;
    makeHref: (e: GenericPublicEntity) => string;
  }>;
  projects: SearchFundingPage[];
  investments: Investment[];
  loans: Loan[];
  profiles: SearchProfile[];
  viewMode: ViewMode;
  resultsHeader: ReactNode;
  onTabChange: (tab: DiscoverTabType) => void;
}

export function DiscoverAllTab({
  genericTabs,
  projects,
  investments,
  loans,
  profiles,
  viewMode,
  resultsHeader,
  onTabChange,
}: DiscoverAllTabProps) {
  const genericSections: AllSection[] = genericTabs.map(t => ({
    id: t.id,
    title: t.title,
    icon: t.icon,
    count: t.items.length,
    tabType: t.id,
    renderContent: () => (
      <AnimatedGrid
        items={t.items.slice(0, 6)}
        viewMode={viewMode}
        renderItem={item => (
          <GenericPublicCard
            entity={item}
            entityType={t.entityType}
            href={t.makeHref(item)}
            viewMode={viewMode}
          />
        )}
      />
    ),
  }));

  const allSections: AllSection[] = [
    {
      id: 'projects',
      title: 'Projects',
      tabType: 'projects',
      icon: <Target className="w-5 h-5" />,
      count: projects.length,
      renderContent: () => (
        <AnimatedGrid
          items={projects.slice(0, 6)}
          viewMode={viewMode}
          renderItem={item => <ProjectCard project={item} />}
        />
      ),
    },
    ...genericSections,
    {
      id: 'investments',
      title: 'Investments',
      tabType: 'investments',
      icon: <TrendingUp className="w-5 h-5" />,
      count: investments.length,
      renderContent: () => (
        <AnimatedGrid
          items={investments.slice(0, 6)}
          viewMode={viewMode}
          renderItem={item => <InvestmentCard investment={item} viewMode={viewMode} />}
        />
      ),
    },
    {
      id: 'loans',
      title: 'Loans',
      tabType: 'loans',
      icon: <DollarSign className="w-5 h-5" />,
      count: loans.length,
      renderContent: () => (
        <AnimatedGrid
          items={loans.slice(0, 6)}
          viewMode={viewMode}
          renderItem={item => <LoanCard loan={item} viewMode={viewMode} />}
        />
      ),
    },
    {
      id: 'profiles',
      title: 'People',
      tabType: 'profiles',
      icon: <Users className="w-5 h-5" />,
      count: profiles.length,
      renderContent: () => (
        <AnimatedGrid
          items={profiles.slice(0, 6)}
          viewMode={viewMode}
          renderItem={item => <ProfileCard profile={item} viewMode={viewMode} />}
        />
      ),
    },
  ];

  const hasMultipleSections = allSections.filter(s => s.count > 0).length > 1;

  return (
    <div className="space-y-8">
      {resultsHeader}
      {allSections
        .filter(s => s.count > 0)
        .map(section => (
          <ResultsSection
            key={section.id}
            title={section.title}
            count={section.count}
            icon={section.icon}
            onViewAll={() => onTabChange(section.tabType)}
            showViewAll={hasMultipleSections}
            viewAllLabel={`View All ${section.title}`}
          >
            {section.renderContent()}
          </ResultsSection>
        ))}
    </div>
  );
}
