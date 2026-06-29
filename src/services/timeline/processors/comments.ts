/**
 * Timeline comments (add / update / delete / fetch + replies). Extracted verbatim
 * from socialInteractions.ts (SoC) and re-exported from it. No behavior change.
 */

import { logger } from '@/utils/logger';
import { DATABASE_TABLES } from '@/config/database-tables';
import type { ServiceResult } from '@/types/common';
import { db, getCurrentUserId } from './social-shared';

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
