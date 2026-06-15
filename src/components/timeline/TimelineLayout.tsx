import React from 'react';
import { LucideIcon } from 'lucide-react';
import { TimelineFeedResponse, TimelineDisplayEvent } from '@/types/timeline';
import TimelineComponent from './TimelineComponent';
import { cn } from '@/lib/utils';
import { TIMELINE_SURFACE } from '@/config/timeline';

export interface TimelineLayoutProps {
  title: string;
  description: string;
  icon: LucideIcon;
  feed: TimelineFeedResponse;
  onEventUpdate: (eventId: string, updates: Partial<TimelineDisplayEvent>) => void;
  onLoadMore: () => void;
  isLoadingMore?: boolean;
  stats?: {
    totalPosts: number;
    totalLikes: number;
    totalComments: number;
    totalFollowers?: number;
  };
  showFilters?: boolean;
  compact?: boolean;
  enableMultiSelect?: boolean; // Enable multi-select mode for bulk operations
  additionalHeaderContent?: React.ReactNode;
  emptyState?: React.ReactNode;
  postComposer?: React.ReactNode;
  inlineComposer?: React.ReactNode;
}

/**
 * Reusable Timeline Layout Component
 *
 * DRY-compliant layout for timeline-based pages (Journey, Community, etc.)
 * Provides consistent styling, structure, and behavior across all timeline views.
 */
export default function TimelineLayout({
  title,
  description,
  icon: Icon,
  feed,
  onEventUpdate,
  onLoadMore,
  isLoadingMore = false,
  stats: _stats,
  showFilters = false,
  compact = false,
  enableMultiSelect = false,
  additionalHeaderContent,
  emptyState,
  postComposer,
  inlineComposer,
}: TimelineLayoutProps) {
  return (
    <div className={TIMELINE_SURFACE.page}>
      <div className={TIMELINE_SURFACE.rail}>
        <div className={TIMELINE_SURFACE.feed}>
          <div className={cn(TIMELINE_SURFACE.header)}>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-surface-raised text-fg-primary">
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-fg-primary">{title}</h1>
                {description && <p className="text-sm text-fg-secondary">{description}</p>}
              </div>
            </div>
            {additionalHeaderContent && (
              <div className="flex items-center gap-2">{additionalHeaderContent}</div>
            )}
          </div>

          {inlineComposer || postComposer}

          {emptyState ? (
            emptyState
          ) : (
            <TimelineComponent
              feed={feed}
              onEventUpdate={onEventUpdate}
              onLoadMore={onLoadMore}
              isLoadingMore={isLoadingMore}
              showFilters={showFilters}
              compact={compact}
              enableMultiSelect={enableMultiSelect}
            />
          )}
        </div>
      </div>
    </div>
  );
}
