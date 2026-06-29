import { useCallback, useEffect, useState } from 'react';
import { API_ROUTES } from '@/config/api-routes';
import { logger } from '@/utils/logger';

export interface ConversationSummary {
  id: string;
  title: string | null;
  is_default: boolean;
  updated_at: string;
}

/**
 * Manages the user's Cat conversation list for the rail: load, switch, start a
 * new chat, and delete. The active id drives which conversation the chat panel
 * loads/sends to. On first load the most-recently-updated conversation is active
 * (null until we know — the panel falls back to the default conversation).
 */
export function useConversations() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(API_ROUTES.CAT.CONVERSATIONS);
      if (!res.ok) {
        return;
      }
      const data = await res.json();
      const list: ConversationSummary[] = data?.data?.conversations ?? [];
      setConversations(list);
      // Adopt an active id on first load (most recent) if none is set yet.
      setActiveId(prev => prev ?? list[0]?.id ?? null);
    } catch (err) {
      logger.warn('Failed to load conversations', { err }, 'useConversations');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selectConversation = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  const newConversation = useCallback(async () => {
    try {
      const res = await fetch(API_ROUTES.CAT.CONVERSATIONS, { method: 'POST' });
      if (!res.ok) {
        return;
      }
      const data = await res.json();
      const id: string | undefined = data?.data?.id;
      if (id) {
        setActiveId(id);
        await refresh();
      }
    } catch (err) {
      logger.warn('Failed to start new conversation', { err }, 'useConversations');
    }
  }, [refresh]);

  const deleteConversation = useCallback(
    async (id: string) => {
      // Optimistic: drop it from the list immediately.
      setConversations(prev => prev.filter(c => c.id !== id));
      setActiveId(prev => {
        if (prev !== id) {
          return prev;
        }
        // Was active → fall back to the next most-recent, or default (null).
        const remaining = conversations.filter(c => c.id !== id);
        return remaining[0]?.id ?? null;
      });
      try {
        await fetch(API_ROUTES.CAT.CONVERSATION(id), { method: 'DELETE' });
      } catch (err) {
        logger.warn('Failed to delete conversation', { err }, 'useConversations');
      }
      await refresh();
    },
    [conversations, refresh]
  );

  return {
    conversations,
    activeId,
    isLoading,
    refresh,
    selectConversation,
    newConversation,
    deleteConversation,
  };
}
