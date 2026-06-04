/**
 * PROVIDER STEP COMPONENT
 * Second step - choose AI provider
 */

import { Lightbulb } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { aiProviders } from '@/data/aiProviders';
import { aiOnboardingContent } from '@/lib/ai-guidance';

interface ProviderStepProps {
  selectedProvider: string | null;
  onSelectProvider: (providerId: string) => void;
}

export function ProviderStep({ selectedProvider, onSelectProvider }: ProviderStepProps) {
  return (
    <div className="space-y-6">
      {/* Provider Grid */}
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
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  {p.name}
                  {p.recommended && (
                    <Badge className="bg-muted text-foreground border border-border-subtle text-xs">
                      Recommended
                    </Badge>
                  )}
                </h3>
                <p className="text-xs text-muted-foreground capitalize">
                  {p.type === 'aggregator' ? 'Aggregator' : 'Direct Provider'}
                </p>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  'text-xs',
                  p.difficulty === 'beginner'
                    ? 'border-green-300 text-green-700'
                    : p.difficulty === 'intermediate'
                      ? 'border-yellow-300 text-yellow-700'
                      : 'border-red-300 text-red-700'
                )}
              >
                {p.difficulty}
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground mb-3">{p.description}</p>

            <div className="flex flex-wrap gap-1.5">
              {p.supportedModels.slice(0, 3).map(model => (
                <Badge key={model} variant="outline" className="text-xs text-muted-foreground">
                  {model}
                </Badge>
              ))}
              {p.supportedModels.length > 3 && (
                <Badge variant="outline" className="text-xs text-muted-dim">
                  +{p.supportedModels.length - 3} more
                </Badge>
              )}
            </div>
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
