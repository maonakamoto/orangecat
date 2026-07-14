'use client';

import { callRpc } from '@/lib/supabase/untyped';
import { useCallback, useEffect, useRef } from 'react';
import supabase from '@/lib/supabase/browser';
import { useAuth } from '@/hooks/useAuth';
import { debugLog } from '../lib/constants';
import { useTypingSubscription } from './useTypingSubscription';

const DEFAULT_STOP_DELAY = 2000;
const DEFAULT_REFRESH_INTERVAL = 5000;

export interface TypingUser {
  userId: string;
  username: string;
  name: string;
  avatarUrl?: string;
  startedAt: Date;
}

interface UseTypingIndicatorOptions {
  enabled?: boolean;
  stopDelay?: number;
  refreshInterval?: number;
}

interface UseTypingIndicatorReturn {
  typingUsers: TypingUser[];
  startTyping: () => void;
  stopTyping: () => void;
  isAnyoneTyping: boolean;
  typingText: string | null;
}

export function useTypingIndicator(
  conversationId: string | null,
  options: UseTypingIndicatorOptions = {}
): UseTypingIndicatorReturn {
  const { user } = useAuth();
  const {
    enabled = true,
    stopDelay = DEFAULT_STOP_DELAY,
    refreshInterval = DEFAULT_REFRESH_INTERVAL,
  } = options;

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  const sendTypingStatus = useCallback(
    async (isTyping: boolean) => {
      if (!conversationId || !user?.id || !enabled) {
        return;
      }
      try {
        await callRpc(supabase, 'set_typing_indicator', {
          p_conversation_id: conversationId,
          p_user_id: user.id,
          p_is_typing: isTyping,
        });
        debugLog('[useTypingIndicator] sent typing status:', isTyping);
      } catch (error) {
        debugLog('[useTypingIndicator] error sending typing status:', error);
      }
    },
    [conversationId, user?.id, enabled]
  );

  const startTyping = useCallback(() => {
    if (!enabled || !conversationId || !user?.id) {
      return;
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      sendTypingStatus(true);
    }
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      sendTypingStatus(false);
    }, stopDelay);
  }, [enabled, conversationId, user?.id, sendTypingStatus, stopDelay]);

  const stopTyping = useCallback(() => {
    if (!enabled || !conversationId || !user?.id) {
      return;
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (isTypingRef.current) {
      isTypingRef.current = false;
      sendTypingStatus(false);
    }
  }, [enabled, conversationId, user?.id, sendTypingStatus]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const typingUsers = useTypingSubscription({
    conversationId,
    userId: user?.id,
    enabled,
    sendTypingStatus,
    refreshInterval,
    isTypingRef,
  });

  const typingText =
    typingUsers.length === 0
      ? null
      : typingUsers.length === 1
        ? `${typingUsers[0].name || typingUsers[0].username} is typing...`
        : typingUsers.length === 2
          ? `${typingUsers[0].name || typingUsers[0].username} and ${typingUsers[1].name || typingUsers[1].username} are typing...`
          : `${typingUsers.length} people are typing...`;

  return {
    typingUsers,
    startTyping,
    stopTyping,
    isAnyoneTyping: typingUsers.length > 0,
    typingText,
  };
}
