import { useCallback, useEffect, useRef, useState } from 'react';
import { readEventStream } from '@/lib/sse';
import { logger } from '@/utils/logger';
import { API_ROUTES } from '@/config/api-routes';
import { useUserCurrency } from '@/hooks/useUserCurrency';
import { STORAGE_KEYS } from '@/config/storage-keys';
import type {
  Message,
  CatAction,
  ExecActionResult,
  ToolCallEvent,
  PrefillProposal,
} from '../types';
import { useChatHistory } from './useChatHistory';

const STREAM_TIMEOUT_MS = 60_000;

/**
 * Collect the page the user navigated FROM before reaching Cat. Same-origin only.
 * Returns undefined when there's no usable referrer (direct nav, cross-origin, etc.).
 */
function readLastVisitedPath(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }
  // Prefer the sessionStorage breadcrumb (set by route-tracker) when present —
  // it survives refresh and direct cat-page loads. Falls back to document.referrer.
  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEYS.LAST_VISITED_PATH);
    if (stored && stored.startsWith('/') && !stored.startsWith('/dashboard/cat')) {
      return stored;
    }
  } catch {
    /* sessionStorage may be unavailable; fall through */
  }
  const ref = document.referrer;
  if (!ref) {
    return undefined;
  }
  try {
    const refUrl = new URL(ref);
    if (refUrl.origin !== window.location.origin) {
      return undefined;
    }
    if (refUrl.pathname.startsWith('/dashboard/cat')) {
      return undefined;
    }
    return refUrl.pathname;
  } catch {
    return undefined;
  }
}

function readLocale(): string {
  if (typeof navigator === 'undefined') {
    return 'en-US';
  }
  return navigator.language || 'en-US';
}

interface UseChatMessagesOptions {
  selectedModel: string;
  onPendingResult?: () => void;
  /**
   * Fires once per send attempt after the request settles (success, error,
   * or abort). Used to refresh the quota meter so the visible count tracks
   * the platform's daily counter without a page reload.
   */
  onMessageSent?: () => void;
}

export function useChatMessages({
  selectedModel,
  onPendingResult,
  onMessageSent,
}: UseChatMessagesOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const onPendingResultRef = useRef(onPendingResult);
  onPendingResultRef.current = onPendingResult;
  const onMessageSentRef = useRef(onMessageSent);
  onMessageSentRef.current = onMessageSent;
  const preferredCurrency = useUserCurrency();

  const { isLoadingHistory } = useChatHistory(setMessages);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) {
        return;
      }

      setError(null);

      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);
      setIsLoading(true);

      const assistantId = `assistant-${Date.now()}`;
      setMessages(prev => [
        ...prev,
        { id: assistantId, role: 'assistant', content: '', timestamp: new Date() },
      ]);

      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      const timeout = setTimeout(() => abortController.abort(), STREAM_TIMEOUT_MS);

      try {
        const res = await fetch(API_ROUTES.CAT.CHAT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: content,
            model: selectedModel !== 'auto' ? selectedModel : undefined,
            stream: true,
            preferredCurrency,
            locale: readLocale(),
            lastVisitedPath: readLastVisitedPath(),
          }),
          signal: abortController.signal,
        });

        if (!res.ok || !res.body) {
          let msg = 'Failed to get response';
          try {
            const data = await res.json();
            // standardResponse envelope: { success:false, error:{code,message,details} }.
            // Prefer error.message; fall back through legacy shapes so anything
            // truthy beats the generic default.
            msg =
              data?.error?.message ||
              data?.details?.message ||
              (typeof data?.error === 'string' ? data.error : undefined) ||
              msg;
          } catch {}
          throw new Error(msg);
        }

        let modelUsed = selectedModel;
        let providerUsed: string | undefined;
        let actions: CatAction[] | undefined;
        let execResults: ExecActionResult[] | undefined;
        let quickReplies: string[] | undefined;
        let suggestUpgrade = false;

        await readEventStream(res.body, (json: unknown) => {
          const event = json as {
            content?: string;
            done?: boolean;
            usage?: unknown;
            model?: string;
            provider?: string;
            actions?: CatAction[];
            execResults?: ExecActionResult[];
            quickReplies?: string[];
            tool_call?: ToolCallEvent;
            prefill_proposal?: PrefillProposal;
            fallback?: { from: string; to: string; model: string; reason: string };
            suggestUpgrade?: boolean;
            error?: string;
          };
          if (event?.error) {
            throw new Error(event.error);
          }
          if (event?.content) {
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantId ? { ...m, content: (m.content || '') + event.content } : m
              )
            );
          }
          if (event?.model) {
            modelUsed = event.model;
          }
          if (event?.provider) {
            providerUsed = event.provider;
          }
          if (event?.actions) {
            actions = event.actions;
          }
          if (event?.execResults) {
            execResults = event.execResults;
          }
          if (event?.quickReplies) {
            quickReplies = event.quickReplies;
          }
          if (event?.tool_call) {
            const toolEvent = event.tool_call;
            setMessages(prev =>
              prev.map(m => {
                if (m.id !== assistantId) {
                  return m;
                }
                const existing = m.toolCalls ?? [];
                // Merge: replace previous entry for the same tool-call id, else append.
                const idx = existing.findIndex(t => t.id === toolEvent.id);
                const next =
                  idx >= 0
                    ? existing.map((t, i) => (i === idx ? toolEvent : t))
                    : [...existing, toolEvent];
                return { ...m, toolCalls: next };
              })
            );
          }
          if (event?.prefill_proposal) {
            const proposal = event.prefill_proposal;
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantId
                  ? {
                      ...m,
                      prefillProposals: [...(m.prefillProposals ?? []), proposal],
                    }
                  : m
              )
            );
          }
          if (event?.fallback) {
            const notice = event.fallback;
            setMessages(prev =>
              prev.map(m => (m.id === assistantId ? { ...m, fallback: notice } : m))
            );
          }
          if (event?.done && event.suggestUpgrade) {
            suggestUpgrade = true;
          }
        });

        if (abortController.signal.aborted) {
          return;
        }

        if (execResults?.some(r => r.status === 'pending_confirmation')) {
          onPendingResultRef.current?.();
        }

        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId
              ? {
                  ...m,
                  modelUsed,
                  provider: providerUsed,
                  actions,
                  execResults,
                  quickReplies,
                  suggestUpgrade,
                }
              : m
          )
        );
      } catch (e) {
        const isAbort = e instanceof DOMException && e.name === 'AbortError';
        let hasPartialContent = false;
        setMessages(prev => {
          const assistant = prev.find(m => m.id === assistantId);
          hasPartialContent = !!assistant?.content?.trim();
          return prev;
        });

        if (isAbort && hasPartialContent) {
          // intentional no-op: keep partial streamed content
        } else if (isAbort) {
          setError('Response timed out. Try again or rephrase your question.');
          setMessages(prev => prev.filter(m => m.id !== assistantId));
        } else {
          setError(e instanceof Error ? e.message : 'Something went wrong');
          setMessages(prev => prev.filter(m => m.id !== assistantId));
        }
      } finally {
        clearTimeout(timeout);
        abortControllerRef.current = null;
        setIsLoading(false);
        onMessageSentRef.current?.();
      }
    },
    [isLoading, selectedModel, preferredCurrency]
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
    fetch(API_ROUTES.CAT.HISTORY, { method: 'DELETE' }).catch((err: unknown) => {
      logger.warn('Failed to clear server history', { err }, 'useChatMessages');
    });
  }, []);

  const setErrorState = useCallback((err: string | null) => {
    setError(err);
  }, []);

  const addSystemMessage = useCallback((content: string) => {
    setMessages(prev => [
      ...prev,
      { id: `system-${Date.now()}`, role: 'assistant', content, timestamp: new Date() },
    ]);
  }, []);

  return {
    messages,
    isLoading,
    isLoadingHistory,
    error,
    messagesEndRef,
    sendMessage,
    stopGeneration,
    clearChat,
    setError: setErrorState,
    addSystemMessage,
  };
}
