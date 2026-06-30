'use client';

import { Grid3X3, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ENTITY_REGISTRY } from '@/config/entity-registry';
import type { EntityType } from '@/config/entity-registry';

export type DiscoverTabType =
  | 'all'
  | 'projects'
  | 'profiles'
  | 'loans'
  | 'investments'
  | 'assets'
  | 'causes'
  | 'events'
  | 'products'
  | 'services'
  | 'groups'
  | 'wishlists'
  | 'research'
  | 'ai_assistants';

interface DiscoverTabsProps {
  activeTab: DiscoverTabType;
  onTabChange: (tab: DiscoverTabType) => void;
  counts: Partial<Record<DiscoverTabType, number>>;
  loading?: boolean;
}

/** Maps plural discover tab IDs to their singular EntityType in the registry. */
const TAB_TO_ENTITY: Partial<Record<DiscoverTabType, EntityType>> = {
  projects: 'project',
  causes: 'cause',
  investments: 'investment',
  loans: 'loan',
  assets: 'asset',
  products: 'product',
  services: 'service',
  events: 'event',
  groups: 'group',
  wishlists: 'wishlist',
  research: 'research',
  ai_assistants: 'ai_assistant',
};

interface TabConfig {
  id: DiscoverTabType;
  label: string;
  Icon: React.ElementType;
}

const tabs: TabConfig[] = [
  { id: 'all', label: 'All', Icon: Grid3X3 },
  ...(
    [
      'projects',
      'causes',
      'investments',
      'loans',
      'assets',
      'products',
      'services',
      'events',
      'groups',
      'wishlists',
      'research',
      'ai_assistants',
    ] as DiscoverTabType[]
  ).map(id => {
    const meta = ENTITY_REGISTRY[TAB_TO_ENTITY[id]!];
    return { id, label: meta.namePlural, Icon: meta.icon };
  }),
  { id: 'profiles', label: 'People', Icon: Users },
];

export default function DiscoverTabs({
  activeTab,
  onTabChange,
  counts,
  loading = false,
}: DiscoverTabsProps) {
  const allCount = Object.values(counts).reduce((sum, n) => sum + (n || 0), 0);

  return (
    // Wrapping pills, not a horizontally-scrolling row: every entity type stays
    // visible and flows onto more rows on narrow screens (mobile-first). The old
    // overflow-x-auto hid Research / AI Assistants / People behind a scroll.
    <div className="rounded-t-lg border-b border-default bg-surface-base px-4 py-3 sm:px-6">
      <nav className="flex flex-wrap gap-2" aria-label="Filter by type">
        {tabs.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          const count = id === 'all' ? allCount : counts[id] || 0;

          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                isActive
                  ? 'border-fg-primary bg-fg-primary text-fg-inverted'
                  : 'border-default bg-surface-base text-fg-secondary hover:bg-surface-raised hover:text-fg-primary'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span>{label}</span>
              {!loading && count > 0 && (
                <span
                  className={cn(
                    'rounded-full px-1.5 text-xs tabular-nums',
                    isActive
                      ? 'bg-fg-inverted/20 text-fg-inverted'
                      : 'bg-surface-raised text-fg-secondary'
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
