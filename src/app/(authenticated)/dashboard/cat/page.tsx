/**
 * Cat — conversational AI entry (chat-first)
 *
 * Default view is a full-height chat surface. Context and controls are
 * secondary panels via ?tab=, not competing hub chrome.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRequireAuth } from '@/hooks/useAuth';
import Loading from '@/components/Loading';
import { ModernChatPanel } from '@/components/ai-chat/ModernChatPanel/index';
import { useCatQuota } from '@/components/ai-chat/ModernChatPanel/hooks/useCatQuota';
import { CatChatToolbar } from '@/components/ai-chat/CatChatToolbar';
import { CatSecondaryPanel } from '@/components/ai-chat/CatSecondaryPanel';
import { isCatHubTab, type CatHubTab } from '@/config/cat-hub';
import { APP_CONTENT_HEIGHT_CLASS } from '@/config/layout-chrome';

export default function CatHubPage() {
  const { user, isLoading } = useRequireAuth();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<CatHubTab>('chat');
  const [selectedModel, setSelectedModel] = useState('auto');
  const [chatIsLoading, setChatIsLoading] = useState(false);
  const { quota, refresh: refreshQuota } = useCatQuota();

  useEffect(() => {
    const tab = searchParams?.get('tab');
    if (isCatHubTab(tab)) {
      setActiveTab(tab);
    } else {
      setActiveTab('chat');
    }
  }, [searchParams]);

  const handleModelSelect = useCallback((model: string) => {
    setSelectedModel(model);
  }, []);

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
    <div className={`oc-chat-layout ${APP_CONTENT_HEIGHT_CLASS}`}>
      <CatChatToolbar
        selectedModel={selectedModel}
        onModelSelect={handleModelSelect}
        modelSelectorDisabled={chatIsLoading}
        activePanel="chat"
        quota={quota}
      />
      <ModernChatPanel
        variant="focus"
        initialMessage={initialMessage}
        isNewUser={isNewUser}
        selectedModel={selectedModel}
        onModelSelect={handleModelSelect}
        onLoadingChange={setChatIsLoading}
        onMessageSent={refreshQuota}
        className="min-h-0 flex-1"
      />
    </div>
  );
}
