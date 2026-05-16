'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/Card';
import { GRADIENTS } from '@/config/gradients';
import BottomSheet from '@/components/ui/BottomSheet';
import AvatarLink from '@/components/ui/AvatarLink';
import { Globe, ChevronDown, ImageIcon } from 'lucide-react';
import { getInitial } from '@/utils/string';
import { usePostComposer, type PostComposerOptions } from '@/hooks/usePostComposerNew';
import { useContentEditableEditor } from '@/hooks/useContentEditableEditor';
import { cn } from '@/lib/utils';
import { sanitizeHtml } from '@/lib/validation';
import { TextFormatToolbar, ComposerMessages, CharacterCounter } from './ComposerShared';
import { PostComposerFullScreenHeader } from './PostComposerFullScreenHeader';
import { PostComposerInlineControls } from './PostComposerInlineControls';

const LazyProjectSelectionModal = dynamic(() => import('./ProjectSelectionModal'), {
  ssr: false,
  loading: () => null,
});

export interface PostComposerMobileProps extends PostComposerOptions {
  placeholder?: string;
  buttonText?: string;
  showVisibilityToggle?: boolean;
  showProjectSelection?: boolean;
  autoFocus?: boolean;
  onCancel?: () => void;
  compact?: boolean;
  fullScreen?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

const PostComposerMobile: React.FC<PostComposerMobileProps> = ({
  placeholder = "What's on your mind?",
  buttonText = 'Post',
  showVisibilityToggle = true,
  showProjectSelection = false,
  autoFocus = false,
  onCancel,
  compact = false,
  fullScreen = false,
  isOpen,
  onClose,
  ...composerOptions
}) => {
  const { user, profile } = useAuth();
  const composer = usePostComposer({
    ...composerOptions,
    allowProjectSelection: showProjectSelection,
    onSuccess: () => {
      composerOptions.onSuccess?.();
      if (fullScreen && onClose) {
        onClose();
      }
    },
  });

  const [isOptionsSheetOpen, setIsOptionsSheetOpen] = useState(false);

  const { editorRef, handleInput, handlePaste, handleKeyDown, handleFormat } =
    useContentEditableEditor({
      content: composer.content,
      onContentChange: composer.setContent,
      onSubmit: composer.handlePost,
      onCancel: onCancel || (fullScreen ? onClose : undefined),
      maxHeight: fullScreen ? 480 : 320,
      disabled: composer.isPosting,
      sanitizer: sanitizeHtml,
    });

  useEffect(() => {
    if ((autoFocus || fullScreen || isOpen) && editorRef.current && !compact) {
      setTimeout(() => editorRef.current?.focus(), 100);
    }
  }, [autoFocus, compact, fullScreen, isOpen, editorRef]);

  const renderComposerContent = () => (
    <>
      {fullScreen && (
        <PostComposerFullScreenHeader
          buttonText={buttonText}
          isPosting={composer.isPosting}
          canPost={composer.canPost}
          onClose={onClose}
          onCancel={onCancel}
          onPost={composer.handlePost}
        />
      )}

      <div className={cn('flex gap-3', fullScreen ? 'px-4 pt-4' : '')}>
        <div className={cn('flex-shrink-0', fullScreen ? 'pt-1' : '')}>
          {fullScreen ? (
            <AvatarLink
              username={profile?.username || null}
              userId={user?.id || null}
              avatarUrl={profile?.avatar_url || user?.user_metadata?.avatar_url || null}
              name={profile?.name || user?.user_metadata?.name || 'User'}
              size={44}
            />
          ) : (
            !compact && (
              <div className="flex-shrink-0">
                {profile?.avatar_url || user?.user_metadata?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- Dynamic user avatar with onError fallback
                  <img
                    src={profile?.avatar_url || user?.user_metadata?.avatar_url || ''}
                    alt={user?.user_metadata?.name || 'User avatar'}
                    className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
                    onError={e => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div
                    className={`w-10 h-10 ${GRADIENTS.brandOrangeYellow} rounded-full flex items-center justify-center border-2 border-white shadow-sm`}
                  >
                    <span className="text-white font-semibold text-sm">
                      {getInitial(user?.user_metadata?.name || user?.email)}
                    </span>
                  </div>
                )}
              </div>
            )
          )}
        </div>

        <div className="flex-1 min-w-0">
          {fullScreen && showProjectSelection && (
            <button
              onClick={() => setIsOptionsSheetOpen(true)}
              className="mb-3 px-3 py-1.5 bg-muted hover:bg-gray-200 dark:hover:bg-muted/80 rounded-full text-sm font-medium text-gray-700 dark:text-muted-foreground flex items-center gap-1 transition-colors min-h-8"
            >
              {composer.selectedProjects.length > 0
                ? `${composer.selectedProjects.length} project${composer.selectedProjects.length > 1 ? 's' : ''}`
                : 'Crosspost to projects'}
              <ChevronDown className="w-4 h-4" />
            </button>
          )}

          {!compact && !fullScreen && (
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">
                  {user?.user_metadata?.name ||
                    (typeof user?.email === 'string' && user.email.includes('@')
                      ? user.email.split('@')[0]
                      : user?.email || 'You')}
                </div>
                {showVisibilityToggle && (
                  <button
                    onClick={() => setIsOptionsSheetOpen(true)}
                    className="flex items-center gap-1 text-xs text-gray-700 dark:text-foreground hover:text-gray-700 dark:hover:text-foreground mt-1 min-h-11 px-2"
                    aria-expanded={isOptionsSheetOpen}
                    aria-controls="post-options-sheet"
                  >
                    <Globe className="w-3 h-3" />
                    {composer.visibility === 'public' ? 'Public' : 'Private'}
                    <ChevronDown className="w-3 h-3 transition-transform" />
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="relative">
            <div
              ref={editorRef}
              contentEditable
              onInput={handleInput}
              onPaste={handlePaste}
              onKeyDown={handleKeyDown}
              data-placeholder={fullScreen ? "What's happening?" : placeholder}
              className={cn(
                'w-full border-0 bg-transparent',
                'focus:outline-none focus:ring-0',
                'leading-relaxed break-words',
                'max-h-[60vh] overflow-y-auto',
                'empty:before:content-[attr(data-placeholder)]',
                'empty:before:text-gray-500 dark:empty:before:text-muted-foreground',
                'empty:before:pointer-events-none',
                fullScreen
                  ? 'text-xl min-h-[120px]'
                  : compact
                    ? 'text-sm min-h-10'
                    : 'text-base min-h-[60px]',
                composer.isPosting && 'opacity-50 cursor-not-allowed'
              )}
              suppressContentEditableWarning
              aria-label="Write your post"
              aria-describedby="character-count"
            />
            <CharacterCounter
              count={composer.characterCount}
              max={composerOptions.maxLength || 500}
              className="mt-4"
            />
          </div>
        </div>
      </div>

      {isOptionsSheetOpen && showProjectSelection && (
        <LazyProjectSelectionModal
          isOpen={isOptionsSheetOpen}
          onClose={() => setIsOptionsSheetOpen(false)}
          projects={composer.userProjects}
          selectedProjects={composer.selectedProjects}
          onToggleProject={composer.toggleProjectSelection}
          loading={composer.loadingProjects}
        />
      )}

      <ComposerMessages
        error={composer.error}
        success={composer.postSuccess}
        onClearError={composer.clearError}
        onRetry={composer.retry}
        retryCount={composer.retryCount}
      />

      {fullScreen && (
        <div className="flex items-center gap-4 px-4 pt-4 border-t border-border mt-4">
          <button
            className="p-2 min-h-11 min-w-11 flex items-center justify-center text-gray-400 dark:text-muted-foreground cursor-not-allowed rounded-full transition-colors"
            aria-label="Add image (coming soon)"
            title="Image upload (coming soon)"
            disabled
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          <TextFormatToolbar onFormat={handleFormat} variant="orange" size="md" />
        </div>
      )}

      {!fullScreen && (
        <PostComposerInlineControls
          buttonText={buttonText}
          isPosting={composer.isPosting}
          canPost={composer.canPost}
          compact={compact}
          loadingProjects={composer.loadingProjects}
          selectedProjectCount={composer.selectedProjects.length}
          showOptionsButton={showProjectSelection || showVisibilityToggle}
          onPost={composer.handlePost}
          onCancel={onCancel}
          onShowOptions={() => setIsOptionsSheetOpen(true)}
        />
      )}
    </>
  );

  if (fullScreen) {
    return (
      <BottomSheet
        isOpen={isOpen !== undefined ? isOpen : true}
        onClose={onClose || onCancel || (() => {})}
        maxHeight="100vh"
        showCloseButton={false}
        closeOnOverlayClick={true}
      >
        {renderComposerContent()}
      </BottomSheet>
    );
  }

  return (
    <Card
      className={cn(
        'border-l-4 border-l-orange-500 bg-gradient-to-r from-orange-50/30 via-white to-yellow-50/20',
        'shadow-sm hover:shadow-md transition-all duration-200',
        compact ? 'rounded-lg' : 'rounded-xl'
      )}
    >
      <CardContent className={cn('p-4', compact && 'p-3')}>{renderComposerContent()}</CardContent>
    </Card>
  );
};

export default PostComposerMobile;
