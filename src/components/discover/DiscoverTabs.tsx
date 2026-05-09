'use client';

import { motion } from 'framer-motion';
import { Grid3X3, Users } from 'lucide-react';
import { ENTITY_REGISTRY } from '@/config/entity-registry';
import type { EntityType } from '@/config/entity-registry';
import { BADGE_COLORS } from '@/config/badge-colors';

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
    <div className="border-b border-gray-200 bg-white/80 backdrop-blur-sm rounded-t-2xl sticky top-0 z-10 overflow-x-auto">
      <nav className="-mb-px flex space-x-6 px-6 pt-4 min-w-max" aria-label="Tabs">
        {tabs.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          const count = id === 'all' ? allCount : counts[id] || 0;

          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`
                group relative inline-flex items-center gap-2 px-1 py-3 text-sm font-medium
                transition-colors duration-200
                ${
                  isActive
                    ? 'text-orange-600'
                    : 'text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }
              `}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Icon */}
              <span
                className={`
                transition-colors duration-200
                ${isActive ? 'text-orange-600' : 'text-gray-400 group-hover:text-gray-600'}
              `}
              >
                <Icon className="w-4 h-4" />
              </span>

              {/* Label */}
              <span>{label}</span>

              {/* Count Badge */}
              {!loading && count > 0 && (
                <span
                  className={`
                    inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full
                    transition-colors duration-200
                    ${
                      isActive
                        ? `border ${BADGE_COLORS.orange}`
                        : 'bg-gray-100 text-gray-600 border border-gray-200 group-hover:bg-gray-200'
                    }
                  `}
                >
                  {count}
                </span>
              )}

              {/* Active indicator line */}
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-tiffany-500"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
