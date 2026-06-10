'use client';

/**
 * Secondary Cat panels (context, controls) with a simple back-to-chat affordance.
 */

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ROUTES } from '@/config/routes';
import { CatContextTab } from './CatContextTab';
import { CatSettingsTab } from './CatSettingsTab';
import { CatChatToolbar } from './CatChatToolbar';
import { CAT_HUB_COPY, type CatHubTab } from '@/config/cat-hub';
import { APP_CONTENT_HEIGHT_CLASS } from '@/config/layout-chrome';

interface CatSecondaryPanelProps {
  tab: Exclude<CatHubTab, 'chat'>;
}

export function CatSecondaryPanel({ tab }: CatSecondaryPanelProps) {
  const title = tab === 'context' ? CAT_HUB_COPY.contextTitle : CAT_HUB_COPY.controlsTitle;
  const description =
    tab === 'context' ? CAT_HUB_COPY.contextDescription : CAT_HUB_COPY.controlsDescription;

  return (
    <div className={`oc-chat-layout ${APP_CONTENT_HEIGHT_CLASS}`}>
      <CatChatToolbar activePanel={tab} />

      <div className="flex flex-shrink-0 items-center gap-2 border-b border-border-subtle px-3 py-2 sm:px-4">
        <Link
          href={ROUTES.DASHBOARD.CAT}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {CAT_HUB_COPY.backToChat}
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
          <header className="mb-6">
            <h1 className="text-xl font-semibold text-foreground">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </header>
          {tab === 'context' ? <CatContextTab /> : <CatSettingsTab />}
        </div>
      </div>
    </div>
  );
}
