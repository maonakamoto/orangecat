'use client';

import React from 'react';
import Button from '@/components/ui/Button';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TIMELINE_COPY, TIMELINE_SURFACE } from '@/config/timeline';

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
      <div className="mt-4 flex items-center justify-between border-t border-border-subtle pt-3">
        <div className="flex items-center gap-2">
          {!compact && showOptionsButton && (
            <button
              onClick={onShowOptions}
              className={TIMELINE_SURFACE.iconButton}
              aria-label="Show post options"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          )}
          {selectedProjectCount > 0 && (
            <div className={TIMELINE_SURFACE.chip}>
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
              TIMELINE_SURFACE.buttonPrimary,
              'min-h-11 min-w-20',
              compact && 'px-4 py-2 text-sm'
            )}
            aria-label={isPosting ? 'Posting...' : `Post ${buttonText}`}
          >
            {isPosting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-card border-t-transparent rounded-full animate-spin" />
                <span>{TIMELINE_COPY.postingButton}</span>
              </div>
            ) : (
              buttonText
            )}
          </Button>
        </div>
      </div>

      {loadingProjects && (
        <div className="mt-2 text-xs text-muted-foreground">{TIMELINE_COPY.loadingProjects}</div>
      )}
    </>
  );
}
