'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useNotifications, type Notification } from '@/hooks/useNotifications';

type UIFilter = 'all' | 'unread' | 'payments' | 'social' | 'messages';

function getAPIFilter(uiFilter: UIFilter): 'all' | 'unread' | string {
  switch (uiFilter) {
    case 'payments':
      return 'payment';
    case 'social':
      return 'follow';
    case 'messages':
      return 'message';
    default:
      return uiFilter;
  }
}

interface UseNotificationCenterParams {
  onClose: () => void;
}

export function useNotificationCenter({ onClose }: UseNotificationCenterParams) {
  const router = useRouter();
  const [uiFilter, setUIFilter] = useState<UIFilter>('all');
  const [showMessages, setShowMessages] = useState(false);

  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    hasMore,
    loadMore,
    markAsRead,
    deleteNotification,
    clearRead,
    refresh,
  } = useNotifications({
    filter: getAPIFilter(uiFilter),
    limit: 20,
    realtime: true,
  });

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id);
    } catch {
      toast.error('Failed to mark as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAsRead('all');
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark all as read');
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await deleteNotification(id);
      toast.success('Notification deleted');
    } catch {
      toast.error('Failed to delete notification');
    }
  };

  const handleClearRead = async () => {
    try {
      await clearRead();
      toast.success('Cleared read notifications');
    } catch {
      toast.error('Failed to clear notifications');
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await handleMarkAsRead(notification.id);
    }
    if (notification.type === 'message') {
      setShowMessages(true);
      onClose();
      return;
    }
    if (notification.action_url) {
      router.push(notification.action_url);
      onClose();
    }
  };

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    hasMore,
    loadMore,
    refresh,
    uiFilter,
    setUIFilter,
    showMessages,
    setShowMessages,
    handleMarkAsRead,
    handleMarkAllAsRead,
    handleDeleteNotification,
    handleClearRead,
    handleNotificationClick,
  };
}

export type { UIFilter };
