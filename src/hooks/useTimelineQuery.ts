'use client';

import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { timelineService } from '@/services/timeline';
import { TimelineFeedResponse, TimelineDisplayEvent } from '@/types/timeline';

export const timelineKeys = {
  all: ['timeline'] as const,
  userFeed: (userId: string) => [...timelineKeys.all, 'user', userId] as const,
  communityFeed: (sortBy: string) => [...timelineKeys.all, 'community', sortBy] as const,
  search: (query: string) => [...timelineKeys.all, 'search', query] as const,
  post: (postId: string) => [...timelineKeys.all, 'post', postId] as const,
};

interface UseTimelineFeedOptions {
  userId: string;
  enabled?: boolean;
  page?: number;
  limit?: number;
}

export function useUserTimelineFeed({
  userId,
  enabled = true,
  page = 1,
  limit = 20,
}: UseTimelineFeedOptions) {
  return useQuery({
    queryKey: [...timelineKeys.userFeed(userId), page],
    queryFn: async (): Promise<TimelineFeedResponse> => {
      return timelineService.getEnrichedUserFeed(userId, {}, { page, limit });
    },
    enabled: enabled && !!userId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

interface UseCommunityFeedOptions {
  sortBy: 'recent' | 'trending' | 'popular';
  enabled?: boolean;
}

export function useCommunityTimelineFeed({ sortBy, enabled = true }: UseCommunityFeedOptions) {
  return useInfiniteQuery({
    queryKey: timelineKeys.communityFeed(sortBy),
    queryFn: async ({ pageParam = 1 }): Promise<TimelineFeedResponse> => {
      return timelineService.getCommunityFeed({ sortBy }, { page: pageParam as number, limit: 20 });
    },
    initialPageParam: 1,
    getNextPageParam: lastPage => {
      if (lastPage.pagination.hasNext) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    enabled,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useTimelineSearch(query: string, enabled = true) {
  return useQuery({
    queryKey: timelineKeys.search(query),
    queryFn: async () => {
      if (!query || query.length < 2) {
        return { success: true, posts: [], total: 0 };
      }
      return timelineService.searchPosts(query, { limit: 30, offset: 0 });
    },
    enabled: enabled && query.length >= 2,
    staleTime: 60 * 1000,
    gcTime: 2 * 60 * 1000,
  });
}

export function useInvalidateTimeline() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: timelineKeys.all });
    },
    invalidateUserFeed: (userId: string) => {
      queryClient.invalidateQueries({ queryKey: timelineKeys.userFeed(userId) });
    },
    invalidateCommunityFeed: () => {
      queryClient.invalidateQueries({ queryKey: ['timeline', 'community'] });
    },
    invalidateSearch: () => {
      queryClient.invalidateQueries({ queryKey: ['timeline', 'search'] });
    },
  };
}

export function useOptimisticTimelineUpdate() {
  const queryClient = useQueryClient();

  return {
    addPost: (userId: string, newPost: TimelineDisplayEvent) => {
      queryClient.setQueryData(
        timelineKeys.userFeed(userId),
        (oldData: TimelineFeedResponse | undefined) => {
          if (!oldData) {
            return oldData;
          }
          return {
            ...oldData,
            events: [newPost, ...oldData.events],
            metadata: {
              ...oldData.metadata,
              totalEvents: oldData.metadata.totalEvents + 1,
            },
          };
        }
      );
    },

    updateLikes: (postId: string, increment: number) => {
      queryClient.setQueriesData(
        { queryKey: timelineKeys.all },
        (oldData: TimelineFeedResponse | undefined) => {
          if (!oldData || !oldData.events) {
            return oldData;
          }
          return {
            ...oldData,
            events: oldData.events.map(event =>
              event.id === postId
                ? { ...event, likesCount: (event.likesCount || 0) + increment }
                : event
            ),
          };
        }
      );
    },

    removePost: (postId: string) => {
      queryClient.setQueriesData(
        { queryKey: timelineKeys.all },
        (oldData: TimelineFeedResponse | undefined) => {
          if (!oldData || !oldData.events) {
            return oldData;
          }
          return {
            ...oldData,
            events: oldData.events.filter(event => event.id !== postId),
            metadata: {
              ...oldData.metadata,
              totalEvents: Math.max(0, oldData.metadata.totalEvents - 1),
            },
          };
        }
      );
    },
  };
}

export function usePrefetchTimeline() {
  const queryClient = useQueryClient();

  return {
    prefetchUserFeed: (userId: string) => {
      queryClient.prefetchQuery({
        queryKey: [...timelineKeys.userFeed(userId), 1],
        queryFn: () => timelineService.getEnrichedUserFeed(userId, {}, { page: 1, limit: 20 }),
        staleTime: 30 * 1000,
      });
    },
    prefetchCommunityFeed: (sortBy: 'recent' | 'trending' | 'popular') => {
      queryClient.prefetchInfiniteQuery({
        queryKey: timelineKeys.communityFeed(sortBy),
        queryFn: () => timelineService.getCommunityFeed({ sortBy }, { page: 1, limit: 20 }),
        initialPageParam: 1,
        staleTime: 30 * 1000,
      });
    },
  };
}
