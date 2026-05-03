'use client';

import { useEffect } from 'react';
import { debugLog } from '@/features/messaging/lib/constants';
import type { ConnectionStatus } from './useRealtimeConnection';

interface UseBrowserConnectionEventsOptions {
  enabled: boolean;
  status: ConnectionStatus;
  reconnect: () => void;
  onOffline: () => void;
}

export function useBrowserConnectionEvents({
  enabled,
  status,
  reconnect,
  onOffline,
}: UseBrowserConnectionEventsOptions) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleOnline = () => {
      debugLog('[useRealtimeConnection] Browser came online');
      if (status === 'disconnected' || status === 'error') {
        reconnect();
      }
    };

    const handleOffline = () => {
      debugLog('[useRealtimeConnection] Browser went offline');
      onOffline();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [enabled, status, reconnect, onOffline]);
}
