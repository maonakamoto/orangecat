'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TIMELINE_SURFACE } from '@/config/timeline';

interface DeletePostDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isDeleting?: boolean;
  postPreview?: string;
}

export function DeletePostDialog({
  isOpen,
  onClose,
  onConfirm,
  isDeleting = false,
  postPreview,
}: DeletePostDialogProps) {
  // Lock body scroll when dialog is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isDeleting) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  const handleConfirm = async () => {
    try {
      await onConfirm();
    } catch {
      // Error handling is done in the parent component
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={isDeleting ? undefined : onClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-sm rounded-md border border-border-subtle bg-background shadow-sm animate-in fade-in-0 zoom-in-95 duration-200">
        <div className="p-6">
          {/* Icon */}
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-md border border-destructive/20 bg-destructive/10">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>

          {/* Title */}
          <h2 className="text-lg font-semibold text-foreground text-center mb-2">Delete post?</h2>

          {/* Description */}
          <p className="text-muted-foreground text-center text-sm mb-2">
            This can&apos;t be undone and it will be removed from your profile, the timeline, and
            search results.
          </p>

          {/* Post preview */}
          {postPreview && (
            <div className="mt-4 rounded-md border border-border-subtle bg-muted p-3">
              <p className="text-foreground text-sm line-clamp-3">{postPreview}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2 mt-6">
            <Button
              onClick={handleConfirm}
              disabled={isDeleting}
              className="w-full rounded-md bg-red-600 py-3 font-semibold text-white hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>

            <Button
              onClick={onClose}
              disabled={isDeleting}
              variant="outline"
              className={`w-full py-3 font-semibold ${TIMELINE_SURFACE.chip}`}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DeletePostDialog;
