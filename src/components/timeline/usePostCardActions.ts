'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { TimelineDisplayEvent, TimelineVisibility } from '@/types/timeline';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/types/database';
import { logger } from '@/utils/logger';
import { timelineService } from '@/services/timeline';
import { usePostInteractions } from '@/hooks/usePostInteractions';

interface UsePostCardActionsParams {
  event: TimelineDisplayEvent;
  user: User | null | undefined;
  profile: Profile | null | undefined;
  onUpdate: (updates: Partial<TimelineDisplayEvent>) => void;
  onDelete?: () => void;
  onReplyCreated?: (reply: TimelineDisplayEvent) => void;
  isSelectionMode?: boolean;
  onToggleSelect?: (eventId: string) => void;
}

export function usePostCardActions({
  event,
  user,
  profile,
  onUpdate,
  onDelete,
  onReplyCreated,
  isSelectionMode = false,
  onToggleSelect,
}: UsePostCardActionsParams) {
  const router = useRouter();

  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    isReposting,
    repostModalOpen,
    handleRepostClick,
    handleRepostClose,
    handleSimpleRepost,
    handleQuoteRepost,
  } = usePostInteractions({ event, onUpdate });

  const canEdit = user?.id === event.actor.id;

  const handleMenuToggle = useCallback(() => setShowMenu(prev => !prev), []);

  const handleEditClick = useCallback(() => {
    setShowMenu(false);
    setShowEditModal(true);
  }, []);

  const handleEditSave = useCallback(
    async (updates: { title: string; description: string; visibility: TimelineVisibility }) => {
      setIsEditing(true);
      try {
        const result = await timelineService.updateEvent(event.id, {
          title: updates.title,
          description: updates.description,
          visibility: updates.visibility,
        });
        if (result.success) {
          onUpdate({
            title: updates.title,
            description: updates.description,
            visibility: updates.visibility,
            updatedAt: new Date().toISOString(),
          });
          logger.info('Post updated successfully', { eventId: event.id }, 'PostCard');
        } else {
          throw new Error(result.error || 'Failed to update post');
        }
      } catch (error) {
        logger.error('Failed to update post', error, 'PostCard');
        throw error;
      } finally {
        setIsEditing(false);
      }
    },
    [event.id, onUpdate]
  );

  const handleDeleteClick = useCallback(() => {
    setShowMenu(false);
    setShowDeleteDialog(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    setIsDeleting(true);
    try {
      const success = await timelineService.deleteEvent(event.id);
      if (success) {
        logger.info('Post deleted successfully', { eventId: event.id }, 'PostCard');
        setShowDeleteDialog(false);
        onDelete?.();
      } else {
        throw new Error('Failed to delete post');
      }
    } catch (error) {
      logger.error('Failed to delete post', error, 'PostCard');
      throw error;
    } finally {
      setIsDeleting(false);
    }
  }, [event.id, onDelete]);

  const handleToggleReply = useCallback(() => setShowReplyInput(prev => !prev), []);

  const handleReplySubmit = useCallback(async () => {
    const text = replyText.trim();
    if (!text || isReplying || !user) {
      return;
    }
    setIsReplying(true);
    try {
      const title = text.length <= 120 ? text : `${text.slice(0, 117).trimEnd()}...`;
      const result = await timelineService.createEvent({
        eventType: 'status_update',
        actorId: user.id,
        subjectType: event.subject?.type || 'profile',
        subjectId: event.subject?.id || event.actor.id,
        title,
        description: text,
        visibility: event.visibility,
        metadata: { is_user_post: true, is_reply: true },
        parentEventId: event.id,
      });
      if (!result.success || !result.event) {
        throw new Error(result.error || 'Failed to reply');
      }
      const hydrated = await timelineService.getEventById(result.event.id);
      setReplyText('');
      setShowReplyInput(false);
      if (hydrated.success && hydrated.event) {
        onReplyCreated?.(hydrated.event);
      }
      onUpdate({
        commentsCount: (event.commentsCount || event.replyCount || 0) + 1,
        replyCount: (event.replyCount || 0) + 1,
      });
    } catch (error) {
      logger.error('Failed to post reply', error, 'PostCard');
    } finally {
      setIsReplying(false);
    }
  }, [replyText, isReplying, user, event, onReplyCreated, onUpdate]);

  const handleSelectionClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleSelect?.(event.id);
    },
    [event.id, onToggleSelect]
  );

  const handlePostClick = useCallback(
    (e: React.MouseEvent) => {
      if (isSelectionMode) {
        onToggleSelect?.(event.id);
        return;
      }
      const target = e.target as HTMLElement;
      if (target.closest('a, button, textarea, input, [role="button"]')) {
        return;
      }
      router.push(`/post/${event.id}`);
    },
    [router, event.id, isSelectionMode, onToggleSelect]
  );

  return {
    canEdit,
    showReplyInput,
    replyText,
    setReplyText,
    isReplying,
    showMenu,
    showEditModal,
    setShowEditModal,
    showDeleteDialog,
    setShowDeleteDialog,
    isEditing,
    isDeleting,
    isReposting,
    repostModalOpen,
    handleMenuToggle,
    handleEditClick,
    handleEditSave,
    handleDeleteClick,
    handleDeleteConfirm,
    handleToggleReply,
    handleReplySubmit,
    handleSelectionClick,
    handlePostClick,
    handleRepostClick,
    handleRepostClose,
    handleSimpleRepost,
    handleQuoteRepost,
    profile,
  };
}
