'use client';

import Input from '@/components/ui/Input';
import { Search, X } from 'lucide-react';
import { PROJECT_STATUS } from '@/config/project-statuses';

interface Props {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  showStatusFilter: boolean;
}

export function ProjectsSearchFilter({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  showStatusFilter,
}: Props) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
      <div className="relative flex-1 sm:flex-initial">
        <Search
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-muted-foreground w-4 h-4"
          aria-hidden="true"
        />
        <Input
          type="text"
          placeholder="Search projects..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-10 pr-10 w-full sm:w-48 md:w-64"
          aria-label="Search projects"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-muted-foreground hover:text-gray-600 dark:hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {showStatusFilter && (
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-border rounded-lg text-sm bg-white dark:bg-card text-gray-900 dark:text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent w-full sm:w-auto min-w-[140px]"
          aria-label="Filter by status"
        >
          <option value="all">All Status</option>
          <option value={PROJECT_STATUS.DRAFT}>Draft</option>
          <option value={PROJECT_STATUS.ACTIVE}>Active</option>
          <option value={PROJECT_STATUS.PAUSED}>Paused</option>
          <option value={PROJECT_STATUS.COMPLETED}>Completed</option>
          <option value={PROJECT_STATUS.CANCELLED}>Cancelled</option>
        </select>
      )}
    </div>
  );
}
