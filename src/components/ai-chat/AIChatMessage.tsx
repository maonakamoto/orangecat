'use client';

import { cn } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Bot, User } from 'lucide-react';
import { formatShortTime } from '@/utils/dates';
import { useDisplayCurrency } from '@/hooks/useDisplayCurrency';

interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokens_used?: number;
  cost_btc?: number;
  created_at: string;
}

interface AIChatMessageProps {
  message: AIMessage;
  assistantAvatar?: string | null;
  assistantName?: string;
  userAvatar?: string | null;
  userName?: string;
}

export function AIChatMessage({
  message,
  assistantAvatar,
  assistantName = 'Assistant',
  userAvatar,
  userName = 'You',
}: AIChatMessageProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const { formatAmountBtc } = useDisplayCurrency();

  // Don't render system messages (they're context for the AI)
  if (isSystem) {
    return null;
  }

  return (
    <div className={cn('flex gap-3 py-4 px-4', isUser ? 'bg-muted' : 'bg-card')}>
      <Avatar className="h-8 w-8 flex-shrink-0">
        {isUser ? (
          <>
            <AvatarImage src={userAvatar || undefined} alt={userName} />
            <AvatarFallback className="bg-muted text-fg-secondary">
              <User className="h-4 w-4" />
            </AvatarFallback>
          </>
        ) : (
          <>
            <AvatarImage src={assistantAvatar || undefined} alt={assistantName} />
            <AvatarFallback className="bg-muted text-fg-secondary">
              <Bot className="h-4 w-4" />
            </AvatarFallback>
          </>
        )}
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm text-foreground">
            {isUser ? userName : assistantName}
          </span>
          <span className="text-xs text-muted-dim">{formatShortTime(message.created_at)}</span>
          {!isUser && message.tokens_used && message.tokens_used > 0 && (
            <span className="text-xs text-muted-dim">({message.tokens_used} tokens)</span>
          )}
        </div>
        <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
          {message.content}
        </div>
        {!isUser && message.cost_btc && message.cost_btc > 0 && (
          <div className="mt-2 text-xs text-muted-dim">
            Cost: {formatAmountBtc(message.cost_btc)}
          </div>
        )}
      </div>
    </div>
  );
}

export type { AIMessage };
