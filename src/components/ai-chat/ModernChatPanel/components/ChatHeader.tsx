/**
 * CHAT HEADER COMPONENT
 * Header with title, model selector, and actions
 */

import { useRouter } from 'next/navigation';
import { Cat, Trash2, Settings2 } from 'lucide-react';
import { ROUTES } from '@/config/routes';
import { ModelSelector } from './ModelSelector';

interface ChatHeaderProps {
  selectedModel: string;
  onModelSelect: (model: string) => void;
  isLoading: boolean;
  hasMessages: boolean;
  onClearChat: () => void;
}

export function ChatHeader({
  selectedModel,
  onModelSelect,
  isLoading,
  hasMessages,
  onClearChat,
}: ChatHeaderProps) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border-subtle bg-muted">
          <Cat className="h-5 w-5 text-foreground" />
        </div>
        <div>
          <h1 className="font-semibold text-foreground">Cat</h1>
          <p className="text-xs text-muted-foreground">Saved to your history · clear anytime</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ModelSelector
          selectedModel={selectedModel}
          onSelect={onModelSelect}
          disabled={isLoading}
        />

        {hasMessages && (
          <button
            onClick={onClearChat}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-md p-2 text-muted-dim transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Clear chat"
            title="Clear chat"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}

        <button
          onClick={() => router.push(ROUTES.SETTINGS_AI)}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-md p-2 text-muted-dim transition-colors hover:bg-muted hover:text-foreground"
          aria-label="AI settings"
          title="AI Settings"
        >
          <Settings2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
