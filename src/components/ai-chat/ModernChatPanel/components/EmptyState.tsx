/**
 * EMPTY STATE COMPONENT
 * Displays when no messages, with suggestions
 */

import { Cat, Sparkles } from 'lucide-react';

interface EmptyStateProps {
  suggestions: string[];
  hasContext: boolean;
  isLoadingSuggestions: boolean;
  onSuggestionClick: (suggestion: string) => void;
  isNewUser?: boolean;
}

export function EmptyState({
  suggestions,
  hasContext,
  isLoadingSuggestions,
  onSuggestionClick,
  isNewUser,
}: EmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-md border border-border-subtle bg-muted">
        <Cat className="h-8 w-8 text-foreground" />
      </div>
      <h2 className="text-2xl font-semibold text-foreground mb-2">
        {isNewUser ? 'Start with Cat' : 'Ask Cat'}
      </h2>
      <p className="text-muted-foreground mb-8 max-w-md">
        {isNewUser ? (
          <>
            Describe what you want to create, fund, sell, coordinate, or improve. Cat will turn it
            into practical next steps.
          </>
        ) : hasContext ? (
          <>
            Cat can use your profile, activity, and context documents to give more specific advice.
          </>
        ) : (
          <>
            Ask about projects, products, wallets, tasks, groups, or strategy. Add context later for
            more precise answers.
          </>
        )}
      </p>
      {!isNewUser && hasContext && (
        <p className="mb-4 flex items-center gap-1 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3" />
          Personalized by your context
        </p>
      )}
      <div className="flex flex-wrap justify-center gap-2 max-w-lg">
        {isLoadingSuggestions ? (
          <>
            {[1, 2, 3, 4].map(i => (
              <div
                key={i}
                className="h-9 animate-pulse rounded-sm bg-muted"
                style={{ width: `${110 + i * 18}px` }}
              />
            ))}
          </>
        ) : (
          suggestions.map((suggestion, i) => (
            <button
              key={i}
              onClick={() => onSuggestionClick(suggestion)}
              className="rounded-sm border border-border-subtle bg-muted px-4 py-2 text-left text-sm text-foreground transition-colors hover:border-border-strong hover:bg-muted/80"
            >
              {suggestion}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
