'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/utils/logger';
import { API_ROUTES } from '@/config/api-routes';
import { DATABASE_TABLES } from '@/config/database-tables';

export function useUnreadNotifications() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setCount(0);
      return;
    }

    const fetchCount = async () => {
      try {
        const response = await fetch(API_ROUTES.NOTIFICATIONS.UNREAD);
        if (!response.ok) {
          return;
        }
        const data = await response.json();
        if (data.success) {
          setCount(data.data.count);
        }
      } catch (err) {
        logger.error('Failed to fetch notification count', err, 'Notifications');
      }
    };

    fetchCount();

    const supabase = createBrowserClient();
    const channel = supabase
      .channel('notification-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: DATABASE_TABLES.NOTIFICATIONS,
          filter: `recipient_user_id=eq.${user.id}`,
        },
        () => fetchCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { count };
}
