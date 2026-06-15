import { Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STATUS } from '@/config/database-constants';

type TabType = 'incoming' | 'confirmed' | 'history';
type FilterStatus = 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled';

interface TabConfig {
  id: TabType;
  label: string;
  count?: number;
}

interface BookingTabsProps {
  tabs: TabConfig[];
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  filterStatus: FilterStatus;
  onFilterChange: (status: FilterStatus) => void;
}

export default function BookingTabs({
  tabs,
  activeTab,
  onTabChange,
  filterStatus,
  onFilterChange,
}: BookingTabsProps) {
  return (
    <>
      <div className="border-b border-default mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap',
                activeTab === tab.id
                  ? 'border-fg-primary text-fg-primary'
                  : 'border-transparent text-fg-secondary hover:text-fg-primary hover:border-strong dark:hover:border-default'
              )}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={cn(
                    'ml-2 py-0.5 px-2 rounded-full text-xs',
                    activeTab === tab.id
                      ? 'bg-surface-raised text-fg-primary'
                      : 'bg-surface-raised text-fg-secondary'
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'history' && (
        <div className="mb-6 flex items-center gap-2">
          <Filter className="h-4 w-4 text-fg-secondary" />
          <select
            value={filterStatus}
            onChange={e => onFilterChange(e.target.value as FilterStatus)}
            className="text-sm border border-strong dark:bg-surface-raised dark:text-fg-primary rounded-md px-3 py-1.5"
          >
            <option value="all">All</option>
            <option value={STATUS.BOOKINGS.COMPLETED}>Completed</option>
            <option value={STATUS.BOOKINGS.CANCELLED}>Cancelled</option>
          </select>
        </div>
      )}
    </>
  );
}

export type { TabType, FilterStatus, TabConfig };
