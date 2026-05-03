'use client';

import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import type { Conversation } from '../types';
import { API_ROUTES, debugLog } from '../lib/constants';

interface UseConversationsFetcherOptions {
  isAuthReady: boolean;
  user: { id: string } | null | undefined;
  setConversations: (conversations: Conversation[]) => void;
}

interface UseConversationsFetcherReturn {
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  lastFetch: number;
  refresh: () => Promise<void>;
}

export function useConversationsFetcher({
  isAuthReady,
  user,
  setConversations,
}: UseConversationsFetcherOptions): UseConversationsFetcherReturn {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetch, setLastFetch] = useState<number>(0);
  const lastSessionSync = useRef<number>(0);

  const refresh = useCallback(async () => {
    debugLog('[useConversations] refresh', { isAuthReady, hasUser: !!user });
    if (!isAuthReady || !user) {
      debugLog('[useConversations] skip refresh (auth not ready or no user)');
      return;
    }

    try {
      setError(null);
      setRefreshing(true);
      debugLog('[useConversations] fetching conversations');
      let res = await fetch(`${API_ROUTES.CONVERSATIONS}?limit=30`, { credentials: 'same-origin' });
      debugLog('[useConversations] response status', { status: res.status, text: res.statusText });

      if (res.status === 401) {
        const now = Date.now();
        if (now - lastSessionSync.current > 30000) {
          debugLog('[useConversations] 401; syncing session');
          lastSessionSync.current = now;
          try {
            const { default: supabase } = await import('@/lib/supabase/browser');
            const {
              data: { session },
            } = await supabase.auth.getSession();
            if (session?.access_token) {
              const syncRes = await fetch('/api/auth/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  accessToken: session.access_token,
                  refreshToken: session.refresh_token,
                }),
              });

              if (syncRes.ok) {
                debugLog('[useConversations] session synced; retrying');
                res = await fetch(`${API_ROUTES.CONVERSATIONS}?limit=30`, {
                  credentials: 'same-origin',
                });
                debugLog('[useConversations] retry status', {
                  status: res.status,
                  text: res.statusText,
                });
              } else {
                debugLog(
                  '[useConversations] session sync failed:',
                  syncRes.status,
                  syncRes.statusText
                );
              }
            } else {
              debugLog('[useConversations] no session available for sync');
            }
          } catch (syncError) {
            logger.error('[useConversations] Failed to sync session:', syncError);
          }
        } else {
          debugLog('[useConversations] skipping session sync (throttled)');
        }
      }

      if (!res.ok) {
        const t = await res.text().catch(() => '');
        debugLog('[useConversations] error response', t);
        if (res.status !== 401) {
          setError('Failed to load conversations');
          if (t) {
            toast.error('Failed to load conversations', { description: t });
          }
        }
        setConversations([]);
        return;
      }

      const responseData = await res
        .json()
        .catch(() => ({ success: false, data: { conversations: [] } }));
      debugLog('[useConversations] responseData', {
        success: responseData.success,
        hasData: !!responseData.data,
        count: Array.isArray(responseData.data?.conversations)
          ? responseData.data.conversations.length
          : Array.isArray(responseData.conversations)
            ? responseData.conversations.length
            : 0,
      });

      const convList = (
        Array.isArray(responseData.data?.conversations)
          ? responseData.data.conversations
          : Array.isArray(responseData.conversations)
            ? responseData.conversations
            : []
      ) as Conversation[];
      const uniqueConversations = Array.from(
        new Map(convList.map((c: Conversation) => [c.id, c])).values()
      );
      debugLog('[useConversations] set conversations', uniqueConversations.length);
      setConversations(uniqueConversations);
      setLastFetch(Date.now());
    } catch (e) {
      logger.error('[useConversations] Network error:', e);
      setError('Network error');
      setConversations([]);
      toast.error('Network error loading conversations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthReady, user, setConversations]);

  return { loading, error, refreshing, lastFetch, refresh };
}
