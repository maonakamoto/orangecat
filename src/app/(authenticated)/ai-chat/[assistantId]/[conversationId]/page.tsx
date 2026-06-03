'use client';

import { useParams } from 'next/navigation';
import { AIChatPanel } from '@/components/ai-chat';
import { useAuth } from '@/hooks/useAuth';
import { APP_CONTENT_HEIGHT_CLASS } from '@/config/layout-chrome';

export default function AIConversationPage() {
  const params = useParams();
  const { profile } = useAuth();

  const assistantId = params?.assistantId as string | undefined;
  const conversationId = params?.conversationId as string | undefined;

  if (!assistantId || !conversationId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Invalid conversation</p>
      </div>
    );
  }

  return (
    <div className={APP_CONTENT_HEIGHT_CLASS}>
      <AIChatPanel
        assistantId={assistantId}
        conversationId={conversationId}
        userAvatar={profile?.avatar_url}
        userName={profile?.name || profile?.username || 'You'}
      />
    </div>
  );
}
