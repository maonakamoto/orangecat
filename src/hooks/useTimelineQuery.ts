'use client';

import { useQueryClient } from '@tanstack/react-query';

const timelineKeys = {
  all: ['timeline'] as const,
  userFeed: (userId: string) => [...timelineKeys.all, 'user', userId] as const,
  communityFeed: (sortBy: string) => [...timelineKeys.all, 'community', sortBy] as const,
  search: (query: string) => [...timelineKeys.all, 'search', query] as const,
  post: (postId: string) => [...timelineKeys.all, 'post', postId] as const,
};

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
