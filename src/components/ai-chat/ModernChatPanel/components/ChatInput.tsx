/**
 * CHAT INPUT COMPONENT
 * Textarea with send button
 */

import { useRef } from 'react';
import { cn } from '@/lib/utils';
import { Send, Square } from 'lucide-react';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isLoading: boolean;
  onStop?: () => void;
}

export function ChatInput({ value, onChange, onSend, isLoading, onStop }: ChatInputProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    // Reset height to auto to get the correct scrollHeight
    e.target.style.height = 'auto';
    // Set height to scrollHeight, max 200px
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="border-t border-border-subtle bg-background p-4">
      <div className="mx-auto flex max-w-3xl items-end gap-2">
        <div className="relative flex-1">
          <textarea
            ref={inputRef}
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Message your Cat..."
            rows={1}
            className={cn(
              'max-h-[200px] w-full resize-none rounded-md border border-border-subtle bg-background px-4 py-3 pr-12 text-foreground',
              'focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring',
              'text-sm leading-relaxed placeholder:text-muted-dim'
            )}
          />
        </div>
        {isLoading && onStop ? (
          <button
            onClick={onStop}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md bg-destructive text-destructive-foreground transition-colors hover:bg-destructive/90"
          >
            <Square className="h-4 w-4 fill-current" />
          </button>
        ) : (
          <button
            onClick={onSend}
            disabled={!value.trim() || isLoading}
            className={cn(
              'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md transition-colors',
              value.trim() && !isLoading
                ? 'bg-foreground text-background hover:bg-foreground/90'
                : 'bg-muted text-muted-dim cursor-not-allowed'
            )}
          >
            <Send className="h-5 w-5" />
          </button>
        )}
      </div>
      <p className="mt-2 text-center text-xs text-muted-dim">
        Private workspace. Cat can use context and approved actions.
      </p>
    </div>
  );
}
