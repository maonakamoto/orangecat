import { useEffect, useState } from 'react';
import { API_ROUTES } from '@/config/api-routes';
import { logger } from '@/utils/logger';
import type { Message } from '../types';

export function useChatHistory(setMessages: React.Dispatch<React.SetStateAction<Message[]>>) {
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingHistory(true);

    fetch(API_ROUTES.CAT.HISTORY)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (cancelled || !data?.data?.length) {
          return;
        }
        const historicMessages: Message[] = data.data.map(
          (m: {
            id: string;
            role: 'user' | 'assistant';
            content: string;
            created_at: string;
            model_used?: string;
          }) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: new Date(m.created_at),
            modelUsed: m.model_used ?? undefined,
          })
        );
        setMessages(historicMessages);
      })
      .catch((err: unknown) => {
        logger.warn('Chat history load failed', { err }, 'useChatMessages');
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingHistory(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [setMessages]);

  return { isLoadingHistory };
}
