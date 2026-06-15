'use client';

import React from 'react';
import { Heart, MessageCircle, Share2, ThumbsDown, Repeat2 } from 'lucide-react';
import { ShareModal } from '@/components/timeline/ShareModal';
import { TimelineDisplayEvent } from '@/types/timeline';
import { usePostInteractions } from '@/hooks/usePostInteractions';
import { cn } from '@/lib/utils';
import { TIMELINE_SURFACE } from '@/config/timeline';

/**
 * PostActions Component
 *
 * Renders interaction buttons (like, dislike, comment, repost, share) for a post.
 * All business logic is delegated to the usePostInteractions hook for DRY compliance.
 */

interface PostActionsProps {
  event: TimelineDisplayEvent;
  onUpdate: (updates: Partial<TimelineDisplayEvent>) => void;
  onAddEvent?: (event: TimelineDisplayEvent) => void;
  onToggleComments?: () => void;
  onRepostClick?: () => void;
  isReposting?: boolean;
}

function actionClassName(active: boolean, activeClassName: string) {
  return cn(TIMELINE_SURFACE.iconButton, 'gap-1 px-2 text-sm', active && activeClassName);
}

export function PostActions({
  event,
  onUpdate,
  onAddEvent,
  onToggleComments,
  onRepostClick,
  isReposting = false,
}: PostActionsProps) {
  // Delegate all interaction logic to the hook
  const {
    isLiking,
    handleLike,
    isDisliking,
    handleDislike,
    isSharing,
    shareOpen,
    handleShareOpen,
    handleShareClose,
    handleShareConfirm,
  } = usePostInteractions({ event, onUpdate, onAddEvent });

  return (
    <>
      <div className="mt-3 flex max-w-[425px] items-center justify-between">
        {/* Reply */}
        <button
          onClick={onToggleComments}
          className={cn(TIMELINE_SURFACE.iconButton, '-ml-2 gap-1 px-2 text-sm')}
          aria-label="Reply"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-sm">
            {(() => {
              const replyTotal =
                event.replyCount ??
                (Array.isArray(event.replies) ? event.replies.length : undefined) ??
                event.commentsCount ??
                0;
              return replyTotal > 0 ? replyTotal : '';
            })()}
          </span>
        </button>

        {/* Repost */}
        <button
          onClick={onRepostClick}
          disabled={isReposting}
          className={actionClassName(event.userReposted || false, 'text-status-positive')}
          aria-label="Repost"
        >
          <Repeat2 className={`w-5 h-5 ${event.userReposted ? 'fill-current' : ''}`} />
          <span className="text-sm">{(event.repostsCount || 0) > 0 ? event.repostsCount : ''}</span>
        </button>

        {/* Like */}
        <button
          onClick={handleLike}
          disabled={isLiking}
          className={actionClassName(event.userLiked || false, 'text-status-negative')}
          aria-label="Like"
        >
          <Heart className={`w-5 h-5 ${event.userLiked ? 'fill-current' : ''}`} />
          <span className="text-sm">{(event.likesCount || 0) > 0 ? event.likesCount : ''}</span>
        </button>

        {/* Dislike */}
        <button
          onClick={handleDislike}
          disabled={isDisliking}
          className={actionClassName(event.userDisliked || false, 'text-status-warning')}
          title="Dislike this post (wisdom of crowds - helps detect scams)"
          aria-label="Dislike"
        >
          <ThumbsDown className={`w-5 h-5 ${event.userDisliked ? 'fill-current' : ''}`} />
          <span className="text-sm">
            {(event.dislikesCount || 0) > 0 ? event.dislikesCount : ''}
          </span>
        </button>

        {/* Share */}
        <button
          onClick={handleShareOpen}
          disabled={isSharing}
          className={actionClassName(event.userShared || false, 'text-fg-primary')}
          aria-label="Share"
        >
          <Share2 className="w-5 h-5" />
        </button>
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={shareOpen}
        onClose={handleShareClose}
        onShare={handleShareConfirm}
        defaultText=""
        isSubmitting={isSharing}
      />
    </>
  );
}
