'use client';

import {
  Bell,
  Calendar,
  Check,
  Bitcoin,
  Users,
  MessageSquare,
  Heart,
  AtSign,
  Settings,
  Trash2,
} from 'lucide-react';
import { formatRelativeTime } from '@/utils/dates';
import { notificationTitle, type Notification } from '@/hooks/useNotifications';

function getNotificationIcon(notification: Notification) {
  switch (notification.type) {
    case 'payment':
    case 'project_funded':
      return <Bitcoin className="w-5 h-5 text-bitcoin-orange" />;
    case 'follow':
      return <Users className="w-5 h-5 text-foreground" />;
    case 'message':
      return <MessageSquare className="w-5 h-5 text-foreground" />;
    case 'comment':
      return <MessageSquare className="w-5 h-5 text-status-positive" />;
    case 'like':
      return <Heart className="w-5 h-5 text-destructive" />;
    case 'mention':
      return <AtSign className="w-5 h-5 text-foreground" />;
    case 'booking_request':
    case 'booking_update':
      return <Calendar className="w-5 h-5 text-foreground" />;
    case 'system':
      return <Settings className="w-5 h-5 text-muted-foreground" />;
    default:
      return <Bell className="w-5 h-5 text-muted-foreground" />;
  }
}

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onClick: (notification: Notification) => void;
}

export function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
  onClick,
}: NotificationItemProps) {
  return (
    <div
      className={`group relative cursor-pointer rounded-md border p-3 transition-colors ${
        notification.is_read
          ? 'border-border-subtle bg-background hover:bg-muted'
          : 'border-border-strong bg-muted hover:bg-muted/80'
      }`}
      onClick={() => onClick(notification)}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{getNotificationIcon(notification)}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="text-sm font-medium text-foreground">
                {notificationTitle(notification)}
              </h4>
              {notification.message && notification.message !== notificationTitle(notification) && (
                <p
                  className={`text-sm mt-1 ${notification.is_read ? 'text-muted-foreground' : 'text-foreground'}`}
                >
                  {notification.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                {formatRelativeTime(notification.created_at)}
              </p>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {!notification.is_read && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onMarkAsRead(notification.id);
                  }}
                  className="flex min-h-11 min-w-11 items-center justify-center rounded-md p-1 hover:bg-background"
                  title="Mark as read"
                >
                  <Check className="w-3 h-3 text-status-positive" />
                </button>
              )}
              <button
                onClick={e => {
                  e.stopPropagation();
                  onDelete(notification.id);
                }}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-md p-1 hover:bg-background"
                title="Delete notification"
              >
                <Trash2 className="w-3 h-3 text-destructive" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {!notification.is_read && (
        <div className="absolute right-3 top-3 h-2 w-2 rounded-sm bg-foreground" />
      )}
    </div>
  );
}
