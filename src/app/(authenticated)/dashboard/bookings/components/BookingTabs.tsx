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
      <div className="border-b border-gray-200 dark:border-border mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap',
                activeTab === tab.id
                  ? 'border-tiffany-500 text-tiffany-600'
                  : 'border-transparent text-gray-500 dark:text-muted-foreground hover:text-gray-700 dark:hover:text-foreground hover:border-gray-300 dark:hover:border-border'
              )}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={cn(
                    'ml-2 py-0.5 px-2 rounded-full text-xs',
                    activeTab === tab.id
                      ? 'bg-tiffany-100 text-tiffany-600'
                      : 'bg-gray-100 dark:bg-muted text-gray-600 dark:text-muted-foreground'
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
          <Filter className="h-4 w-4 text-gray-500 dark:text-muted-foreground" />
          <select
            value={filterStatus}
            onChange={e => onFilterChange(e.target.value as FilterStatus)}
            className="text-sm border border-gray-300 dark:border-border dark:bg-muted dark:text-foreground rounded-md px-3 py-1.5"
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
