/**
 * EMPTY STATE COMPONENT
 * Displays when no messages, with suggestions
 */

import { cn } from '@/lib/utils';
import { GRADIENTS } from '@/config/gradients';
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
    <div className="flex flex-col items-center justify-center h-full text-center px-4 py-12">
      <div
        className={cn(
          GRADIENTS.brandOrangeBr,
          'w-16 h-16 rounded-full flex items-center justify-center mb-6 shadow-lg'
        )}
      >
        <Cat className="h-8 w-8 text-white" />
      </div>
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-foreground mb-2">
        {isNewUser ? 'Welcome — I’m your Cat' : 'Hi, I’m your Cat'}
      </h2>
      <p className="text-gray-500 dark:text-muted-foreground mb-8 max-w-md">
        {isNewUser ? (
          <>
            I help you earn, fund, lend, invest, and govern — with any currency, under any identity.
            What would you like to do?
          </>
        ) : hasContext ? (
          <>
            I know your profile and what you're working on. Ask me anything — I'll give you
            personalised advice.
          </>
        ) : (
          <>
            I'm here to help with your projects, products, and ideas. Ask me anything — only you can
            see our conversations.
          </>
        )}
      </p>
      {!isNewUser && hasContext && (
        <p className="text-xs text-tiffany-600 mb-4 flex items-center gap-1">
          <Sparkles className="h-3 w-3" />
          Personalised based on your profile and activity
        </p>
      )}
      <div className="flex flex-wrap justify-center gap-2 max-w-lg">
        {isLoadingSuggestions ? (
          // Loading skeleton for suggestions
          <>
            {[1, 2, 3, 4].map(i => (
              <div
                key={i}
                className="h-9 bg-gray-100 dark:bg-muted rounded-full animate-pulse"
                style={{ width: `${100 + Math.random() * 80}px` }}
              />
            ))}
          </>
        ) : (
          suggestions.map((suggestion, i) => (
            <button
              key={i}
              onClick={() => onSuggestionClick(suggestion)}
              className={cn(
                'px-4 py-2 rounded-full text-sm transition-colors text-left',
                hasContext
                  ? 'bg-tiffany-50 hover:bg-tiffany-100 text-tiffany-700 border border-tiffany-200'
                  : 'bg-gray-100 dark:bg-muted hover:bg-gray-200 dark:hover:bg-muted/80 text-gray-700 dark:text-foreground'
              )}
            >
              {suggestion}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
