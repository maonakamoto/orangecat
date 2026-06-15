/**
 * CHAT INPUT — composer pinned to the bottom of the panel
 */

import { useRef } from 'react';
import { cn } from '@/lib/utils';
import { Send, Square, Trash2 } from 'lucide-react';
import { CAT_HUB_COPY } from '@/config/cat-hub';
import { CHAT_CONTENT_MAX_WIDTH_CLASS } from '@/config/layout-chrome';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isLoading: boolean;
  onStop?: () => void;
  variant?: 'default' | 'focus';
  hasMessages?: boolean;
  onClearChat?: () => void;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  isLoading,
  onStop,
  variant = 'focus',
  hasMessages,
  onClearChat,
}: ChatInputProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isFocus = variant === 'focus';

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className={cn(isFocus ? 'oc-chat-composer-wrap' : 'border-t border-subtle p-4')}>
      <div className={cn('mx-auto flex w-full items-end gap-2', CHAT_CONTENT_MAX_WIDTH_CLASS)}>
        {isFocus && hasMessages && onClearChat && (
          <button
            type="button"
            onClick={onClearChat}
            className="mb-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-fg-secondary transition-colors hover:bg-surface-raised hover:text-fg-primary"
            aria-label="Clear chat"
            title="Clear chat"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
        <div className={cn('oc-chat-composer', !isFocus && 'rounded-md')}>
          <textarea
            ref={inputRef}
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={CAT_HUB_COPY.composerPlaceholder}
            rows={1}
            className="oc-chat-composer-input"
          />
          {isLoading && onStop ? (
            <button
              type="button"
              onClick={onStop}
              className="mb-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-fg-primary text-fg-inverted transition-opacity hover:opacity-90"
              aria-label="Stop generating"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onSend}
              disabled={!value.trim() || isLoading}
              className={cn(
                'mb-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-colors',
                value.trim() && !isLoading
                  ? 'bg-fg-primary text-fg-inverted hover:opacity-90'
                  : 'cursor-not-allowed text-fg-secondary'
              )}
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
