'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import supabase from '@/lib/supabase/browser';
import { CHANNELS, debugLog, TIMING } from '@/features/messaging/lib/constants';
import { DATABASE_TABLES } from '@/config/database-tables';
import {
  handleMessageInsert,
  handleMessageUpdate,
  handleReadReceiptUpdate,
  makeMessageSubscribeHandler,
} from '@/features/messaging/lib/messageSubscriptionHandlers';
import type { Message } from '@/features/messaging/types';

interface UseMessageSubscriptionOptions {
  onNewMessage?: (message: Message) => void;
  onOwnMessage?: (messageId: string) => void;
  onReadReceiptUpdate?: (conversationId: string) => void;
  enabled?: boolean;
  onSubscriptionStatusChange?: (status: string, error?: Error) => void;
}

export function useMessageSubscription(
  conversationId: string | null,
  options: UseMessageSubscriptionOptions = {}
) {
  const { user } = useAuth();
  const {
    onNewMessage,
    onOwnMessage,
    onReadReceiptUpdate,
    enabled = true,
    onSubscriptionStatusChange,
  } = options;
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const callbacksRef = useRef({ onNewMessage, onOwnMessage, onReadReceiptUpdate });
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const attemptReconnectRef = useRef<(() => void) | null>(null);
  const setupInProgressRef = useRef(false);
  const hasSubscribedRef = useRef(false);

  useEffect(() => {
    callbacksRef.current = { onNewMessage, onOwnMessage, onReadReceiptUpdate };
  }, [onNewMessage, onOwnMessage, onReadReceiptUpdate]);

  const setupSubscription = useCallback(() => {
    if (!conversationId || !user?.id || !enabled || !isMountedRef.current) {
      return;
    }

    if (setupInProgressRef.current) {
      debugLog('[useMessageSubscription] setup already in progress, skipping');
      return;
    }
    if (hasSubscribedRef.current && channelRef.current) {
      debugLog('[useMessageSubscription] already subscribed, skipping');
      return;
    }

    setupInProgressRef.current = true;

    if (channelRef.current) {
      debugLog('[useMessageSubscription] cleaning up existing channel');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    debugLog(`[useMessageSubscription] creating channel for ${conversationId}`);

    const attemptReconnect = () => {
      if (!conversationId || !user?.id || !enabled || !isMountedRef.current) {
        return;
      }
      if (reconnectAttemptsRef.current >= TIMING.RECONNECT_MAX_ATTEMPTS) {
        debugLog('[useMessageSubscription] Max reconnection attempts reached');
        if (onSubscriptionStatusChange) {
          onSubscriptionStatusChange('ERROR', new Error('Max reconnection attempts reached'));
        }
        return;
      }
      reconnectAttemptsRef.current += 1;
      const delay = Math.min(
        TIMING.RECONNECT_INITIAL_DELAY_MS * Math.pow(2, reconnectAttemptsRef.current),
        TIMING.RECONNECT_MAX_DELAY_MS
      );
      debugLog(
        `[useMessageSubscription] Reconnecting (attempt ${reconnectAttemptsRef.current}/${TIMING.RECONNECT_MAX_ATTEMPTS}) in ${delay}ms`
      );
      reconnectTimeoutRef.current = setTimeout(() => {
        if (!isMountedRef.current) {
          return;
        }
        setupSubscription();
      }, delay);
    };

    attemptReconnectRef.current = attemptReconnect;

    const userId = user.id;
    const channel = supabase
      .channel(CHANNELS.MESSAGES(conversationId), {
        config: { broadcast: { self: false }, presence: { key: '' } },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: DATABASE_TABLES.MESSAGES,
          filter: `conversation_id=eq.${conversationId}`,
        },
        async payload =>
          handleMessageInsert(payload as { new: Record<string, unknown> }, userId, callbacksRef)
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: DATABASE_TABLES.MESSAGES,
          filter: `conversation_id=eq.${conversationId}`,
        },
        async payload =>
          handleMessageUpdate(payload as { new: Record<string, unknown> | null }, callbacksRef)
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: DATABASE_TABLES.CONVERSATION_PARTICIPANTS,
          filter: `conversation_id=eq.${conversationId}`,
        },
        async payload =>
          handleReadReceiptUpdate(
            conversationId,
            payload as { new: Record<string, unknown> | null },
            callbacksRef
          )
      )
      .subscribe(
        makeMessageSubscribeHandler(conversationId, {
          isMountedRef,
          setupInProgressRef,
          hasSubscribedRef,
          reconnectAttemptsRef,
          enabled,
          onSubscriptionStatusChange,
          attemptReconnectRef,
        })
      );

    channelRef.current = channel;
  }, [conversationId, user?.id, enabled, onSubscriptionStatusChange]);

  useEffect(() => {
    isMountedRef.current = true;

    if (!conversationId || !user?.id || !enabled) {
      if (channelRef.current) {
        debugLog(`[useMessageSubscription] cleaning up disabled subscription: ${conversationId}`);
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      reconnectAttemptsRef.current = 0;
      setupInProgressRef.current = false;
      hasSubscribedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      return;
    }

    if (!hasSubscribedRef.current) {
      setupSubscription();
    }

    return () => {
      isMountedRef.current = false;
      setupInProgressRef.current = false;
      hasSubscribedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId, user?.id, enabled, setupSubscription]);
}
