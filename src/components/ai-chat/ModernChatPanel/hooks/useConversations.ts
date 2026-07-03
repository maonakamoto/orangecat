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
 * new chat, and delete.
 *
 * `activeId === null` means "fresh new chat" — the draft state the page lands
 * on and the state after "New chat". No conversation row exists yet; the chat
 * panel creates one lazily on the first send (see useChatMessages) and adopts
 * it via `adoptConversation`. This is deliberate: eagerly POSTing on load or on
 * "New chat" litters the rail (and the DB) with empty untitled conversations.
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

  /** "New chat": back to the draft state. The row is created on first send. */
  const newConversation = useCallback(() => {
    setActiveId(null);
  }, []);

  /** Adopt a conversation the chat panel just created on first send. */
  const adoptConversation = useCallback(
    (id: string) => {
      setActiveId(id);
      void refresh();
    },
    [refresh]
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      // Optimistic: drop it from the list immediately; if it was active,
      // fall back to a fresh new chat.
      setConversations(prev => prev.filter(c => c.id !== id));
      setActiveId(prev => (prev === id ? null : prev));
      try {
        await fetch(API_ROUTES.CAT.CONVERSATION(id), { method: 'DELETE' });
      } catch (err) {
        logger.warn('Failed to delete conversation', { err }, 'useConversations');
      }
      await refresh();
    },
    [refresh]
  );

  return {
    conversations,
    activeId,
    isLoading,
    refresh,
    selectConversation,
    newConversation,
    adoptConversation,
    deleteConversation,
  };
}
