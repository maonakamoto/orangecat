/**
 * Timeline Social Interactions
 *
 * Likes, dislikes, comments, and shares for timeline events. Reactions live in
 * reactions.ts and comments in comments.ts (shared internals in social-shared.ts);
 * both are re-exported here so consumers keep importing from one module. This file
 * also holds the cross-cutting count helper.
 *
 * Created: 2025-01-28
 * Last Modified: 2026-06-29
 * Last Modified Summary: Split reactions/comments into sibling modules (SoC); behavior unchanged.
 */

import supabase from '@/lib/supabase/browser';
import { logger } from '@/utils/logger';
import { DATABASE_TABLES } from '@/config/database-tables';

export { toggleLike, toggleDislike } from './reactions';
export {
  addComment,
  updateComment,
  deleteComment,
  getEventComments,
  getCommentReplies,
} from './comments';

/**
 * Get like/comment counts for an event (fallback for feeds lacking counts)
 */
export async function getEventCounts(
  eventId: string
): Promise<{ likeCount: number; commentCount: number }> {
  try {
    const [{ count: likeCount }, { count: commentCount }] = await Promise.all([
      supabase
        .from(DATABASE_TABLES.TIMELINE_LIKES)
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId),
      supabase
        .from(DATABASE_TABLES.TIMELINE_COMMENTS)
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId),
    ]);
    return { likeCount: likeCount || 0, commentCount: commentCount || 0 };
  } catch (error) {
    logger.error('Failed to get event counts', error, 'Timeline');
    return { likeCount: 0, commentCount: 0 };
  }
}
