'use client';

import { useRouter } from 'next/navigation';
import { MessageSquare, Search, Plus, ArrowLeft } from 'lucide-react';
import Button from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import ConversationList from './ConversationList';
import MessageView from './MessageView';
import { cn } from '@/lib/utils';
import NewConversationModal from './NewConversationModal';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/config/routes';
import { useRealtimeManager } from '@/hooks/useRealtimeManager';
import { ConnectionStatusIndicator } from './ConnectionStatusIndicator';
import { useMessagePanelState } from './useMessagePanelState';
import { MessagePanelLoading } from './MessagePanelLoading';

interface MessagePanelProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  initialConversationId?: string;
  fullPage?: boolean;
}

export default function MessagePanel({
  isOpen,
  onClose,
  className = '',
  initialConversationId,
  fullPage = false,
}: MessagePanelProps) {
  const router = useRouter();
  const { user, hydrated, isLoading } = useAuth();
  useRealtimeManager();

  const isAuthReady = hydrated && !isLoading;

  const {
    selectedConversationId,
    searchQuery,
    setSearchQuery,
    showNewModal,
    setShowNewModal,
    activeTab,
    setActiveTab,
    convSelectionMode,
    setConvSelectionMode,
    selectedConvIds,
    bulkDeleteConfirm,
    setBulkDeleteConfirm,
    refreshSignal,
    setRefreshSignal,
    toggleConvSelect,
    clearConvSelection,
    bulkDeleteSelected,
    executeBulkDelete,
    setSelectedConversationId,
  } = useMessagePanelState({ isAuthReady, user, initialConversationId });

  if (!isOpen) {
    return null;
  }

  if (!isAuthReady) {
    return (
      <MessagePanelLoading
        fullPage={fullPage}
        isOpen={isOpen}
        onClose={onClose}
        className={className}
      />
    );
  }

  const content = (
    <div
      className={cn(
        'flex h-full bg-card shadow-lg relative flex-col md:flex-row overflow-hidden',
        fullPage ? 'w-full rounded-none' : 'w-full max-w-5xl rounded-2xl border border-border'
      )}
    >
      {/* Conversations Sidebar */}
      <div
        className={cn(
          'border-r border-border flex flex-col bg-gray-50/60 dark:bg-muted/40 transition-transform duration-300 ease-in-out',
          selectedConversationId ? 'hidden md:flex md:w-80' : 'flex w-full md:w-80',
          fullPage && 'w-[23rem]'
        )}
      >
        <div className="p-4 border-b border-border flex items-center justify-between bg-card">
          <div className="flex items-center gap-2">
            {!fullPage && (
              <Button variant="ghost" size="sm" onClick={onClose} className="-ml-2">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <div>
              <h1 className="text-xl font-semibold text-foreground">Messages</h1>
              <p className="text-xs text-muted-foreground">Reach anyone on OrangeCat</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!convSelectionMode ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConvSelectionMode(true)}
                className="text-muted-foreground"
              >
                Select
              </Button>
            ) : (
              <>
                <span className="text-sm text-muted-foreground">
                  {selectedConvIds.size} selected
                </span>
                <Button
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={bulkDeleteSelected}
                  disabled={selectedConvIds.size === 0}
                >
                  Delete
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setConvSelectionMode(false);
                    clearConvSelection();
                  }}
                >
                  Cancel
                </Button>
              </>
            )}
            <Button
              size="sm"
              onClick={() => setShowNewModal(true)}
              className="bg-tiffany-500 hover:bg-tiffany-600 text-white shadow-sm"
            >
              <Plus className="w-4 h-4 mr-1" />
              New
            </Button>
          </div>
        </div>

        <div className="p-4 border-b border-gray-100 dark:border-border space-y-3 bg-white/80 dark:bg-card/80">
          <div className="flex items-center gap-2">
            {(['all', 'requests'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium transition-all border',
                  activeTab === tab
                    ? 'bg-tiffany-50 text-tiffany-700 border-tiffany-200 shadow-sm dark:bg-accent dark:text-accent-foreground dark:border-accent'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 dark:bg-card dark:text-muted-foreground dark:border-border dark:hover:bg-muted'
                )}
              >
                {tab === 'all' ? 'All' : 'Requests'}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-muted-foreground" />
            <input
              type="text"
              placeholder="Search conversations"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-gray-400 dark:placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-tiffany-500 focus:border-tiffany-500 transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <ConversationList
            searchQuery={searchQuery}
            selectedConversationId={selectedConversationId}
            filterTab={activeTab}
            selectionMode={convSelectionMode}
            selectedIds={selectedConvIds}
            onToggleSelect={toggleConvSelect}
            onRequestSelectionMode={() => setConvSelectionMode(true)}
            refreshSignal={refreshSignal}
            onSelectConversation={conversationId => {
              if (convSelectionMode) {
                toggleConvSelect(conversationId);
                return;
              }
              setSelectedConversationId(conversationId);
              router.push(`/messages?id=${conversationId}`, { scroll: false });
            }}
          />
        </div>
      </div>

      {/* Message View */}
      <div
        className={cn(
          'flex-1 flex flex-col bg-card transition-opacity duration-200 ease-in-out min-h-0',
          selectedConversationId ? 'flex w-full' : 'hidden md:flex'
        )}
      >
        {selectedConversationId ? (
          <MessageView
            conversationId={selectedConversationId}
            onBack={(reason?: 'forbidden' | 'not_found' | 'unknown' | 'network') => {
              setSelectedConversationId(null);
              router.push(ROUTES.MESSAGES);
              if (reason === 'forbidden' || reason === 'not_found') {
                setShowNewModal(true);
              }
            }}
          />
        ) : (
          <div className="flex flex-col h-full">
            <div className="px-4 pt-2">
              <ConnectionStatusIndicator />
            </div>
            <div className="flex-1 flex items-center justify-center text-muted-foreground bg-gray-50 dark:bg-muted/30">
              <div className="text-center p-10 max-w-md">
                <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-card border border-border shadow-sm flex items-center justify-center">
                  <MessageSquare className="w-8 h-8 text-gray-400 dark:text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Select a chat</h3>
                <p className="text-sm text-muted-foreground mb-5">
                  Choose from your existing conversations or start a new one.
                </p>
                <Button
                  onClick={() => setShowNewModal(true)}
                  className="bg-tiffany-500 hover:bg-tiffany-600 text-white shadow"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New chat
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={bulkDeleteConfirm}
        onClose={() => setBulkDeleteConfirm(false)}
        onConfirm={executeBulkDelete}
        title={`Delete ${selectedConvIds.size} conversation${selectedConvIds.size === 1 ? '' : 's'}?`}
        description="This removes them for you. Other participants won't be affected."
        confirmLabel="Delete"
      />

      <NewConversationModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onCreated={convId => {
          setSelectedConversationId(convId);
          setShowNewModal(false);
          setRefreshSignal(s => s + 1);
          router.push(`/messages?id=${convId}`, { scroll: false });
        }}
      />
    </div>
  );

  if (fullPage) {
    return <div className={cn('h-[calc(100vh-4rem)]', className)}>{content}</div>;
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[80vh] max-h-[700px] p-0">
        <DialogTitle className="sr-only">Messages</DialogTitle>
        <div className="w-full h-full">{content}</div>
      </DialogContent>
    </Dialog>
  );
}
