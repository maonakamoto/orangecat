/**
 * Cat Hub Page - Unified AI Assistant Interface
 *
 * Single workspace for chat, context, and controls.
 */

'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRequireAuth } from '@/hooks/useAuth';
import { useAISettings } from '@/hooks/useAISettings';
import { useCatContext } from '@/hooks/useCatContext';
import { useCatPermissions } from '@/hooks/useCatPermissions';
import Loading from '@/components/Loading';
import { ModernChatPanel } from '@/components/ai-chat/ModernChatPanel';
import { CatContextTab } from '@/components/ai-chat/CatContextTab';
import { CatSettingsTab } from '@/components/ai-chat/CatSettingsTab';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Cat, CheckCircle2, AlertTriangle } from 'lucide-react';
import {
  CAT_HUB_COPY,
  CAT_HUB_STATUS_ITEMS,
  CAT_HUB_TABS,
  isCatHubTab,
  type CatHubTab,
} from '@/config/cat-hub';

export default function CatHubPage() {
  const { user, isLoading, hydrated: _hydrated } = useRequireAuth();
  const searchParams = useSearchParams();
  const { hasByok, primaryKey, platformUsage, isLoading: aiLoading } = useAISettings();
  const { summary, isLoading: contextLoading } = useCatContext();
  const { permissions, isLoading: permissionsLoading } = useCatPermissions();
  const [activeTab, setActiveTab] = useState<CatHubTab>('chat');

  useEffect(() => {
    const tab = searchParams?.get('tab');
    if (isCatHubTab(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    if (!isCatHubTab(value)) {
      return;
    }
    setActiveTab(value);
    const url = new URL(window.location.href);
    if (value === 'chat') {
      url.searchParams.delete('tab');
    } else {
      url.searchParams.set('tab', value);
    }
    window.history.replaceState({}, '', url.toString());
  };

  if (isLoading) {
    return <Loading fullScreen message="Loading..." />;
  }

  if (!user) {
    return null;
  }

  // Pre-seed the Cat with a message from onboarding (or any ?q= link)
  const initialMessage = searchParams?.get('q') || undefined;
  const isNewUser = searchParams?.get('welcome') === 'true';

  const contextValue = contextLoading
    ? 'Checking'
    : summary
      ? `${summary.completeness}%`
      : 'No data';
  const keyValue = aiLoading ? 'Checking' : hasByok ? primaryKey?.provider || 'BYOK' : 'Platform';
  const permissionValue = permissionsLoading
    ? 'Checking'
    : permissions
      ? `${permissions.summary.enabledActions}/${permissions.summary.totalActions}`
      : 'Unavailable';

  const statusValues = {
    context: contextValue,
    keys: keyValue,
    permissions: permissionValue,
  };

  const hasRisk = !!permissions?.summary.highRiskEnabled;
  const remainingRequests = platformUsage?.requests_remaining;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col px-3 py-4 sm:px-5 sm:py-6">
        <header className="mb-4 border-b border-border-subtle pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md border border-border-subtle bg-muted">
                <Cat className="h-6 w-6 text-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  {CAT_HUB_COPY.eyebrow}
                </p>
                <h1 className="text-3xl font-semibold text-foreground">{CAT_HUB_COPY.title}</h1>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  {CAT_HUB_COPY.description}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 lg:min-w-[25rem]">
              {CAT_HUB_STATUS_ITEMS.map(item => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    className="min-w-0 rounded-md border border-border-subtle bg-muted/30 px-3 py-2"
                  >
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Icon className="h-3.5 w-3.5" />
                      <span className="truncate">{item.label}</span>
                    </div>
                    <p className="mt-1 truncate text-sm font-medium text-foreground">
                      {statusValues[item.id as keyof typeof statusValues]}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
          {(hasRisk || typeof remainingRequests === 'number') && (
            <div className="mt-3 flex flex-wrap gap-2">
              {typeof remainingRequests === 'number' && !hasByok && (
                <div className="inline-flex items-center gap-1.5 rounded-sm border border-border-subtle bg-muted/30 px-2 py-1 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {remainingRequests} platform messages left today
                </div>
              )}
              {hasRisk && (
                <div className="inline-flex items-center gap-1.5 rounded-sm border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-xs text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  High-risk actions require confirmation
                </div>
              )}
            </div>
          )}
        </header>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="sticky top-0 z-20 mb-4 grid h-auto w-full grid-cols-3 gap-1 rounded-md border border-border-subtle bg-background p-1">
            {CAT_HUB_TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex min-w-0 flex-col items-start gap-1 rounded-sm px-3 py-2 text-left data-[state=active]:bg-foreground data-[state=active]:text-background"
                >
                  <span className="flex w-full items-center gap-2">
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate text-sm font-medium">{tab.label}</span>
                  </span>
                  <span className="hidden max-w-full truncate text-xs opacity-70 sm:block">
                    {tab.description}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <div className="pb-20 sm:pb-6">
            <TabsContent value="chat" className="mt-0 focus:outline-none">
              <ModernChatPanel initialMessage={initialMessage} isNewUser={isNewUser} />
            </TabsContent>

            <TabsContent value="context" className="mt-0 focus:outline-none">
              <section className="mx-auto max-w-3xl">
                <div className="mb-4 border-b border-border-subtle pb-4">
                  <h2 className="text-xl font-semibold text-foreground">
                    {CAT_HUB_COPY.contextTitle}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {CAT_HUB_COPY.contextDescription}
                  </p>
                </div>
                <CatContextTab />
              </section>
            </TabsContent>

            <TabsContent value="settings" className="mt-0 focus:outline-none">
              <section className="mx-auto max-w-3xl">
                <div className="mb-4 border-b border-border-subtle pb-4">
                  <h2 className="text-xl font-semibold text-foreground">
                    {CAT_HUB_COPY.settingsTitle}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {CAT_HUB_COPY.settingsDescription}
                  </p>
                </div>
                <CatSettingsTab />
              </section>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </main>
  );
}
