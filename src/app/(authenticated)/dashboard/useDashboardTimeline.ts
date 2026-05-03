'use client';

import { useCallback, useEffect, useState } from 'react';
import { timelineService } from '@/services/timeline';
import { TimelineFeedResponse } from '@/types/timeline';
import { logger } from '@/utils/logger';

interface UseDashboardTimelineOptions {
  userId: string | undefined;
  hydrated: boolean;
}

export function useDashboardTimeline({ userId, hydrated }: UseDashboardTimelineOptions) {
  const [timelineFeed, setTimelineFeed] = useState<TimelineFeedResponse | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);

  const loadTimelineFeed = useCallback(async (id: string) => {
    setTimelineLoading(true);
    setTimelineError(null);
    try {
      const feed = await timelineService.getEnrichedUserFeed(id);
      setTimelineFeed(feed);
      logger.debug(
        'Timeline feed loaded',
        { userId: id, eventCount: feed?.events?.length || 0 },
        'Dashboard'
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error(
        'Failed to load timeline feed',
        { error: errorMessage, userId: id },
        'Dashboard'
      );
      setTimelineError(`Failed to load timeline: ${errorMessage}`);
    } finally {
      setTimelineLoading(false);
    }
  }, []);

  const reloadTimeline = useCallback(() => {
    if (userId) {
      loadTimelineFeed(userId);
    }
  }, [userId, loadTimelineFeed]);

  useEffect(() => {
    if (userId && hydrated) {
      loadTimelineFeed(userId);
    }
  }, [userId, hydrated, loadTimelineFeed]);

  return { timelineFeed, timelineLoading, timelineError, reloadTimeline };
}
