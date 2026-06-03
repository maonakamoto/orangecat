/**
 * EMPTY STATE — shown before the first message
 */

import { cn } from '@/lib/utils';
import { CAT_HUB_COPY } from '@/config/cat-hub';

interface EmptyStateProps {
  suggestions: string[];
  hasContext: boolean;
  isLoadingSuggestions: boolean;
  onSuggestionClick: (suggestion: string) => void;
  isNewUser?: boolean;
  variant?: 'default' | 'focus';
}

export function EmptyState({
  suggestions,
  hasContext: _hasContext,
  isLoadingSuggestions,
  onSuggestionClick,
  isNewUser,
  variant = 'focus',
}: EmptyStateProps) {
  const isFocus = variant === 'focus';
  const title = isNewUser ? CAT_HUB_COPY.greetingNewUser : CAT_HUB_COPY.greeting;

  return (
    <div className={cn('oc-chat-empty', !isFocus && 'py-12')}>
      <h2
        className={
          isFocus
            ? 'max-w-lg text-2xl font-semibold tracking-tight text-foreground sm:text-3xl'
            : 'mb-2 text-2xl font-semibold text-foreground'
        }
      >
        {title}
      </h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{CAT_HUB_COPY.greetingHint}</p>

      {(isLoadingSuggestions || suggestions.length > 0) && (
        <div className="mt-8 flex w-full max-w-2xl flex-col gap-2 sm:grid sm:grid-cols-2">
          {isLoadingSuggestions
            ? [1, 2, 3, 4].map(i => (
                <div key={i} className="h-11 animate-pulse rounded-lg bg-muted" />
              ))
            : suggestions.map((suggestion, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onSuggestionClick(suggestion)}
                  className="oc-chat-suggestion"
                >
                  {suggestion}
                </button>
              ))}
        </div>
      )}
    </div>
  );
}
