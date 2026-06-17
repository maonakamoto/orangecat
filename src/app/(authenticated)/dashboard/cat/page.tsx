/**
 * Cat — conversational AI entry (chat-first)
 *
 * Default view is a full-height chat surface. Context and controls are
 * secondary panels via ?tab=, not competing hub chrome.
 */

'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRequireAuth } from '@/hooks/useAuth';
import Loading from '@/components/Loading';
import { ModernChatPanel } from '@/components/ai-chat/ModernChatPanel/index';
import { useCatQuota } from '@/components/ai-chat/ModernChatPanel/hooks/useCatQuota';
import { CatChatToolbar } from '@/components/ai-chat/CatChatToolbar';
import { CatSecondaryPanel } from '@/components/ai-chat/CatSecondaryPanel';
import { isCatHubTab, type CatHubTab } from '@/config/cat-hub';

export default function CatHubPage() {
  const { user, isLoading } = useRequireAuth();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<CatHubTab>('chat');
  const { quota, refresh: refreshQuota } = useCatQuota();

  useEffect(() => {
    const tab = searchParams?.get('tab');
    if (isCatHubTab(tab)) {
      setActiveTab(tab);
    } else {
      setActiveTab('chat');
    }
  }, [searchParams]);

  if (isLoading) {
    return <Loading fullScreen message="Loading..." />;
  }

  if (!user) {
    return null;
  }

  const initialMessage = searchParams?.get('q') || undefined;
  const isNewUser = searchParams?.get('welcome') === 'true';

  if (activeTab !== 'chat') {
    return <CatSecondaryPanel tab={activeTab} />;
  }

  return (
    // h-full (not a 100dvh calc): fill the flex-resolved <main> height so the
    // composer pins to the bottom. The dvh calc was collapsing to content height
    // on this route, floating the composer halfway up the page.
    <div className="oc-chat-layout h-full min-h-0">
      <CatChatToolbar activePanel="chat" quota={quota} />
      <ModernChatPanel
        variant="focus"
        initialMessage={initialMessage}
        isNewUser={isNewUser}
        onMessageSent={refreshQuota}
        className="min-h-0 flex-1"
      />
    </div>
  );
}
