'use client';

import { Bell, Check, MessageSquare, Trash2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import MessagePanel from '@/components/messaging/MessagePanel';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useNotificationCenter, type UIFilter } from './useNotificationCenter';
import { NotificationItem } from './NotificationItem';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

const FILTER_TABS: { key: UIFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'payments', label: 'Payments' },
  { key: 'social', label: 'Social' },
  { key: 'messages', label: 'Messages' },
];

export default function NotificationCenter({
  isOpen,
  onClose,
  className = '',
}: NotificationCenterProps) {
  const {
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
  } = useNotificationCenter({ onClose });

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className={`max-w-md max-h-[80vh] flex flex-col p-0 ${className}`}>
        <DialogTitle className="sr-only">Notifications</DialogTitle>
        <Card className="w-full max-h-[80vh] flex flex-col border-0 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notifications
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </CardTitle>
          </CardHeader>

          <CardContent className="flex flex-col flex-1 overflow-hidden">
            {error && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 text-red-600 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{error.message}</span>
                <Button variant="ghost" size="sm" onClick={refresh} className="ml-auto">
                  Retry
                </Button>
              </div>
            )}

            <div className="flex gap-1 mb-4 bg-muted rounded-lg p-1">
              {FILTER_TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setUIFilter(tab.key)}
                  className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-colors ${
                    uiFilter === tab.key
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-gray-900 dark:hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {unreadCount > 0 && (
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-muted-foreground">
                  {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                </span>
                <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead}>
                  <Check className="w-4 h-4 mr-1" />
                  Mark all read
                </Button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-2">
              {isLoading && notifications.length === 0 ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                        <div className="w-8 h-8 bg-gray-300 dark:bg-muted-foreground/30 rounded-full" />
                        <div className="flex-1">
                          <div className="h-4 bg-gray-300 dark:bg-muted-foreground/30 rounded mb-2" />
                          <div className="h-3 bg-gray-300 dark:bg-muted-foreground/30 rounded w-3/4" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No notifications found</p>
                  {uiFilter !== 'all' && (
                    <button
                      onClick={() => setUIFilter('all')}
                      className="text-tiffany text-sm mt-2 hover:underline"
                    >
                      View all notifications
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {notifications.map(notification => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={handleMarkAsRead}
                      onDelete={handleDeleteNotification}
                      onClick={handleNotificationClick}
                    />
                  ))}
                  {hasMore && (
                    <div className="pt-2 text-center">
                      <Button variant="ghost" size="sm" onClick={loadMore} disabled={isLoading}>
                        {isLoading ? 'Loading...' : 'Load more'}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>

            {notifications.length > 0 && (
              <div className="pt-4 mt-4 border-t border-border">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setShowMessages(true);
                      onClose();
                    }}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Messages
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={handleClearRead}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear Read
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <MessagePanel isOpen={showMessages} onClose={() => setShowMessages(false)} />
      </DialogContent>
    </Dialog>
  );
}
