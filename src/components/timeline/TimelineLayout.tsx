import React from 'react';
import { LucideIcon } from 'lucide-react';
import { TimelineFeedResponse, TimelineDisplayEvent } from '@/types/timeline';
import TimelineComponent from './TimelineComponent';
import { cn } from '@/lib/utils';

export interface TimelineLayoutProps {
  title: string;
  description: string;
  icon: LucideIcon;
  gradientFrom: string;
  gradientVia: string;
  gradientTo: string;
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
  gradientFrom: _gradientFrom,
  gradientVia: _gradientVia,
  gradientTo: _gradientTo,
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
    <div className="min-h-screen bg-gray-50 dark:bg-background">
      <div className="max-w-6xl mx-auto flex justify-center px-0 sm:px-4 lg:px-8">
        <div className="w-full max-w-2xl sm:border-x sm:border-border bg-card">
          <div
            className={cn(
              'sticky top-0 z-20 flex items-center justify-between px-4 sm:px-5 py-3 border-b border-border bg-white/95 dark:bg-card/95 backdrop-blur'
            )}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-muted text-gray-700 dark:text-foreground">
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">{title}</h1>
                {description && <p className="text-sm text-muted-foreground">{description}</p>}
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
