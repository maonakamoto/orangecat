'use client';

import React from 'react';
import Button from '@/components/ui/Button';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PostComposerInlineControlsProps {
  buttonText: string;
  isPosting: boolean;
  canPost: boolean;
  compact: boolean;
  loadingProjects: boolean;
  selectedProjectCount: number;
  showOptionsButton: boolean;
  onPost: () => void;
  onCancel?: () => void;
  onShowOptions: () => void;
}

export function PostComposerInlineControls({
  buttonText,
  isPosting,
  canPost,
  compact,
  loadingProjects,
  selectedProjectCount,
  showOptionsButton,
  onPost,
  onCancel,
  onShowOptions,
}: PostComposerInlineControlsProps) {
  return (
    <>
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
        <div className="flex items-center gap-2">
          {!compact && showOptionsButton && (
            <button
              onClick={onShowOptions}
              className="text-gray-700 dark:text-muted-foreground hover:text-gray-700 dark:hover:text-muted-foreground p-3 min-h-11 min-w-11 flex items-center justify-center"
              aria-label="Show post options"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          )}
          {selectedProjectCount > 0 && (
            <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
              {selectedProjectCount} project{selectedProjectCount > 1 ? 's' : ''}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onCancel && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={isPosting}
              className="text-muted-foreground"
            >
              Cancel
            </Button>
          )}
          <Button
            onClick={onPost}
            disabled={!canPost}
            className={cn(
              'bg-gradient-to-r from-orange-500 to-yellow-500',
              'hover:from-orange-600 hover:to-yellow-600',
              'disabled:from-gray-300 disabled:to-gray-300',
              'text-white px-6 py-2 rounded-full font-semibold',
              'transition-all shadow-sm hover:shadow-md',
              'disabled:shadow-none min-h-11 min-w-20',
              compact && 'px-4 py-2 text-sm'
            )}
            aria-label={isPosting ? 'Posting...' : `Post ${buttonText}`}
          >
            {isPosting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Posting...</span>
              </div>
            ) : (
              buttonText
            )}
          </Button>
        </div>
      </div>

      {loadingProjects && (
        <div className="mt-2 text-xs text-gray-700 dark:text-muted-foreground">
          Loading your projects...
        </div>
      )}

      <div className="hidden sm:block mt-2 text-xs text-muted-dim text-center">
        Press Ctrl+Enter to post
      </div>
    </>
  );
}
