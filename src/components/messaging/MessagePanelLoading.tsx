'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

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
        'flex h-full bg-white shadow-lg items-center justify-center',
        fullPage ? 'w-full rounded-none' : 'w-full max-w-5xl rounded-2xl border border-gray-200'
      )}
    >
      <div className="text-center p-10">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-4" />
        <p className="text-gray-600">Loading messages...</p>
      </div>
    </div>
  );

  if (fullPage) {
    return <div className={cn('h-[calc(100vh-4rem)]', className)}>{inner}</div>;
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
