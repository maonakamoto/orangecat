'use client';

import React from 'react';
import { Send } from 'lucide-react';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { Message } from '@/features/messaging/types';
import { useMessageComposer } from './useMessageComposer';
import { MessageActorSelector } from './MessageActorSelector';

interface MessageComposerProps {
  conversationId: string;
  onMessageSent: (message: Message) => void;
  onMessageFailed?: (tempId: string, errorMessage?: string) => void;
  onMessageConfirmed?: (tempId: string, realMessage: Message) => void;
}

export default function MessageComposer({
  conversationId,
  onMessageSent,
  onMessageFailed,
  onMessageConfirmed,
}: MessageComposerProps) {
  const {
    content,
    isSending,
    textareaRef,
    selectedActor,
    selectedActorId,
    setSelectedActorId,
    showActorSelector,
    personalActor,
    groupActors,
    typingText,
    handleSubmit,
    handleKeyDown,
    handleTextareaChange,
  } = useMessageComposer({ conversationId, onMessageSent, onMessageFailed, onMessageConfirmed });

  return (
    <div
      className="border-t border-border-subtle bg-background p-3 pb-safe sm:p-4 md:pb-4"
      style={{
        paddingBottom: 'max(0.75rem, calc(0.75rem + env(safe-area-inset-bottom, 0px) + 4rem))',
      }}
    >
      {showActorSelector && selectedActor && (
        <MessageActorSelector
          selectedActor={selectedActor}
          selectedActorId={selectedActorId}
          personalActor={personalActor}
          groupActors={groupActors}
          onSelectActor={setSelectedActorId}
        />
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-2 sm:gap-3">
        <div className="flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className={cn(
              'w-full resize-none rounded-md border border-border-subtle py-2.5 pl-3 pr-3 text-sm sm:py-3 sm:pl-4 sm:pr-4 sm:text-base',
              'bg-background text-foreground',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring',
              'max-h-32 min-h-11',
              'placeholder:text-muted-dim',
              isSending && 'opacity-50 cursor-not-allowed'
            )}
            rows={1}
            disabled={isSending}
          />
        </div>

        <Button
          type="submit"
          size="sm"
          className={cn(
            'rounded-md bg-foreground px-3 py-2.5 text-background hover:bg-foreground/90 sm:px-4 sm:py-3',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors duration-200 flex-shrink-0',
            'min-w-11 sm:min-w-[auto]'
          )}
          disabled={!content.trim() || isSending}
          aria-label="Send message"
        >
          {isSending ? (
            <div className="h-4 w-4 animate-spin rounded-sm border-2 border-background border-t-transparent sm:h-5 sm:w-5" />
          ) : (
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
          )}
        </Button>
      </form>

      {typingText && (
        <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
          <span className="inline-flex gap-0.5">
            <span
              className="h-1.5 w-1.5 animate-bounce rounded-sm bg-muted-foreground"
              style={{ animationDelay: '0ms' }}
            />
            <span
              className="h-1.5 w-1.5 animate-bounce rounded-sm bg-muted-foreground"
              style={{ animationDelay: '150ms' }}
            />
            <span
              className="h-1.5 w-1.5 animate-bounce rounded-sm bg-muted-foreground"
              style={{ animationDelay: '300ms' }}
            />
          </span>
          <span>{typingText}</span>
        </div>
      )}
    </div>
  );
}
