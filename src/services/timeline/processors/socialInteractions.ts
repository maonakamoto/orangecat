/**
 * Timeline Social Interactions
 *
 * Handles likes, dislikes, comments, and shares for timeline events.
 *
 * Created: 2025-01-28
 * Last Modified: 2025-01-28
 * Last Modified Summary: Extracted social interaction logic from monolithic timeline service
 */

import supabase from '@/lib/supabase/browser';
import { logger } from '@/utils/logger';
import { withApiRetry } from '@/utils/retry';
import { DATABASE_TABLES } from '@/config/database-tables';
import type { ServiceResult } from '@/types/common';

// TIMELINE_LIKES, TIMELINE_DISLIKES, TIMELINE_COMMENTS are not in the generated DB schema,
// and custom RPCs (like/unlike/comment) are also absent — cast required.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

async function getCurrentUserId(): Promise<string | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id || null;
  } catch (error) {
    logger.error('Error getting current user ID', error, 'Timeline');
    return null;
  }
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

interface ReactionConfig {
  table: string;
  addRpc: string;
  removeRpc: string;
  /** Key in the RPC response containing the updated count, e.g. 'like_count' */
  countKey: string;
}

async function toggleReaction(
  eventId: string,
  targetUserId: string,
  cfg: ReactionConfig
): Promise<{ success: boolean; active: boolean; count: number; error?: string }> {
  const { table, addRpc, removeRpc, countKey } = cfg;

  const { data: existing } = await db
    .from(table)
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', targetUserId)
    .single();

  if (existing) {
    // Remove reaction
    try {
      const { data, error } = await db.rpc(removeRpc, {
        p_event_id: eventId,
        p_user_id: targetUserId,
      });
      if (error) {
        logger.error(`Failed to call ${removeRpc}`, error, 'Timeline');
        return { success: false, active: false, count: 0, error: error.message };
      }
      return {
        success: true,
        active: false,
        count: (data as Record<string, number>)?.[countKey] || 0,
      };
    } catch (dbError) {
      logger.warn(`RPC ${removeRpc} not available, using fallback`, dbError, 'Timeline');
      const { error: delErr } = await db
        .from(table)
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', targetUserId);
      if (delErr) {
        logger.error(`Fallback ${removeRpc} failed`, delErr, 'Timeline');
        return { success: false, active: false, count: 0, error: delErr.message };
      }
      const { count } = await db
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId);
      return { success: true, active: false, count: count || 0 };
    }
  } else {
    // Add reaction
    try {
      const { data, error } = await db.rpc(addRpc, {
        p_event_id: eventId,
        p_user_id: targetUserId,
      });
      if (error) {
        logger.error(`Failed to call ${addRpc}`, error, 'Timeline');
        return { success: false, active: false, count: 0, error: error.message };
      }
      return {
        success: true,
        active: true,
        count: (data as Record<string, number>)?.[countKey] || 0,
      };
    } catch (dbError) {
      logger.warn(`RPC ${addRpc} not available, using fallback`, dbError, 'Timeline');
      const { error: insertErr } = await db
        .from(table)
        .insert({ event_id: eventId, user_id: targetUserId });
      if (insertErr) {
        logger.error(`Fallback ${addRpc} failed`, insertErr, 'Timeline');
        return { success: false, active: false, count: 0, error: insertErr.message };
      }
      const { count } = await db
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId);
      return { success: true, active: true, count: count || 0 };
    }
  }
}

type CommentRow = {
  id: string;
  event_id: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_comment_id: string | null;
};

type ProfileRow = {
  id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
};

async function enrichWithProfiles(rows: CommentRow[]): Promise<Record<string, unknown>[]> {
  const userIds = Array.from(new Set(rows.map(c => c.user_id).filter(Boolean)));
  let profilesMap: Record<
    string,
    { display_name: string; username: string | null; avatar_url: string | null }
  > = {};
  if (userIds.length > 0) {
    const { data: profiles, error: pErr } = await db
      .from(DATABASE_TABLES.PROFILES)
      .select('id, display_name:name, username, avatar_url')
      .in('id', userIds as string[]);
    if (!pErr && profiles) {
      profilesMap = Object.fromEntries(
        (profiles as ProfileRow[]).map(p => [
          p.id,
          { display_name: p.display_name, username: p.username, avatar_url: p.avatar_url },
        ])
      );
    }
  }
  return rows.map(c => ({
    id: c.id,
    content: c.content,
    created_at: c.created_at,
    user_id: c.user_id,
    user_name: profilesMap[c.user_id]?.display_name || 'User',
    user_username: profilesMap[c.user_id]?.username || null,
    user_avatar: profilesMap[c.user_id]?.avatar_url || null,
    reply_count: 0,
  }));
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Like or unlike an event
 */
export async function toggleLike(
  eventId: string,
  userId?: string
): Promise<{ success: boolean; liked: boolean; likeCount: number; error?: string }> {
  try {
    return await withApiRetry(
      async () => {
        const targetUserId = userId || (await getCurrentUserId());
        if (!targetUserId) {
          return { success: false, liked: false, likeCount: 0, error: 'Authentication required' };
        }
        const r = await toggleReaction(eventId, targetUserId, {
          table: DATABASE_TABLES.TIMELINE_LIKES,
          addRpc: 'like_timeline_event',
          removeRpc: 'unlike_timeline_event',
          countKey: 'like_count',
        });
        return { success: r.success, liked: r.active, likeCount: r.count, error: r.error };
      },
      { maxAttempts: 2 } // Only retry once for likes to avoid spam
    );
  } catch (error) {
    logger.error('Error toggling like on timeline event', error, 'Timeline');
    return { success: false, liked: false, likeCount: 0, error: 'Internal server error' };
  }
}

/**
 * Toggle dislike on a timeline event (for scam detection and wisdom of crowds)
 */
export async function toggleDislike(
  eventId: string,
  userId?: string
): Promise<{ success: boolean; disliked: boolean; dislikeCount: number; error?: string }> {
  try {
    const targetUserId = userId || (await getCurrentUserId());
    if (!targetUserId) {
      return { success: false, disliked: false, dislikeCount: 0, error: 'Authentication required' };
    }
    const r = await toggleReaction(eventId, targetUserId, {
      table: DATABASE_TABLES.TIMELINE_DISLIKES,
      addRpc: 'dislike_timeline_event',
      removeRpc: 'undislike_timeline_event',
      countKey: 'dislike_count',
    });
    return { success: r.success, disliked: r.active, dislikeCount: r.count, error: r.error };
  } catch (error) {
    logger.error('Error toggling dislike on timeline event', error, 'Timeline');
    return { success: false, disliked: false, dislikeCount: 0, error: 'Internal server error' };
  }
}

/**
 * Add a comment to an event
 */
export async function addComment(
  eventId: string,
  content: string,
  parentCommentId?: string,
  userId?: string,
  _createEventFn?: (request: Record<string, unknown>) => Promise<ServiceResult>
): Promise<{ success: boolean; commentId?: string; commentCount: number; error?: string }> {
  try {
    let actorUserId = userId;
    if (!actorUserId) {
      const fetchedUserId = await getCurrentUserId();
      if (!fetchedUserId) {
        return { success: false, commentCount: 0, error: 'Authentication required' };
      }
      actorUserId = fetchedUserId;
    }

    try {
      const { data, error } = await db.rpc('add_timeline_comment', {
        p_event_id: eventId,
        p_user_id: actorUserId,
        p_content: content,
        p_parent_comment_id: parentCommentId,
      });

      if (error) {
        logger.error('Failed to add timeline comment', error, 'Timeline');
        return { success: false, commentCount: 0, error: error.message };
      }

      return {
        success: true,
        commentId: (data as { comment_id?: string })?.comment_id,
        commentCount: (data as { comment_count?: number })?.comment_count || 0,
      };
    } catch (dbError) {
      logger.warn(
        'Database function not available for comments, using fallback',
        dbError,
        'Timeline'
      );
      const { data: inserted, error: iErr } = await db
        .from(DATABASE_TABLES.TIMELINE_COMMENTS)
        .insert({
          event_id: eventId,
          user_id: actorUserId,
          content,
          parent_comment_id: parentCommentId,
        })
        .select('id')
        .single();
      if (iErr || !inserted) {
        logger.error('Fallback add comment failed', iErr, 'Timeline');
        return { success: false, commentCount: 0, error: iErr?.message || 'Add comment failed' };
      }
      const { count } = await db
        .from(DATABASE_TABLES.TIMELINE_COMMENTS)
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId);
      return {
        success: true,
        commentId: (inserted as { id: string }).id,
        commentCount: count || 0,
      };
    }
  } catch (error) {
    logger.error('Error adding timeline comment', error, 'Timeline');
    return { success: false, commentCount: 0, error: 'Internal server error' };
  }
}

/**
 * Update a comment's content
 */
export async function updateComment(
  commentId: string,
  content: string,
  userId?: string
): Promise<ServiceResult> {
  try {
    const targetUserId = userId || (await getCurrentUserId());
    if (!targetUserId) {
      return { success: false, error: 'Authentication required' };
    }

    try {
      const { error } = await db.rpc('update_timeline_comment', {
        p_comment_id: commentId,
        p_user_id: targetUserId,
        p_content: content,
      });

      if (error) {
        logger.error('Failed to update timeline comment', error, 'Timeline');
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (dbError) {
      logger.warn(
        'Database function not available for comment updates, using fallback',
        dbError,
        'Timeline'
      );
      const { error: updateErr } = await db
        .from(DATABASE_TABLES.TIMELINE_COMMENTS)
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', commentId)
        .eq('user_id', targetUserId);

      if (updateErr) {
        logger.error('Fallback update comment failed', updateErr, 'Timeline');
        return { success: false, error: updateErr.message };
      }

      return { success: true };
    }
  } catch (error) {
    logger.error('Error updating timeline comment', error, 'Timeline');
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Delete a comment (soft delete)
 */
export async function deleteComment(commentId: string, userId?: string): Promise<ServiceResult> {
  try {
    const targetUserId = userId || (await getCurrentUserId());
    if (!targetUserId) {
      return { success: false, error: 'Authentication required' };
    }

    try {
      const { error } = await db.rpc('delete_timeline_comment', {
        p_comment_id: commentId,
        p_user_id: targetUserId,
      });

      if (!error) {
        return { success: true };
      }

      // If the RPC is missing or failed, fall back to direct table update
      logger.warn(
        'RPC delete_timeline_comment failed, attempting direct delete fallback',
        error,
        'Timeline'
      );
    } catch (dbError) {
      logger.warn(
        'Database function not available for comment deletion, using fallback',
        dbError,
        'Timeline'
      );
    }

    const { error: deleteErr } = await db
      .from(DATABASE_TABLES.TIMELINE_COMMENTS)
      .update({
        deleted_at: new Date().toISOString(),
        content: '[deleted]',
      })
      .eq('id', commentId)
      .eq('user_id', targetUserId)
      .is('deleted_at', null);

    if (deleteErr) {
      logger.error('Fallback delete comment failed', deleteErr, 'Timeline');
      return { success: false, error: deleteErr.message };
    }

    return { success: true };
  } catch (error) {
    logger.error('Error deleting timeline comment', error, 'Timeline');
    return { success: false, error: 'Internal server error' };
  }
}

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

/**
 * Get comments for an event
 */
export async function getEventComments(
  eventId: string,
  limit: number = 50,
  offset: number = 0
): Promise<Record<string, unknown>[]> {
  try {
    try {
      const { data, error } = await db.rpc('get_event_comments', {
        p_event_id: eventId,
        p_limit: limit,
        p_offset: offset,
      });

      if (error) {
        logger.error('Failed to get event comments', error, 'Timeline');
        return [];
      }

      return (data as Record<string, unknown>[]) || [];
    } catch (dbError) {
      logger.warn(
        'Database function not available for comments, using fallback',
        dbError,
        'Timeline'
      );
      const { data: comments, error: cErr } = await db
        .from(DATABASE_TABLES.TIMELINE_COMMENTS)
        .select('id, event_id, user_id, content, created_at, parent_comment_id')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1);
      if (cErr || !comments) {
        logger.error('Fallback comments query failed', cErr, 'Timeline');
        return [];
      }
      return enrichWithProfiles(comments as CommentRow[]);
    }
  } catch (error) {
    logger.error('Error getting event comments', error, 'Timeline');
    return [];
  }
}

/**
 * Get replies to a comment
 */
export async function getCommentReplies(
  commentId: string,
  limit: number = 20
): Promise<Record<string, unknown>[]> {
  try {
    try {
      const { data, error } = await db.rpc('get_comment_replies', {
        p_comment_id: commentId,
        p_limit: limit,
      });

      if (error) {
        logger.error('Failed to get comment replies', error, 'Timeline');
        return [];
      }

      return (data as Record<string, unknown>[]) || [];
    } catch (dbError) {
      logger.warn(
        'Database function not available for comment replies, using fallback',
        dbError,
        'Timeline'
      );
      const { data: replies, error: rErr } = await db
        .from(DATABASE_TABLES.TIMELINE_COMMENTS)
        .select('id, event_id, user_id, content, created_at, parent_comment_id')
        .eq('parent_comment_id', commentId)
        .order('created_at', { ascending: true })
        .limit(limit);
      if (rErr || !replies) {
        logger.error('Fallback replies query failed', rErr, 'Timeline');
        return [];
      }
      return enrichWithProfiles(replies as CommentRow[]);
    }
  } catch (error) {
    logger.error('Error getting comment replies', error, 'Timeline');
    return [];
  }
}
