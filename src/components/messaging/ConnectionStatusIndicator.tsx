'use client';

/**
 * Connection Status Indicator
 *
 * Shows the real-time connection status for messaging.
 * Similar to Facebook Messenger's connection indicator.
 *
 * @module messaging/ConnectionStatusIndicator
 */

import React from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { useConnectionStatus } from '@/stores/messaging';
import type { ConnectionStatus } from '@/hooks/useRealtimeConnection';

interface ConnectionStatusIndicatorProps {
  /** Whether to show the indicator */
  show?: boolean;
  /** Custom className */
  className?: string;
}

/**
 * Get status icon and color
 */
function getStatusDisplay(status: ConnectionStatus) {
  switch (status) {
    case 'connected':
      return {
        icon: <Wifi className="w-4 h-4" />,
        text: 'Connected',
        color: 'text-status-positive',
        bgColor: 'bg-status-positive/10',
        borderColor: 'border-status-positive/20',
      };
    case 'reconnecting':
      return {
        icon: <RefreshCw className="w-4 h-4 animate-spin" />,
        text: 'Reconnecting...',
        color: 'text-status-warning',
        bgColor: 'bg-status-warning/10',
        borderColor: 'border-status-warning/20',
      };
    case 'disconnected':
      return {
        icon: <WifiOff className="w-4 h-4" />,
        text: 'Disconnected',
        color: 'text-fg-secondary',
        bgColor: 'bg-surface-raised',
        borderColor: 'border-default',
      };
    case 'error':
      return {
        icon: <AlertCircle className="w-4 h-4" />,
        text: 'Connection Error',
        color: 'text-status-negative',
        bgColor: 'bg-status-negative/10',
        borderColor: 'border-status-negative/20',
      };
    default:
      return {
        icon: <WifiOff className="w-4 h-4" />,
        text: 'Unknown',
        color: 'text-fg-secondary',
        bgColor: 'bg-surface-raised',
        borderColor: 'border-default',
      };
  }
}

export function ConnectionStatusIndicator({
  show = true,
  className = '',
}: ConnectionStatusIndicatorProps) {
  const status = useConnectionStatus();

  // Don't show when connected (only show when there's an issue)
  if (!show || status === 'connected') {
    return null;
  }

  const display = getStatusDisplay(status);

  return (
    <div
      className={`
        flex items-center gap-2 rounded-md border px-3 py-2
        ${display.bgColor} ${display.borderColor} ${display.color}
        ${className}
      `}
      role="status"
      aria-live="polite"
    >
      {display.icon}
      <span className="text-sm font-medium">{display.text}</span>
    </div>
  );
}
