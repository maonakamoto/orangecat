'use client';

import React from 'react';
import Button from '@/components/ui/Button';
import { ArrowLeft } from 'lucide-react';
import { TIMELINE_COPY, TIMELINE_SURFACE } from '@/config/timeline';

interface PostComposerFullScreenHeaderProps {
  buttonText: string;
  isPosting: boolean;
  canPost: boolean;
  onClose?: () => void;
  onCancel?: () => void;
  onPost: () => void;
}

export function PostComposerFullScreenHeader({
  buttonText,
  isPosting,
  canPost,
  onClose,
  onCancel,
  onPost,
}: PostComposerFullScreenHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
      <button
        onClick={onClose || onCancel}
        className={TIMELINE_SURFACE.iconButton}
        aria-label="Close composer"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <Button onClick={onPost} disabled={!canPost} className={TIMELINE_SURFACE.buttonPrimary}>
        {isPosting ? TIMELINE_COPY.postingButton : buttonText}
      </Button>
    </div>
  );
}
