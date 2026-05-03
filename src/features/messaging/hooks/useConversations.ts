'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { Conversation } from '../types';
import { useAuth } from '@/hooks/useAuth';
import { useMessagingStore } from '@/stores/messaging';
import { CHANNELS, TIMING, debugLog } from '../lib/constants';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { useConversationsFetcher } from './useConversationsFetcher';

export function useConversations(searchQuery: string, selectedConversationId?: string | null) {
  const { user, hydrated, isLoading: authLoading, isAuthenticated } = useAuth();
  const isAuthReady = hydrated && !authLoading;

  const {
    conversations,
    setConversations,
    setLoading: _setStoreLoading,
    setError: _setStoreError,
  } = useMessagingStore();

  debugLog('[useConversations] state', {
    user: !!user,
    hydrated,
    authLoading,
    isAuthenticated,
    isAuthReady,
    userId: user?.id,
    conversationsCount: Array.isArray(conversations) ? conversations.length : 'NOT_ARRAY',
    conversationsType: typeof conversations,
  });

  const { loading, error, refreshing, lastFetch, refresh } = useConversationsFetcher({
    isAuthReady,
    user,
    setConversations,
  });

  const hasInitialFetch = useRef(false);
  useEffect(() => {
    if (!hasInitialFetch.current) {
      hasInitialFetch.current = true;
      refresh();
    }
  }, [refresh]);

  useEffect(() => {
    const ensureSelected = async () => {
      if (!selectedConversationId) {
        return;
      }
      if (
        Array.isArray(conversations) &&
        conversations.some(c => c.id === selectedConversationId)
      ) {
        return;
      }
      try {
        const res = await fetch(`/api/messages/${selectedConversationId}/summary`, {
          credentials: 'same-origin',
        });
        if (!res.ok) {
          return;
        }
        const responseData = await res.json().catch(() => ({ success: false }));
        const data = responseData.success === true ? responseData.data : responseData;
        if (data?.conversation) {
          const safeConversations = Array.isArray(conversations) ? conversations : [];
          setConversations([data.conversation as Conversation, ...safeConversations]);
        }
      } catch {
        // ignore
      }
    };
    ensureSelected();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversationId]);

  useRealtimeSubscription({
    channelName: CHANNELS.CONVERSATIONS_LIST,
    table: 'conversations',
    events: ['*'],
    onEvent: useCallback(() => {
      const elapsed = Date.now() - lastFetch;
      if (elapsed >= TIMING.REFRESH_DEBOUNCE_MS && !refreshing) {
        refresh();
      }
    }, [refresh, lastFetch, refreshing]),
    enabled: isAuthReady && !!user,
  });

  useRealtimeSubscription({
    channelName: `${CHANNELS.CONVERSATIONS_LIST}-messages`,
    table: 'messages',
    events: ['INSERT'],
    onEvent: useCallback(() => {
      if (!refreshing) {
        refresh();
      }
    }, [refresh, refreshing]),
    enabled: isAuthReady && !!user,
  });

  useRealtimeSubscription({
    channelName: `${CHANNELS.CONVERSATIONS_LIST}-participants`,
    table: 'conversation_participants',
    events: ['UPDATE'],
    onEvent: useCallback(() => {
      if (!refreshing) {
        refresh();
      }
    }, [refresh, refreshing]),
    enabled: isAuthReady && !!user,
  });

  const filtered = useMemo(() => {
    const q = (searchQuery || '').toLowerCase();
    if (!q) {
      return Array.isArray(conversations) ? conversations : [];
    }
    if (!Array.isArray(conversations)) {
      return [];
    }
    return conversations.filter(c => {
      if (c.title && c.title.toLowerCase().includes(q)) {
        return true;
      }
      return (c.participants || []).some(
        p =>
          (p.name || '').toLowerCase().includes(q) || (p.username || '').toLowerCase().includes(q)
      );
    });
  }, [conversations, searchQuery]);

  const removeLocal = useCallback(
    (ids: string[]) => {
      if (!Array.isArray(ids) || ids.length === 0) {
        return;
      }
      const safeConversations = Array.isArray(conversations) ? conversations : [];
      setConversations(safeConversations.filter(c => !ids.includes(c.id)));
    },
    [conversations, setConversations]
  );

  return { conversations: filtered, loading, error, refresh, removeLocal };
}
