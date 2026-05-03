'use client';

import supabase from '@/lib/supabase/browser';
import { debugLog } from '@/features/messaging/lib/constants';
import type { ConnectionStatus } from './useRealtimeConnection';

interface SubscribeHandlerDeps {
  isMountedRef: React.MutableRefObject<boolean>;
  reconnectAttemptsRef: React.MutableRefObject<number>;
  setupInProgressRef: React.MutableRefObject<boolean>;
  hasSetupRef: React.MutableRefObject<boolean>;
  channelRef: React.MutableRefObject<ReturnType<typeof supabase.channel> | null>;
  attemptReconnectRef: React.MutableRefObject<(() => void) | null>;
  updateStatus: (status: ConnectionStatus, err?: Error | null) => void;
  startHeartbeat: () => void;
  stopHeartbeat: () => void;
}

export function makeSubscribeHandler(
  subscriptionTimeout: ReturnType<typeof setTimeout>,
  deps: SubscribeHandlerDeps
) {
  return async (subscribeStatus: string, err?: Error) => {
    const {
      isMountedRef,
      reconnectAttemptsRef,
      setupInProgressRef,
      hasSetupRef,
      channelRef,
      attemptReconnectRef,
      updateStatus,
      startHeartbeat,
      stopHeartbeat,
    } = deps;

    if (!isMountedRef.current) {
      return;
    }

    clearTimeout(subscriptionTimeout);
    debugLog('[useRealtimeConnection] Subscription status:', subscribeStatus, err?.message);

    if (subscribeStatus === 'SUBSCRIBED') {
      reconnectAttemptsRef.current = 0;
      setupInProgressRef.current = false;
      hasSetupRef.current = true;
      updateStatus('connected');
      startHeartbeat();
      try {
        await channelRef.current?.track({
          connected_at: new Date().toISOString(),
          user_agent: navigator.userAgent,
        });
        debugLog('[useRealtimeConnection] Presence tracked successfully');
      } catch (trackErr) {
        debugLog('[useRealtimeConnection] Error tracking presence:', trackErr);
      }
    } else if (subscribeStatus === 'CHANNEL_ERROR' || subscribeStatus === 'TIMED_OUT') {
      debugLog('[useRealtimeConnection] Connection error:', err);
      setupInProgressRef.current = false;
      updateStatus('error', err || new Error('Connection error'));
      stopHeartbeat();
      if (attemptReconnectRef.current) {
        attemptReconnectRef.current();
      }
    } else if (subscribeStatus === 'CLOSED') {
      debugLog('[useRealtimeConnection] Connection closed');
      setupInProgressRef.current = false;
      updateStatus('disconnected');
      stopHeartbeat();
      if (hasSetupRef.current && isMountedRef.current && attemptReconnectRef.current) {
        attemptReconnectRef.current();
      }
    } else {
      debugLog('[useRealtimeConnection] Intermediate status:', subscribeStatus);
    }
  };
}
