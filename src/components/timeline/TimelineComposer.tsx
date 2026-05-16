'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Globe, Lock, Users } from 'lucide-react';
import Button from '@/components/ui/Button';
import { usePostComposer } from '@/hooks/usePostComposerNew';
import { useContentEditableEditor } from '@/hooks/useContentEditableEditor';
import AvatarLink from '@/components/ui/AvatarLink';
import { cn } from '@/lib/utils';
import {
  TextFormatToolbar,
  ProjectSelectionPanel,
  ProjectToggleButton,
  ComposerMessages,
  CharacterCounter,
  OfflineIndicator,
  ContextIndicator,
} from './ComposerShared';

const VISIBILITY_PRESETS = [
  { key: 'public' as const, label: 'Public', icon: Globe, description: 'Visible to everyone' },
  {
    key: 'followers' as const,
    label: 'Followers',
    icon: Users,
    description: 'People who follow you',
  },
  { key: 'private' as const, label: 'Only me', icon: Lock, description: 'Just you' },
];

export interface TimelineComposerProps {
  targetOwnerId?: string;
  targetOwnerType?: 'profile' | 'project';
  targetOwnerName?: string;
  allowProjectSelection?: boolean;
  onPostCreated?: () => void;
  onOptimisticUpdate?: (event: import('@/types/timeline').TimelineDisplayEvent) => void;
  onCancel?: () => void;
  placeholder?: string;
  buttonText?: string;
  showBanner?: boolean;
  parentEventId?: string;
  simpleMode?: boolean;
}

const TimelineComposer = React.memo(function TimelineComposer({
  targetOwnerId,
  targetOwnerType = 'profile',
  targetOwnerName,
  allowProjectSelection = false,
  onPostCreated,
  onOptimisticUpdate,
  onCancel,
  placeholder,
  buttonText = 'Post',
  showBanner = true,
  parentEventId,
  simpleMode = true,
}: TimelineComposerProps) {
  const { user, profile } = useAuth();
  const [showProjects, setShowProjects] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const postComposer = usePostComposer({
    subjectType: targetOwnerType,
    subjectId: targetOwnerId,
    allowProjectSelection,
    onSuccess: () => {
      onPostCreated?.();
      setShowProjects(false);
    },
    onOptimisticUpdate,
    parentEventId,
  });

  const postingToOwnTimeline = useMemo(
    () => !targetOwnerId || targetOwnerId === user?.id,
    [targetOwnerId, user?.id]
  );

  const targetName = useMemo(
    () => targetOwnerName || (postingToOwnTimeline ? 'your timeline' : 'this timeline'),
    [targetOwnerName, postingToOwnTimeline]
  );

  const defaultPlaceholder = postingToOwnTimeline
    ? "What's happening?"
    : `Write on ${targetName}...`;

  const { editorRef, handleInput, handlePaste, handleKeyDown, handleFormat } =
    useContentEditableEditor({
      content: postComposer.content,
      onContentChange: postComposer.setContent,
      onSubmit: () => {
        if (!postComposer.isPosting && postComposer.content.trim()) {
          postComposer.handlePost();
        }
      },
      onCancel,
      maxHeight: 480,
      disabled: postComposer.isPosting,
    });

  const handleToggleProject = useCallback(
    (id: string) => {
      postComposer.toggleProjectSelection(id);
    },
    [postComposer]
  );

  const handleCloseProjects = useCallback(() => {
    setShowProjects(false);
  }, []);

  const handleOpenProjects = useCallback(() => {
    setShowProjects(true);
  }, []);

  const isButtonDisabled = useMemo(
    () =>
      !postComposer.content.trim() || postComposer.isPosting || postComposer.content.length > 500,
    [postComposer.content, postComposer.isPosting]
  );

  return (
    <div className="max-w-2xl mx-auto border-b border-border bg-card px-4 sm:px-5 py-4 transition-all">
      <div className="flex gap-3">
        <div className="pt-0.5 sm:pt-1 flex-shrink-0">
          <AvatarLink
            username={profile?.username || null}
            userId={user?.id || null}
            avatarUrl={profile?.avatar_url || user?.user_metadata?.avatar_url || null}
            name={profile?.name || user?.user_metadata?.name || user?.email || 'User'}
            size={44}
            className="flex-shrink-0"
            isCurrentUser={true}
          />
        </div>

        <div className="flex-1 min-w-0">
          {!postingToOwnTimeline && showBanner && <ContextIndicator targetName={targetName} />}

          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            data-placeholder={placeholder || defaultPlaceholder}
            role="textbox"
            aria-multiline="true"
            aria-label="Compose new post"
            className={cn(
              'w-full leading-6',
              simpleMode ? 'min-h-[3.25rem] text-base' : 'min-h-[6rem] text-base',
              'border-none bg-transparent p-0 focus:outline-none',
              'leading-relaxed break-words',
              'max-h-[60vh] overflow-y-auto',
              'empty:before:content-[attr(data-placeholder)]',
              'empty:before:text-gray-400 dark:empty:before:text-muted-foreground',
              'empty:before:pointer-events-none',
              postComposer.isPosting && 'opacity-50 cursor-not-allowed'
            )}
            suppressContentEditableWarning
          />

          {showProjects && allowProjectSelection && (
            <ProjectSelectionPanel
              projects={postComposer.userProjects}
              selectedProjects={postComposer.selectedProjects}
              onToggle={handleToggleProject}
              onClose={handleCloseProjects}
              isPosting={postComposer.isPosting}
            />
          )}

          <ComposerMessages error={postComposer.error} success={postComposer.postSuccess} />

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border-subtle">
            <div className="flex items-center gap-2 text-tiffany-500 flex-wrap">
              {!simpleMode && <TextFormatToolbar onFormat={handleFormat} />}

              {!simpleMode && allowProjectSelection && postComposer.userProjects.length > 0 && (
                <ProjectToggleButton
                  showProjects={showProjects}
                  selectedCount={postComposer.selectedProjects.length}
                  onToggle={showProjects ? handleCloseProjects : handleOpenProjects}
                />
              )}

              {simpleMode ? (
                <div className="flex items-center gap-2">
                  {VISIBILITY_PRESETS.map(preset => {
                    const Icon = preset.icon;
                    const isActive = postComposer.visibility === preset.key;
                    return (
                      <button
                        key={preset.key}
                        type="button"
                        onClick={() => postComposer.setVisibility(preset.key)}
                        disabled={postComposer.isPosting}
                        className={cn(
                          'px-3 py-1 rounded-full text-xs font-semibold border transition-colors',
                          isActive
                            ? 'bg-tiffany-500 text-white border-tiffany-500 shadow-sm'
                            : 'bg-white dark:bg-muted text-muted-strong border-border hover:border-tiffany-300'
                        )}
                        title={preset.description}
                      >
                        <span className="inline-flex items-center gap-1">
                          <Icon className="w-4 h-4" />
                          {preset.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    postComposer.setVisibility(
                      postComposer.visibility === 'public' ? 'private' : 'public'
                    )
                  }
                  disabled={postComposer.isPosting}
                  className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-tiffany-50 active:bg-tiffany-100 transition-colors text-tiffany-500 disabled:opacity-50 touch-manipulation"
                  title={
                    postComposer.visibility === 'public'
                      ? 'Public - Everyone can see'
                      : 'Private - Only you can see'
                  }
                  aria-label={`Post visibility: ${postComposer.visibility}`}
                >
                  {postComposer.visibility === 'public' ? (
                    <Globe className="w-4 h-4" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <OfflineIndicator isOnline={isOnline} />
              {!simpleMode && <CharacterCounter count={postComposer.content.length} />}

              <Button
                onClick={postComposer.handlePost}
                disabled={isButtonDisabled}
                className="rounded-full px-5 py-2 text-sm font-bold bg-tiffany-500 hover:bg-tiffany-600 active:bg-tiffany-700 text-white shadow-sm disabled:opacity-50 disabled:shadow-none transition-all"
                size="sm"
              >
                {postComposer.isPosting ? 'Posting...' : buttonText}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

TimelineComposer.displayName = 'TimelineComposer';

export default TimelineComposer;
