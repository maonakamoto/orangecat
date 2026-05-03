'use client';

import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import supabase from '@/lib/supabase/browser';
import { DATABASE_TABLES } from '@/config/database-tables';
import type { Message } from '@/features/messaging/types';
import { queueIfOffline, handleNetworkError } from '@/features/messaging/lib/offline-queue';
import { MESSAGE_TYPES, debugLog, API_ROUTES } from '@/features/messaging/lib/constants';
import {
  createOptimisticMessage,
  validateMessageContent,
} from '@/features/messaging/lib/message-utils';

interface SendMessageParams {
  content: string;
  isSending: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profile: any;
  conversationId: string;
  stopTyping: () => void;
  onMessageSent: (message: Message) => void;
  onMessageFailed?: (tempId: string, errorMessage?: string) => void;
  onMessageConfirmed?: (tempId: string, realMessage: Message) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  selectedActor: any;
  setIsSending: (v: boolean) => void;
  setContent: (v: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
}

interface MessageResponse {
  success?: boolean;
  id?: string;
}

export async function sendMessage({
  content,
  isSending,
  user,
  profile,
  conversationId,
  stopTyping,
  onMessageSent,
  onMessageFailed,
  onMessageConfirmed,
  selectedActor,
  setIsSending,
  setContent,
  textareaRef,
}: SendMessageParams): Promise<void> {
  if (!content.trim() || isSending || !user) {
    return;
  }

  const validation = validateMessageContent(content);
  if (!validation.valid) {
    toast.error(validation.error);
    return;
  }

  const messageContent = content.trim();
  setIsSending(true);
  stopTyping();

  const optimisticMessage = createOptimisticMessage(conversationId, user.id, messageContent, {
    id: user.id,
    username: profile?.username || 'you',
    name: profile?.name || 'You',
    avatar_url: profile?.avatar_url || null,
  });

  onMessageSent(optimisticMessage);
  setContent('');

  if (textareaRef.current) {
    textareaRef.current.style.height = 'auto';
  }

  const tempId = optimisticMessage.id;

  if (
    await queueIfOffline(
      { conversationId, content: messageContent, messageType: MESSAGE_TYPES.TEXT, tempId },
      user.id
    )
  ) {
    setIsSending(false);
    return;
  }

  debugLog('[MessageComposer] sending', { conversationId, tempId, userId: user.id });

  try {
    const response = await fetch(API_ROUTES.CONVERSATION(conversationId), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: messageContent,
        messageType: MESSAGE_TYPES.TEXT,
        ...(selectedActor &&
          !selectedActor.is_personal && { senderActorId: selectedActor.actor_id }),
      }),
    });

    debugLog('[MessageComposer] response status', response.status);

    if (!response.ok) {
      if (
        await handleNetworkError(
          new Error(`HTTP ${response.status}`),
          { conversationId, content: messageContent, messageType: MESSAGE_TYPES.TEXT, tempId },
          user.id
        )
      ) {
        setIsSending(false);
        return;
      }
      const errorData = await response.json().catch(() => ({}) as Record<string, unknown>);
      logger.error('[MessageComposer] API error:', errorData);
      const desc = errorData.details || '';
      toast.error(errorData.error || 'Failed to send message', {
        description: typeof desc === 'string' ? desc : undefined,
      });
      onMessageFailed?.(tempId, errorData.error || desc);
    } else {
      const data = (await response.json().catch(() => null)) as MessageResponse | null;
      debugLog('[MessageComposer] success id', data?.id);

      if (data?.id) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: fullMessage } = (await supabase
            .from(DATABASE_TABLES.MESSAGE_DETAILS as any)
            .select('*')
            .eq('id', data.id)
            .single()) as { data: Message | null };

          if (fullMessage) {
            debugLog('[MessageComposer] confirmed full message', fullMessage.id);
            onMessageConfirmed?.(tempId, fullMessage);
          }
        } catch (err) {
          logger.error('[MessageComposer] Failed to fetch message immediately:', err);
        }
      }
    }
  } catch (err) {
    logger.error('[MessageComposer] Network error:', err);
    if (
      await handleNetworkError(
        err,
        { conversationId, content: messageContent, messageType: MESSAGE_TYPES.TEXT, tempId },
        user.id
      )
    ) {
      setIsSending(false);
      return;
    }
    toast.error('Network error. Please try again.');
    onMessageFailed?.(tempId, 'Network error');
  } finally {
    setIsSending(false);
  }
}
