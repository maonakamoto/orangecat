'use client';

import React from 'react';
import { Loader2, MessageSquare } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import MessageHeader from './MessageHeader';
import MessageList from './MessageList';
import MessageComposer from '../MessageComposer';
import { MessageContextMenu } from '@/components/messaging';
import { ConnectionStatusIndicator } from '../ConnectionStatusIndicator';
import { useMessageView } from './useMessageView';

interface MessageViewProps {
  conversationId: string;
  onBack: (reason?: 'forbidden' | 'not_found' | 'unknown' | 'network') => void;
}

export default function MessageView({ conversationId, onBack }: MessageViewProps) {
  const { user } = useAuth();
  const currentUserId = user?.id;

  const {
    messages,
    conversation,
    pagination,
    isLoading,
    isLoadingMore,
    error,
    loadMore,
    menuState,
    editingMessageId,
    messagesEndRef,
    handleMessageSent,
    handleMessageConfirmed,
    handleMessageFailed,
    handleMessageLongPress,
    closeMenu,
    handleEdit,
    handleEditSave,
    handleEditCancel,
    handleDelete,
  } = useMessageView(conversationId, currentUserId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-dim" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {error === 'forbidden'
              ? 'Access Denied'
              : error === 'not_found'
                ? 'Conversation Not Found'
                : 'Error Loading Messages'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {error === 'forbidden'
              ? "You don't have access to this conversation"
              : error === 'not_found'
                ? 'This conversation may have been deleted'
                : 'Please try again'}
          </p>
          <Button onClick={() => onBack(error)}>Go Back</Button>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 text-muted-dim mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No conversation selected</h3>
          <p className="text-muted-foreground">Select a conversation to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-card">
      <MessageHeader
        conversation={conversation}
        currentUserId={currentUserId}
        onBack={() => onBack()}
      />

      <div className="px-4 pt-2">
        <ConnectionStatusIndicator />
      </div>

      <MessageList
        messages={messages}
        currentUserId={currentUserId}
        hasMore={pagination?.hasMore || false}
        isLoadingMore={isLoadingMore}
        onLoadMore={loadMore}
        onMessageLongPress={handleMessageLongPress}
        messagesEndRef={messagesEndRef}
        editingMessageId={editingMessageId}
        onEditSave={handleEditSave}
        onEditCancel={handleEditCancel}
      />

      <MessageComposer
        conversationId={conversationId}
        onMessageSent={handleMessageSent}
        onMessageConfirmed={handleMessageConfirmed}
        onMessageFailed={handleMessageFailed}
      />

      <MessageContextMenu
        isOpen={menuState.open}
        position={menuState.position}
        onClose={closeMenu}
        onEdit={handleEdit}
        onDelete={handleDelete}
        canEdit={
          !!menuState.message &&
          menuState.message.sender_id === currentUserId &&
          !menuState.message.is_deleted
        }
        canDelete={
          !!menuState.message &&
          menuState.message.sender_id === currentUserId &&
          !menuState.message.is_deleted
        }
      />
    </div>
  );
}
