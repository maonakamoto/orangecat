'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import supabase from '@/lib/supabase/browser';
import { useConnectionHeartbeat } from './useConnectionHeartbeat';
import { makeSubscribeHandler } from './connectionSubscribeHandler';
import { useBrowserConnectionEvents } from './useBrowserConnectionEvents';

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting' | 'error';

interface UseRealtimeConnectionOptions {
  enabled?: boolean;
  onStatusChange?: (status: ConnectionStatus) => void;
  maxReconnectAttempts?: number;
  initialReconnectDelay?: number;
  maxReconnectDelay?: number;
}

export function useRealtimeConnection(options: UseRealtimeConnectionOptions = {}) {
  const {
    enabled = true,
    onStatusChange,
    maxReconnectAttempts = 10,
    initialReconnectDelay = 1000,
    maxReconnectDelay = 30000,
  } = options;

  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<Error | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isMountedRef = useRef(true);
  const attemptReconnectRef = useRef<(() => void) | null>(null);
  const setupInProgressRef = useRef(false);
  const hasSetupRef = useRef(false);

  const updateStatus = useCallback(
    (newStatus: ConnectionStatus, err: Error | null = null) => {
      if (!isMountedRef.current) {
        return;
      }
      setStatus(newStatus);
      setError(err);
      if (onStatusChange) {
        onStatusChange(newStatus);
      }
    },
    [onStatusChange]
  );

  const { start: startHeartbeat, stop: stopHeartbeat } = useConnectionHeartbeat({
    channelRef,
    isMountedRef,
    updateStatus,
    onDeadConnection: useCallback(() => {
      reconnectAttemptsRef.current = 0;
      if (attemptReconnectRef.current) {
        attemptReconnectRef.current();
      }
    }, []),
  });

  const setupConnection = useCallback(() => {
    if (!enabled || !isMountedRef.current) {
      return;
    }

    if (setupInProgressRef.current) {
      return;
    }
    if (channelRef.current?.state === 'joined') {
      return;
    }

    setupInProgressRef.current = true;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    updateStatus('reconnecting');

    const subscriptionTimeout = setTimeout(() => {
      if (!isMountedRef.current) {
        return;
      }
      const channelState = channelRef.current?.state;
      if (channelState !== 'joined') {
        setupInProgressRef.current = false;
        updateStatus('error', new Error(`Subscription timeout - channel state: ${channelState}`));
        stopHeartbeat();
        if (attemptReconnectRef.current) {
          attemptReconnectRef.current();
        }
      }
    }, 10000);

    const channel = supabase
      .channel('realtime-connection-monitor', {
        config: {
          broadcast: { self: false },
          presence: { key: 'connection' },
        },
      })
      .subscribe(
        makeSubscribeHandler(subscriptionTimeout, {
          isMountedRef,
          reconnectAttemptsRef,
          setupInProgressRef,
          hasSetupRef,
          channelRef,
          attemptReconnectRef,
          updateStatus,
          startHeartbeat,
          stopHeartbeat,
        })
      );

    channelRef.current = channel;
  }, [enabled, updateStatus, stopHeartbeat, startHeartbeat]);

  const attemptReconnect = useCallback(() => {
    if (!enabled || !isMountedRef.current) {
      return;
    }

    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      updateStatus('error', new Error('Max reconnection attempts reached'));
      return;
    }

    reconnectAttemptsRef.current += 1;
    const delay = Math.min(
      initialReconnectDelay * Math.pow(2, reconnectAttemptsRef.current),
      maxReconnectDelay
    );

    reconnectTimeoutRef.current = setTimeout(() => {
      if (!isMountedRef.current) {
        return;
      }
      setupConnection();
    }, delay);
  }, [
    enabled,
    maxReconnectAttempts,
    initialReconnectDelay,
    maxReconnectDelay,
    setupConnection,
    updateStatus,
  ]);

  attemptReconnectRef.current = attemptReconnect;

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setupConnection();
  }, [setupConnection]);

  useEffect(() => {
    isMountedRef.current = true;
    if (enabled && !hasSetupRef.current) {
      setupConnection();
    }
    return () => {
      isMountedRef.current = false;
      setupInProgressRef.current = false;
      hasSetupRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      stopHeartbeat();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, stopHeartbeat]);

  useBrowserConnectionEvents({
    enabled,
    status,
    reconnect,
    onOffline: useCallback(() => updateStatus('disconnected'), [updateStatus]),
  });

  return { status, isConnected: status === 'connected', reconnect, error };
}
