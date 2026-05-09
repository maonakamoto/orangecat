'use client';

import { AIChatMessage } from './AIChatMessage';
import { AIChatInput } from './AIChatInput';
import { ModelSelector, ModelBadge } from './ModelSelector';
import { Loader2, Bot, ArrowLeft, Key, Gift, AlertCircle } from 'lucide-react';
import { ROUTES } from '@/config/routes';
import { ENTITY_REGISTRY } from '@/config/entity-registry';
import Button from '@/components/ui/Button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useAIChatPanel } from './useAIChatPanel';

interface AIChatPanelProps {
  assistantId: string;
  conversationId: string;
  userAvatar?: string | null;
  userName?: string;
}

export function AIChatPanel({
  assistantId,
  conversationId,
  userAvatar,
  userName = 'You',
}: AIChatPanelProps) {
  const {
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
  } = useAIChatPanel(assistantId, conversationId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()} variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  const assistant = conversation?.assistant;

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex items-center gap-3 p-4 bg-white border-b border-gray-200">
        <Link
          href={ENTITY_REGISTRY['ai_assistant'].basePath}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors min-h-11 min-w-11 flex items-center justify-center"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>

        <Avatar className="h-10 w-10">
          <AvatarImage src={assistant?.avatar_url || undefined} />
          <AvatarFallback className="bg-tiffany-100 text-tiffany-600">
            <Bot className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-gray-900 truncate">
            {assistant?.title || 'AI Assistant'}
          </h2>
          <div className="flex items-center gap-2 mt-0.5">
            {lastModelUsed && <ModelBadge modelId={lastModelUsed} />}
            {conversation?.title && (
              <span className="text-base text-gray-500 truncate">{conversation.title}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {userStatus?.hasByok ? (
            <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
              <Key className="h-3 w-3 mr-1" />
              BYOK
            </Badge>
          ) : (
            userStatus && (
              <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200">
                <Gift className="h-3 w-3 mr-1" />
                {userStatus.freeMessagesRemaining}/{userStatus.freeMessagesPerDay} free
              </Badge>
            )
          )}
        </div>

        {userStatus?.hasByok && (
          <ModelSelector
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            size="sm"
            showPricing={true}
          />
        )}
      </div>

      {userStatus &&
        !userStatus.hasByok &&
        userStatus.freeMessagesRemaining <= 2 &&
        userStatus.freeMessagesRemaining > 0 && (
          <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 flex items-center gap-2 text-sm text-amber-700">
            <AlertCircle className="h-4 w-4" />
            <span>
              Only {userStatus.freeMessagesRemaining} free message
              {userStatus.freeMessagesRemaining !== 1 ? 's' : ''} remaining today.
            </span>
            <Link
              href={ROUTES.DASHBOARD.SETTINGS}
              className="text-amber-800 underline hover:no-underline"
            >
              Add API key
            </Link>
          </div>
        )}

      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <Avatar className="h-16 w-16 mb-4">
              <AvatarImage src={assistant?.avatar_url || undefined} />
              <AvatarFallback className="bg-tiffany-100 text-tiffany-600">
                <Bot className="h-8 w-8" />
              </AvatarFallback>
            </Avatar>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {assistant?.welcome_message?.trim() ? assistant.title : 'Start a conversation'}
            </h3>
            <p className="text-gray-600 max-w-md whitespace-pre-wrap">
              {assistant?.welcome_message?.trim() ||
                `Send a message to begin chatting with ${assistant?.title || 'your Cat'}.`}
            </p>
            <p className="text-sm text-gray-400 mt-2">Type a message below to begin</p>
            {!userStatus?.hasByok && (
              <p className="text-sm text-gray-400 mt-4">
                Using free tier • {userStatus?.freeMessagesRemaining || 0} messages remaining today
              </p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {messages.map(message => (
              <AIChatMessage
                key={message.id}
                message={message}
                assistantAvatar={assistant?.avatar_url}
                assistantName={assistant?.title}
                userAvatar={userAvatar}
                userName={userName}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <AIChatInput
        onSend={handleSendMessage}
        placeholder={`Message ${assistant?.title || 'assistant'}...`}
      />
    </div>
  );
}
