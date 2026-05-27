import { useCallback, useEffect, useRef, useState } from 'react';
import { readEventStream } from '@/lib/sse';
import { logger } from '@/utils/logger';
import { API_ROUTES } from '@/config/api-routes';
import type { Message, CatAction, ExecActionResult } from '../types';
import { useChatHistory } from './useChatHistory';

const STREAM_TIMEOUT_MS = 60_000;

interface UseChatMessagesOptions {
  selectedModel: string;
  onPendingResult?: () => void;
}

export function useChatMessages({ selectedModel, onPendingResult }: UseChatMessagesOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const onPendingResultRef = useRef(onPendingResult);
  onPendingResultRef.current = onPendingResult;

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
          }),
          signal: abortController.signal,
        });

        if (!res.ok || !res.body) {
          let msg = 'Failed to get response';
          try {
            const data = await res.json();
            msg = data?.details?.message || data?.error || msg;
          } catch {}
          throw new Error(msg);
        }

        let modelUsed = selectedModel;
        let actions: CatAction[] | undefined;
        let execResults: ExecActionResult[] | undefined;

        await readEventStream(res.body, (json: unknown) => {
          const event = json as {
            content?: string;
            done?: boolean;
            usage?: unknown;
            model?: string;
            actions?: CatAction[];
            execResults?: ExecActionResult[];
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
          if (event?.actions) {
            actions = event.actions;
          }
          if (event?.execResults) {
            execResults = event.execResults;
          }
        });

        if (abortController.signal.aborted) {
          return;
        }

        if (execResults?.some(r => r.status === 'pending_confirmation')) {
          onPendingResultRef.current?.();
        }

        setMessages(prev =>
          prev.map(m => (m.id === assistantId ? { ...m, modelUsed, actions, execResults } : m))
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
      }
    },
    [isLoading, selectedModel]
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
