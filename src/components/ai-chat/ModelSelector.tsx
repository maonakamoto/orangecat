/**
 * Inline Model Selector Components
 *
 * Simple inline components for model selection and display.
 * Reads from AI_MODEL_REGISTRY (SSOT) — not the legacy model-registry adapter.
 */

'use client';

import { getAvailableModels, getModelMetadata } from '@/config/ai-models';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
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
  const models = getAvailableModels();

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
              {model.isFree && <Zap className="h-3 w-3 text-status-positive" />}
              {!model.isFree && model.tier === 'premium' && (
                <Crown className="h-3 w-3 text-fg-secondary" />
              )}
              <span>{model.name}</span>
              {showPricing && !model.isFree && (
                <span className="text-xs text-fg-secondary">
                  (${Math.max(model.inputCostPer1M, model.outputCostPer1M).toFixed(2)}/1M)
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
  const model = getModelMetadata(modelId);

  if (!model) {
    return (
      <Badge variant="secondary" className="text-xs">
        {modelId}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="text-xs">
      {model.isFree && <Zap className="h-3 w-3 mr-1 text-status-positive" />}
      {!model.isFree && model.tier === 'premium' && (
        <Crown className="h-3 w-3 mr-1 text-fg-secondary" />
      )}
      {model.name}
    </Badge>
  );
}
