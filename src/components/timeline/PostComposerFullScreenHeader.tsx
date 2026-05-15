'use client';

import React from 'react';
import Button from '@/components/ui/Button';
import { ArrowLeft } from 'lucide-react';

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
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-border">
      <button
        onClick={onClose || onCancel}
        className="p-2 -ml-2 min-h-11 min-w-11 flex items-center justify-center"
        aria-label="Close composer"
      >
        <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-muted-foreground" />
      </button>
      <Button
        onClick={onPost}
        disabled={!canPost}
        className="bg-tiffany-500 hover:bg-tiffany-600 text-white rounded-full px-5 min-h-9 disabled:opacity-50"
      >
        {isPosting ? 'Posting...' : buttonText}
      </Button>
    </div>
  );
}
