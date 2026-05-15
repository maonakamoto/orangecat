'use client';

import { useState } from 'react';
import { Cpu, ChevronDown, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { BADGE_COLORS } from '@/config/badge-colors';
import { cn } from '@/lib/utils';
import {
  AI_MODEL_REGISTRY,
  getModelsByTier,
  type ModelTier,
  type AIModelMetadata,
} from '@/config/ai-models';

interface AIModelSelectorProps {
  defaultModelId: string | null;
  defaultTier: ModelTier;
  autoRouterEnabled: boolean;
  disabled?: boolean;
  onFieldFocus?: (field: string | null) => void;
  onModelSelect: (model: AIModelMetadata) => void;
}

export function AIModelSelector({
  defaultModelId,
  defaultTier,
  autoRouterEnabled,
  disabled = false,
  onFieldFocus,
  onModelSelect,
}: AIModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedModel = defaultModelId ? AI_MODEL_REGISTRY[defaultModelId] : null;

  const handleModelSelect = (model: AIModelMetadata) => {
    onModelSelect(model);
    setIsOpen(false);
  };

  return (
    <div onFocus={() => onFieldFocus?.('defaultModel')} onBlur={() => onFieldFocus?.(null)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'w-full p-3 rounded-lg border-2 text-left transition-all flex items-center justify-between',
          isOpen
            ? 'border-tiffany-500 bg-tiffany-50'
            : 'border-gray-200 dark:border-border hover:border-gray-300',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <div className="flex items-center gap-3">
          <Cpu className="w-5 h-5 text-gray-400 dark:text-muted-foreground" />
          {selectedModel ? (
            <div>
              <span className="font-medium">{selectedModel.name}</span>
              <span className="text-sm text-gray-500 dark:text-muted-foreground ml-2">
                {selectedModel.provider}
              </span>
            </div>
          ) : (
            <span className="text-gray-500 dark:text-muted-foreground">
              {autoRouterEnabled ? 'Auto-selected based on tier' : 'Select a model...'}
            </span>
          )}
        </div>
        <ChevronDown
          className={cn(
            'w-5 h-5 text-gray-400 dark:text-muted-foreground transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen && (
        <div className="mt-2 p-2 border border-gray-200 dark:border-border rounded-lg bg-white dark:bg-card shadow-lg max-h-64 overflow-y-auto">
          {getModelsByTier(defaultTier).map(model => (
            <button
              key={model.id}
              type="button"
              onClick={() => handleModelSelect(model)}
              className={cn(
                'w-full p-2 rounded-lg text-left hover:bg-gray-50 dark:hover:bg-muted flex items-center justify-between',
                selectedModel?.id === model.id && 'bg-tiffany-50'
              )}
            >
              <div>
                <div className="font-medium text-sm">{model.name}</div>
                <div className="text-xs text-gray-500 dark:text-muted-foreground">
                  {model.provider}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {model.isFree && <Badge className={`${BADGE_COLORS.success} text-xs`}>FREE</Badge>}
                {model.capabilities.includes('vision') && (
                  <span title="Vision capable">
                    <Eye className="w-3 h-3 text-gray-400 dark:text-muted-foreground" />
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
