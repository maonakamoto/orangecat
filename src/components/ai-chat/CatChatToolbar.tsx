'use client';

/**
 * Minimal toolbar for the Cat chat focus layout.
 * Context and controls live here instead of competing hub tabs/headers.
 */

import Link from 'next/link';
import { FolderOpen, Settings2 } from 'lucide-react';
import { CAT_AGENT, CAT_HUB_TAB_HREFS } from '@/config/cat-hub';
import { cn } from '@/lib/utils';
import { ModelSelector } from './ModernChatPanel/components/ModelSelector';

interface CatChatToolbarProps {
  selectedModel: string;
  onModelSelect: (model: string) => void;
  modelSelectorDisabled?: boolean;
  activePanel?: 'chat' | 'context' | 'settings';
  className?: string;
}

export function CatChatToolbar({
  selectedModel,
  onModelSelect,
  modelSelectorDisabled,
  activePanel = 'chat',
  className,
}: CatChatToolbarProps) {
  const panelLink = (tab: 'context' | 'settings') => {
    const href = CAT_HUB_TAB_HREFS[tab];
    const isActive = activePanel === tab;
    const Icon = tab === 'context' ? FolderOpen : Settings2;
    const label = tab === 'context' ? 'Context' : 'Controls';

    return (
      <Link
        href={href}
        className={cn(
          'flex min-h-10 min-w-10 items-center justify-center gap-1.5 rounded-md px-2.5 text-sm transition-colors sm:min-w-0 sm:px-3',
          isActive
            ? 'bg-muted text-foreground'
            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
        )}
        aria-current={isActive ? 'page' : undefined}
      >
        <Icon className="h-4 w-4 flex-shrink-0" />
        <span className="hidden sm:inline">{label}</span>
      </Link>
    );
  };

  return (
    <div className={cn('oc-chat-toolbar', className)}>
      <div className="flex min-w-0 items-center gap-2" title={CAT_AGENT.privacyBadge}>
        <p className="truncate text-sm font-medium text-foreground">{CAT_AGENT.name}</p>
        <p className="hidden truncate text-xs text-muted-foreground sm:inline">
          · {CAT_AGENT.privacyBadge}
        </p>
      </div>

      <div className="flex flex-shrink-0 items-center gap-1 sm:gap-2">
        {activePanel === 'chat' && (
          <ModelSelector
            selectedModel={selectedModel}
            onSelect={onModelSelect}
            disabled={modelSelectorDisabled}
          />
        )}
        {panelLink('context')}
        {panelLink('settings')}
      </div>
    </div>
  );
}
