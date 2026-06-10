/**
 * PROVIDER STEP COMPONENT
 * Second step - choose AI provider
 */

import { Lightbulb } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { aiProviders } from '@/data/aiProviders';
import { aiOnboardingContent } from '@/lib/ai-guidance';

interface ProviderStepProps {
  selectedProvider: string | null;
  onSelectProvider: (providerId: string) => void;
}

const TYPE_LABEL: Record<string, string> = {
  aggregator: 'Aggregator',
  direct: 'Direct provider',
  local: 'Local (runs on your machine)',
};

export function ProviderStep({ selectedProvider, onSelectProvider }: ProviderStepProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {aiProviders.map(p => (
          <Card
            key={p.id}
            className={cn(
              'cursor-pointer transition-all duration-200 hover:shadow-sm p-6',
              selectedProvider === p.id
                ? 'ring-2 ring-foreground border-foreground bg-muted/40'
                : ''
            )}
            onClick={() => onSelectProvider(p.id)}
          >
            <div className="mb-2">
              <h3 className="font-semibold text-foreground">{p.name}</h3>
              <p className="text-xs text-muted-foreground">{TYPE_LABEL[p.type] ?? p.type}</p>
            </div>
            <p className="text-sm text-muted-foreground">{p.description}</p>
          </Card>
        ))}
      </div>

      {/* Info Box */}
      <div className="bg-muted/40 border border-border-subtle rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-foreground mt-0.5 flex-shrink-0" />
          <div className="text-left">
            <h4 className="font-semibold text-foreground mb-1">
              {aiOnboardingContent.provider.whyTitle}
            </h4>
            <p className="text-foreground text-sm">{aiOnboardingContent.provider.whyContent}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
