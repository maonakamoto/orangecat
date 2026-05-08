'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { type AIMessage } from './AIChatMessage';
import { logger } from '@/utils/logger';
import { toast } from 'sonner';
import { API_ROUTES } from '@/config/api-routes';

export interface AIAssistant {
  id: string;
  title: string;
  avatar_url?: string | null;
  pricing_model?: string;
  price_per_message?: number;
  price_per_1k_tokens?: number;
  welcome_message?: string | null;
  free_messages_per_day?: number | null;
  model_preference?: string | null;
}

export interface UserStatus {
  hasByok: boolean;
  usedFreeMessage?: boolean;
  freeMessagesRemaining: number;
  freeMessagesPerDay: number;
}

export interface Conversation {
  id: string;
  title?: string | null;
  total_messages: number;
  total_cost_btc: number;
  messages: AIMessage[];
  assistant?: AIAssistant;
}

export function useAIChatPanel(assistantId: string, conversationId: string) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('auto');
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [lastModelUsed, setLastModelUsed] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const loadConversation = async () => {
      try {
        setIsLoading(true);

        const [convResponse, keysResponse] = await Promise.all([
          fetch(API_ROUTES.AI_ASSISTANTS.CONVERSATION(assistantId, conversationId)),
          fetch(API_ROUTES.USER.API_KEYS),
        ]);

        if (!convResponse.ok) {
          throw new Error('Failed to load conversation');
        }

        const convData = await convResponse.json();
        if (convData.success) {
          setConversation(convData.data);
          setMessages(convData.data.messages.filter((m: AIMessage) => m.role !== 'system'));

          const assistant = convData.data.assistant;
          if (assistant?.model_preference && assistant.model_preference !== 'any') {
            setSelectedModel(assistant.model_preference);
          }
        } else {
          throw new Error(convData.error || 'Failed to load conversation');
        }

        if (keysResponse.ok) {
          const keysData = await keysResponse.json();
          if (keysData.success) {
            setUserStatus({
              hasByok: keysData.data.hasByok,
              freeMessagesRemaining: keysData.data.platformUsage?.requests_remaining || 0,
              freeMessagesPerDay: keysData.data.platformUsage?.daily_limit || 10,
            });
          }
        }
      } catch (err) {
        logger.error('Error loading conversation', err, 'AI');
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setIsLoading(false);
      }
    };

    loadConversation();
  }, [assistantId, conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSendMessage = useCallback(
    async (content: string) => {
      try {
        const tempUserMessage: AIMessage = {
          id: `temp-${Date.now()}`,
          role: 'user',
          content,
          created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, tempUserMessage]);
        scrollToBottom();

        const response = await fetch(
          `/api/ai-assistants/${assistantId}/conversations/${conversationId}/messages`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content,
              model: selectedModel !== 'auto' ? selectedModel : undefined,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          if (response.status === 429) {
            toast.error(
              errorData.details?.message ||
                'Daily limit reached. Add an API key for unlimited usage.'
            );
          }
          throw new Error(errorData.error || 'Failed to send message');
        }

        const data = await response.json();
        if (data.success) {
          setMessages(prev => [
            ...prev.filter(m => m.id !== tempUserMessage.id),
            data.data.userMessage,
            data.data.assistantMessage,
          ]);

          if (data.data.assistantMessage?.model_used) {
            setLastModelUsed(data.data.assistantMessage.model_used);
          }

          if (data.data.userStatus) {
            setUserStatus(data.data.userStatus);
          }
        } else {
          throw new Error(data.error || 'Failed to send');
        }
      } catch (err) {
        logger.error('Error sending message', err, 'AI');
        if (!(err instanceof Error && err.message.includes('limit'))) {
          toast.error('Failed to send message. Please try again.');
        }
        setMessages(prev => prev.filter(m => !m.id.startsWith('temp-')));
        throw err;
      }
    },
    [assistantId, conversationId, scrollToBottom, selectedModel]
  );

  return {
    conversation,
    messages,
    isLoading,
    error,
    selectedModel,
    setSelectedModel,
    userStatus,
    lastModelUsed,
    messagesEndRef,
    handleSendMessage,
  };
}
