'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { APP_CONTENT_HEIGHT_CLASS } from '@/config/layout-chrome';

interface MessagePanelLoadingProps {
  fullPage: boolean;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export function MessagePanelLoading({
  fullPage,
  isOpen,
  onClose,
  className,
}: MessagePanelLoadingProps) {
  const inner = (
    <div
      className={cn(
        'flex h-full bg-surface-base shadow-sm items-center justify-center',
        fullPage ? 'w-full rounded-none' : 'w-full max-w-5xl rounded-lg border border-default'
      )}
    >
      <div className="text-center p-10">
        <Loader2 className="w-8 h-8 animate-spin text-fg-primary mx-auto mb-4" />
        <p className="text-fg-secondary">Loading messages...</p>
      </div>
    </div>
  );

  if (fullPage) {
    return <div className={cn(APP_CONTENT_HEIGHT_CLASS, className)}>{inner}</div>;
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[80vh] max-h-[700px] p-0">
        <DialogTitle className="sr-only">Messages</DialogTitle>
        <div className="w-full h-full">{inner}</div>
      </DialogContent>
    </Dialog>
  );
}
