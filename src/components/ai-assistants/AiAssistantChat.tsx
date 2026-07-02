'use client';

/**
 * Public chat with a user-created AI assistant.
 *
 * Lazily creates a conversation on the first message, then streams the exchange
 * through the existing /conversations/[convId]/messages endpoint (which meters
 * Cat Credits server-side). Handles the unauthenticated and out-of-credits cases
 * with clear, actionable CTAs.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import { AIChatMessage, AIChatInput, type AIMessage } from '@/components/ai-chat';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { API_ROUTES } from '@/config/api-routes';
import { ROUTES } from '@/config/routes';
import { useAuth } from '@/hooks/useAuth';
import { useDisplayCurrency } from '@/hooks/useDisplayCurrency';
import { logger } from '@/utils/logger';

interface AiAssistantChatProps {
  assistantId: string;
  assistantName: string;
  assistantAvatar?: string | null;
  welcomeMessage?: string | null;
  pricing: { isFree: boolean; amount: number; suffix: string };
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
}

export default function AiAssistantChat({
  assistantId,
  assistantName,
  assistantAvatar,
  welcomeMessage,
  pricing,
}: AiAssistantChatProps) {
  const { isAuthenticated } = useAuth();
  const { formatAmountBtc } = useDisplayCurrency();
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [convId, setConvId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creditsNeeded, setCreditsNeeded] = useState<{ balance: number; required: number } | null>(
    null
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  const ensureConversation = useCallback(async (): Promise<string> => {
    if (convId) {
      return convId;
    }
    const res = await fetch(API_ROUTES.AI_ASSISTANTS.CONVERSATIONS(assistantId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    const json = (await res.json()) as ApiEnvelope<{ id: string }>;
    if (!res.ok || !json.data?.id) {
      throw new Error(json.error?.message || 'Could not start a conversation');
    }
    setConvId(json.data.id);
    return json.data.id;
  }, [assistantId, convId]);

  const send = useCallback(
    async (content: string) => {
      setError(null);
      setCreditsNeeded(null);
      const optimistic: AIMessage = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, optimistic]);
      setSending(true);
      try {
        const cid = await ensureConversation();
        const res = await fetch(API_ROUTES.AI_ASSISTANTS.CONVERSATION_MESSAGES(assistantId, cid), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        });
        const json = (await res.json()) as ApiEnvelope<{
          userMessage: AIMessage;
          assistantMessage: AIMessage;
        }>;

        if (res.status === 402) {
          const d = (json.error?.details ?? {}) as {
            currentBalance?: number;
            requiredAmount?: number;
          };
          setCreditsNeeded({ balance: d.currentBalance ?? 0, required: d.requiredAmount ?? 0 });
          setMessages(prev => prev.filter(m => m.id !== optimistic.id));
          return;
        }
        if (!res.ok || !json.data) {
          throw new Error(json.error?.message || 'Failed to send message');
        }
        // Replace the optimistic bubble with the persisted pair.
        setMessages(prev => [
          ...prev.filter(m => m.id !== optimistic.id),
          json.data!.userMessage,
          json.data!.assistantMessage,
        ]);
      } catch (err) {
        logger.error('Assistant chat send failed', err, 'AiAssistantChat');
        setMessages(prev => prev.filter(m => m.id !== optimistic.id));
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      } finally {
        setSending(false);
      }
    },
    [assistantId, ensureConversation]
  );

  const priceLabel = pricing.isFree
    ? 'Free to chat'
    : `${formatAmountBtc(pricing.amount)}${pricing.suffix} · paid from your Cat Credits`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-5 w-5 text-accent-warm" />
          Chat with {assistantName}
        </CardTitle>
        <p className="text-sm text-fg-secondary">{priceLabel}</p>
      </CardHeader>
      <CardContent>
        {!isAuthenticated ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-fg-secondary">Sign in to chat with this assistant.</p>
            <Link href={ROUTES.AUTH_LOGIN}>
              <Button variant="accent">Sign in to chat</Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col">
            <div
              ref={scrollRef}
              className="flex h-[50vh] min-h-[20rem] flex-col gap-0 overflow-y-auto rounded-md border border-subtle bg-surface-base"
            >
              {welcomeMessage && messages.length === 0 && (
                <AIChatMessage
                  message={{
                    id: 'welcome',
                    role: 'assistant',
                    content: welcomeMessage,
                    created_at: new Date().toISOString(),
                  }}
                  assistantName={assistantName}
                  assistantAvatar={assistantAvatar}
                />
              )}
              {messages.length === 0 && !welcomeMessage && (
                <p className="px-4 py-8 text-center text-sm text-fg-tertiary">
                  Say hello to start the conversation.
                </p>
              )}
              {messages.map(m => (
                <AIChatMessage
                  key={m.id}
                  message={m}
                  assistantName={assistantName}
                  assistantAvatar={assistantAvatar}
                />
              ))}
              {sending && (
                <p className="px-4 py-3 text-sm text-fg-tertiary">{assistantName} is typing…</p>
              )}
            </div>

            {creditsNeeded && (
              <div className="mt-3 rounded-md border border-subtle bg-surface-raised p-3 text-sm">
                <p className="text-fg-primary">
                  Not enough Cat Credits — you need {formatAmountBtc(creditsNeeded.required)} and
                  have {formatAmountBtc(creditsNeeded.balance)}.
                </p>
                <Link href={ROUTES.SETTINGS_AI} className="mt-2 inline-block">
                  <Button variant="accent" size="sm">
                    Top up Cat Credits
                  </Button>
                </Link>
              </div>
            )}
            {error && <p className="mt-3 text-sm text-status-negative">{error}</p>}

            <div className="mt-3">
              <AIChatInput
                onSend={send}
                disabled={sending}
                placeholder={`Message ${assistantName}…`}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
