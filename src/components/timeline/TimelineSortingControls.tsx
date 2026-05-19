/**
 * TimelineSortingControls Component
 *
 * Renders sorting buttons for timeline feeds.
 */

'use client';

import Button from '@/components/ui/Button';
import { TrendingUp, Clock, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TIMELINE_SURFACE } from '@/config/timeline';

interface TimelineSortingControlsProps {
  sortBy: 'recent' | 'trending' | 'popular';
  onSortChange: (sort: 'recent' | 'trending' | 'popular') => void;
}

export function TimelineSortingControls({ sortBy, onSortChange }: TimelineSortingControlsProps) {
  return (
    <div className="flex gap-1">
      <Button
        variant={sortBy === 'trending' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => onSortChange('trending')}
        className={cn(TIMELINE_SURFACE.chip, sortBy === 'trending' && TIMELINE_SURFACE.chipActive)}
      >
        <TrendingUp className="w-4 h-4 mr-1" />
        Trending
      </Button>
      <Button
        variant={sortBy === 'recent' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => onSortChange('recent')}
        className={cn(TIMELINE_SURFACE.chip, sortBy === 'recent' && TIMELINE_SURFACE.chipActive)}
      >
        <Clock className="w-4 h-4 mr-1" />
        Recent
      </Button>
      <Button
        variant={sortBy === 'popular' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => onSortChange('popular')}
        className={cn(TIMELINE_SURFACE.chip, sortBy === 'popular' && TIMELINE_SURFACE.chipActive)}
      >
        <Flame className="w-4 h-4 mr-1" />
        Popular
      </Button>
    </div>
  );
}
