'use client';

import { useState, useRef, useCallback, KeyboardEvent } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { logger } from '@/utils/logger';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface AIChatInputProps {
  onSend: (content: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}

export function AIChatInput({
  onSend,
  disabled = false,
  placeholder = 'Type a message...',
}: AIChatInputProps) {
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(async () => {
    if (!content.trim() || isSending || disabled) {
      return;
    }

    const message = content.trim();
    setContent('');
    setIsSending(true);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      await onSend(message);
    } catch (error) {
      logger.error('Failed to send message', error, 'AI');
      // Restore content on error
      setContent(message);
    } finally {
      setIsSending(false);
    }
  }, [content, isSending, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, []);

  return (
    <div className="border-t border-gray-200 dark:border-border bg-white dark:bg-card p-4">
      <div className="flex items-end gap-3">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isSending}
            className={cn(
              'w-full px-4 py-3 pr-12 border border-gray-200 dark:border-border rounded-lg resize-none',
              'bg-white dark:bg-background text-gray-900 dark:text-foreground',
              'focus:outline-none focus:ring-2 focus:ring-tiffany-500 focus:border-transparent',
              'max-h-48 min-h-12 text-sm',
              'placeholder:text-gray-400 dark:placeholder:text-muted-foreground',
              (disabled || isSending) && 'opacity-50 cursor-not-allowed'
            )}
            rows={1}
          />
        </div>

        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!content.trim() || isSending || disabled}
          className={cn(
            'px-4 py-3 bg-tiffany-500 hover:bg-tiffany-600 text-white rounded-lg',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors duration-200 flex-shrink-0',
            'min-w-12 min-h-12'
          )}
          aria-label="Send message"
        >
          {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </Button>
      </div>

      <p className="text-xs text-gray-400 dark:text-muted-foreground mt-2">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
}
