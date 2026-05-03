'use client';

import React, { useEffect } from 'react';
import TimelineComponent from './TimelineComponent';
import TimelineComposer from './TimelineComposer';
import Button from '@/components/ui/Button';
import { useTimelineView } from './useTimelineView';

export interface TimelineViewProps {
  feedType: 'journey' | 'community' | 'profile' | 'project';
  ownerId?: string;
  ownerType?: 'profile' | 'project';
  showComposer?: boolean;
  compact?: boolean;
  showFilters?: boolean;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  onPostCreated?: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onOptimisticEvent?: (event: any) => void;
}

export default function TimelineView({
  feedType,
  ownerId,
  ownerType = 'profile',
  showComposer = false,
  compact = false,
  showFilters = false,
  emptyStateTitle,
  emptyStateDescription,
  onPostCreated,
  onOptimisticEvent,
}: TimelineViewProps) {
  const {
    user,
    authLoading,
    hydrated,
    feed,
    loading,
    error,
    mergedFeed,
    loadFeed,
    handleEventUpdate,
    handleLoadMore,
    handlePostCreated,
  } = useTimelineView({ feedType, ownerId, onPostCreated, onOptimisticEvent });

  if (hydrated && !authLoading && !user && (feedType === 'journey' || feedType === 'community')) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Please sign in</h2>
        <p className="text-gray-600 mb-6">You need to be signed in to view this timeline.</p>
        <Button onClick={() => (window.location.href = '/auth')}>Sign In</Button>
      </div>
    );
  }

  if (!hydrated || authLoading || loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
            <div className="flex items-start space-x-3">
              <div className="w-12 h-12 bg-gray-200 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/4" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-600 text-lg mb-4">{error}</p>
        <Button variant="outline" onClick={() => loadFeed()}>
          Try Again
        </Button>
      </div>
    );
  }

  if (feed && feed.events.length === 0) {
    const defaultTitle =
      feedType === 'journey'
        ? 'No posts yet'
        : feedType === 'community'
          ? 'No community posts yet'
          : 'No posts on this timeline yet';

    const defaultDescription =
      feedType === 'journey'
        ? "Share your first update about what you're working on!"
        : feedType === 'community'
          ? 'Be the first to share something with the community!'
          : 'Be the first to post on this timeline!';

    return (
      <div className="text-center py-16">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {emptyStateTitle || defaultTitle}
        </h3>
        <p className="text-gray-600 max-w-md mx-auto">
          {emptyStateDescription || defaultDescription}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {mergedFeed && <FocusScroller />}
      {showComposer &&
        (user ? (
          <TimelineComposer
            targetOwnerId={ownerId}
            targetOwnerType={ownerType}
            allowProjectSelection={feedType === 'profile' || feedType === 'project'}
            onPostCreated={handlePostCreated}
            placeholder={
              feedType === 'profile'
                ? 'Write on this timeline...'
                : feedType === 'project'
                  ? 'Share an update about this project...'
                  : "What's on your mind?"
            }
            buttonText="Post"
            showBanner={Boolean(ownerId && ownerId !== user.id)}
          />
        ) : (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white/80 px-4 py-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-gray-900">Sign in to post</p>
                <p className="text-sm text-gray-600">
                  You need to be signed in to write on this timeline.
                </p>
              </div>
              <Button
                onClick={() => {
                  const redirect =
                    typeof window !== 'undefined'
                      ? window.location.pathname + window.location.search
                      : '/profiles/me';
                  window.location.href = `/auth?redirect=${encodeURIComponent(redirect)}`;
                }}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                Sign in
              </Button>
            </div>
          </div>
        ))}

      {mergedFeed && (
        <TimelineComponent
          feed={mergedFeed}
          onEventUpdate={handleEventUpdate}
          onLoadMore={handleLoadMore}
          showFilters={showFilters}
          compact={compact}
        />
      )}
    </div>
  );
}

function FocusScroller() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const focusId = params.get('focus');
      if (focusId) {
        const el = document.querySelector(`[data-event-id="${focusId}"]`);
        if (el) {
          (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
          (el as HTMLElement).classList.add('ring-2', 'ring-orange-400', 'ring-offset-2');
          setTimeout(() => {
            (el as HTMLElement).classList.remove('ring-2', 'ring-orange-400', 'ring-offset-2');
          }, 1800);
        }
      }
    } catch {}
  }, []);
  return null;
}
