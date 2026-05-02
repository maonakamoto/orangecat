'use client';

import { motion } from 'framer-motion';
import {
  Target,
  Users,
  Grid3X3,
  DollarSign,
  TrendingUp,
  Heart,
  Package,
  Briefcase,
  Calendar,
  Building2,
  Gift,
  FlaskConical,
  Bot,
  Building,
} from 'lucide-react';

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

interface TabConfig {
  id: DiscoverTabType;
  label: string;
  icon: React.ReactNode;
}

const tabs: TabConfig[] = [
  { id: 'all', label: 'All', icon: <Grid3X3 className="w-4 h-4" /> },
  { id: 'projects', label: 'Projects', icon: <Target className="w-4 h-4" /> },
  { id: 'causes', label: 'Causes', icon: <Heart className="w-4 h-4" /> },
  { id: 'investments', label: 'Investments', icon: <TrendingUp className="w-4 h-4" /> },
  { id: 'loans', label: 'Loans', icon: <DollarSign className="w-4 h-4" /> },
  { id: 'assets', label: 'Assets', icon: <Building className="w-4 h-4" /> },
  { id: 'products', label: 'Products', icon: <Package className="w-4 h-4" /> },
  { id: 'services', label: 'Services', icon: <Briefcase className="w-4 h-4" /> },
  { id: 'events', label: 'Events', icon: <Calendar className="w-4 h-4" /> },
  { id: 'groups', label: 'Groups', icon: <Building2 className="w-4 h-4" /> },
  { id: 'wishlists', label: 'Wishlists', icon: <Gift className="w-4 h-4" /> },
  { id: 'research', label: 'Research', icon: <FlaskConical className="w-4 h-4" /> },
  { id: 'ai_assistants', label: 'AI Assistants', icon: <Bot className="w-4 h-4" /> },
  { id: 'profiles', label: 'People', icon: <Users className="w-4 h-4" /> },
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
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          const count = tab.id === 'all' ? allCount : counts[tab.id] || 0;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
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
                {tab.icon}
              </span>

              {/* Label */}
              <span>{tab.label}</span>

              {/* Count Badge */}
              {!loading && count > 0 && (
                <span
                  className={`
                    inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full
                    transition-colors duration-200
                    ${
                      isActive
                        ? 'bg-orange-100 text-orange-700 border border-orange-200'
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
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600"
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
