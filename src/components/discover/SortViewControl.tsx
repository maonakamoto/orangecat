'use client';

import { Grid3X3, List } from 'lucide-react';
import Button from '@/components/ui/Button';
import { SortOption } from '@/services/search';

export type ViewMode = 'grid' | 'list';

interface SortViewControlProps {
  isMobile: boolean;
  sortBy: SortOption;
  onSortChange: (value: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

const SELECT_CLASS =
  'w-full px-3 py-2 bg-white/80 dark:bg-muted border border-gray-200/80 dark:border-border rounded-xl text-sm dark:text-foreground';
const LABEL_CLASS = 'block text-sm font-medium text-gray-700 dark:text-foreground mb-2';
const VIEW_WRAP_CLASS =
  'bg-white/80 dark:bg-muted backdrop-blur-sm rounded-xl border border-gray-200/80 dark:border-border p-1 flex gap-1';

export function SortViewControl({
  isMobile,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
}: SortViewControlProps) {
  const sortSelect = (
    <select value={sortBy} onChange={e => onSortChange(e.target.value)} className={SELECT_CLASS}>
      <option value="recent">Newest</option>
      <option value="relevance">Relevance</option>
    </select>
  );

  const viewButtons = (
    <div className={VIEW_WRAP_CLASS}>
      <Button
        variant={viewMode === 'grid' ? 'primary' : 'ghost'}
        size="sm"
        onClick={() => onViewModeChange('grid')}
        className="flex-1 h-8"
      >
        <Grid3X3 className={`w-4 h-4${isMobile ? '' : ' mr-1'}`} />
        {!isMobile && 'Grid'}
      </Button>
      <Button
        variant={viewMode === 'list' ? 'primary' : 'ghost'}
        size="sm"
        onClick={() => onViewModeChange('list')}
        className="flex-1 h-8"
      >
        <List className={`w-4 h-4${isMobile ? '' : ' mr-1'}`} />
        {!isMobile && 'List'}
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className={LABEL_CLASS}>Sort</label>
          {sortSelect}
        </div>
        <div>
          <label className={LABEL_CLASS}>View</label>
          {viewButtons}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <label className={LABEL_CLASS}>Sort by</label>
        {sortSelect}
      </div>
      <div className="mb-6">
        <label className={LABEL_CLASS}>View</label>
        {viewButtons}
      </div>
    </>
  );
}
