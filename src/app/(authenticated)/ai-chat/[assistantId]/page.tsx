'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Bot, MessageSquare } from 'lucide-react';
import { logger } from '@/utils/logger';
import Button from '@/components/ui/Button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import Link from 'next/link';
import { STATUS } from '@/config/database-constants';
import { formatDate } from '@/utils/dates';
import { API_ROUTES } from '@/config/api-routes';

interface Conversation {
  id: string;
  title?: string | null;
  status: string;
  total_messages: number;
  created_at: string;
  last_message_at?: string | null;
}

interface Assistant {
  id: string;
  title: string;
  description?: string | null;
  avatar_url?: string | null;
  status: string;
}

export default function AIAssistantChatPage() {
  const params = useParams();
  const router = useRouter();
  const assistantId = params?.assistantId as string | undefined;

  const [assistant, setAssistant] = useState<Assistant | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!assistantId) {
      return;
    }

    const loadData = async () => {
      try {
        // Load assistant details
        const assistantRes = await fetch(API_ROUTES.AI_ASSISTANTS.BY_ID(assistantId));
        if (assistantRes.ok) {
          const data = await assistantRes.json();
          setAssistant(data.data || data);
        }

        // Load existing conversations
        const convsRes = await fetch(API_ROUTES.AI_ASSISTANTS.CONVERSATIONS(assistantId));
        if (convsRes.ok) {
          const data = await convsRes.json();
          setConversations(data.data || []);
        }
      } catch (err) {
        logger.error('Error loading data', err, 'AI');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [assistantId]);

  const handleNewConversation = async () => {
    if (!assistantId) {
      return;
    }
    setIsCreating(true);
    try {
      const response = await fetch(API_ROUTES.AI_ASSISTANTS.CONVERSATIONS(assistantId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to create conversation');
      }

      const data = await response.json();
      if (data.success && data.data) {
        router.push(`/ai-chat/${assistantId}/${data.data.id}`);
      } else {
        throw new Error(data.error || 'Failed to create');
      }
    } catch (err) {
      logger.error('Error creating conversation', err, 'AI');
      toast.error('Failed to start conversation');
    } finally {
      setIsCreating(false);
    }
  };

  if (!assistantId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Invalid assistant</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-dim" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Assistant Info */}
      <div className="flex items-start gap-4 mb-8">
        <Avatar className="h-16 w-16">
          <AvatarImage src={assistant?.avatar_url || undefined} />
          <AvatarFallback className="bg-tiffany-100 text-tiffany-600">
            <Bot className="h-8 w-8" />
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {assistant?.title || 'AI Assistant'}
          </h1>
          {assistant?.description && (
            <p className="text-muted-foreground mt-1">{assistant.description}</p>
          )}
        </div>
      </div>

      {/* New Conversation Button */}
      <Button
        onClick={handleNewConversation}
        disabled={isCreating || assistant?.status !== STATUS.AI_ASSISTANTS.ACTIVE}
        className="w-full mb-8"
        size="lg"
      >
        {isCreating ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Starting...
          </>
        ) : (
          <>
            <MessageSquare className="h-5 w-5 mr-2" />
            Start New Conversation
          </>
        )}
      </Button>

      {assistant?.status !== STATUS.AI_ASSISTANTS.ACTIVE && (
        <p className="text-amber-600 text-sm mb-4 text-center">
          This assistant is not currently active.
        </p>
      )}

      {/* Previous Conversations */}
      {conversations.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Previous Conversations</h2>
          <div className="space-y-2">
            {conversations.map(conv => (
              <Link
                key={conv.id}
                href={`/ai-chat/${assistantId}/${conv.id}`}
                className="oc-surface oc-card-link flex items-center justify-between p-4"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {conv.title || 'Untitled conversation'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {conv.total_messages} messages
                    {conv.last_message_at && <> &middot; {formatDate(conv.last_message_at)}</>}
                  </p>
                </div>
                <MessageSquare className="h-5 w-5 text-muted-dim flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {conversations.length === 0 && !isLoading && (
        <div className="text-center text-muted-foreground py-8">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-dim dark:text-muted-foreground/40" />
          <p>No conversations yet. Start your first one!</p>
        </div>
      )}
    </div>
  );
}
