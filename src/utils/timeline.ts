/**
 * TIMELINE UTILITIES - Timeline Processing and Deduplication
 *
 * This module provides utility functions for processing timeline events,
 * including cross-post deduplication and event grouping.
 *
 * Created: 2025-01-22
 */

import type { TimelineDisplayEvent } from '@/types/timeline';

/**
 * Merge optimistic events with real events, removing duplicates
 * Matches events by content and timestamp within a 5-second window
 *
 * @param optimisticEvents - Array of optimistic (not yet confirmed) events
 * @param realEvents - Array of confirmed events from the server
 * @returns Filtered optimistic events that haven't been replaced
 */
export function filterOptimisticEvents(
  optimisticEvents: TimelineDisplayEvent[],
  realEvents: TimelineDisplayEvent[]
): TimelineDisplayEvent[] {
  return optimisticEvents.filter(
    optEvent =>
      !realEvents.some(realEvent => {
        // Match by content and timestamp (simple heuristic)
        return (
          realEvent.description === optEvent.description &&
          Math.abs(
            new Date(realEvent.eventTimestamp).getTime() -
              new Date(optEvent.eventTimestamp).getTime()
          ) < 5000
        ); // 5 second window
      })
  );
}
