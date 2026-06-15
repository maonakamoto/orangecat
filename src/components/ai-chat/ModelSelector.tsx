/**
 * Inline Model Selector Components
 *
 * Simple inline components for model selection and display.
 */

'use client';

import { MODEL_REGISTRY } from '@/config/model-registry';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BADGE_COLORS } from '@/config/badge-colors';
import { Sparkles, Zap, Crown } from 'lucide-react';

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  size?: 'sm' | 'default';
  showPricing?: boolean;
}

export function ModelSelector({
  selectedModel,
  onModelChange,
  size = 'default',
  showPricing = false,
}: ModelSelectorProps) {
  const models = Object.values(MODEL_REGISTRY);

  return (
    <Select value={selectedModel} onValueChange={onModelChange}>
      <SelectTrigger className={size === 'sm' ? 'h-8 text-xs' : ''}>
        <SelectValue placeholder="Select model" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="auto">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3 w-3" />
            <span>Auto (Best for task)</span>
          </div>
        </SelectItem>
        {models.map(model => (
          <SelectItem key={model.id} value={model.id}>
            <div className="flex items-center gap-2">
              {model.tier === 'free' && <Zap className="h-3 w-3 text-status-positive" />}
              {model.tier === 'paid' && <Crown className="h-3 w-3 text-fg-secondary" />}
              <span>{model.name}</span>
              {showPricing && model.costPerMessage && (
                <span className="text-xs text-fg-secondary">
                  (${model.costPerMessage.toFixed(3)})
                </span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface ModelBadgeProps {
  modelId: string;
}

export function ModelBadge({ modelId }: ModelBadgeProps) {
  const model = MODEL_REGISTRY[modelId];

  if (!model) {
    return (
      <Badge variant="secondary" className="text-xs">
        {modelId}
      </Badge>
    );
  }

  const tierColors = {
    free: BADGE_COLORS.success,
    freemium: BADGE_COLORS.tiffany,
    paid: BADGE_COLORS.orange,
  };

  return (
    <Badge variant="outline" className={`text-xs ${tierColors[model.tier]}`}>
      {model.tier === 'free' && <Zap className="h-3 w-3 mr-1" />}
      {model.tier === 'paid' && <Crown className="h-3 w-3 mr-1" />}
      {model.name}
    </Badge>
  );
}
