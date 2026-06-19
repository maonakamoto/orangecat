'use client';

import { LucideIcon, Zap, Eye, Settings2, DollarSign, Info } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  MODEL_TIERS,
  TIER_CONFIG,
  getModelsByTier,
  type ModelTier,
  type AIModelMetadata,
} from '@/config/ai-models';
import { useDisplayCurrency } from '@/hooks/useDisplayCurrency';
import { AIModelSelector } from './AIModelSelector';

export interface AIPreferences {
  defaultModelId: string | null;
  defaultTier: ModelTier;
  autoRouterEnabled: boolean;
  maxCostBtc: number;
  requireVision: boolean;
  requireFunctionCalling: boolean;
}

interface AIModelPreferencesProps {
  preferences: AIPreferences;
  onChange: (preferences: Partial<AIPreferences>) => void;
  onFieldFocus?: (field: string | null) => void;
  disabled?: boolean;
}

interface CapabilityToggleCardProps {
  icon: LucideIcon;
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  disabled?: boolean;
}

function CapabilityToggleCard({
  icon: Icon,
  label,
  description,
  checked,
  onToggle,
  onFocus,
  onBlur,
  disabled,
}: CapabilityToggleCardProps) {
  return (
    <Card variant="minimal" className="p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-fg-secondary" />
          <div>
            <span className="font-medium text-sm">{label}</span>
            <p className="text-xs text-fg-secondary">{description}</p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={onToggle}
          onFocus={onFocus}
          onBlur={onBlur}
          disabled={disabled}
          className={cn(
            'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
            checked ? 'bg-fg-primary' : 'bg-surface-raised',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <span
            className={cn(
              'inline-block h-3 w-3 transform rounded-full bg-surface-base transition-transform',
              checked ? 'translate-x-5' : 'translate-x-1'
            )}
          />
        </button>
      </div>
    </Card>
  );
}

export function AIModelPreferences({
  preferences,
  onChange,
  onFieldFocus,
  disabled = false,
}: AIModelPreferencesProps) {
  const { displayCurrency } = useDisplayCurrency();

  const handleTierChange = (tier: ModelTier) => {
    onChange({ defaultTier: tier, defaultModelId: null });
  };

  const handleModelSelect = (model: AIModelMetadata) => {
    onChange({ defaultModelId: model.id, defaultTier: model.tier });
  };

  return (
    <div className="space-y-6">
      <Card variant="minimal" className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-surface-raised flex items-center justify-center">
              <Zap className="w-5 h-5 text-fg-primary" />
            </div>
            <div>
              <h3 className="font-medium">Auto Router</h3>
              <p className="text-sm text-fg-secondary">
                Automatically selects the best model based on message complexity
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={preferences.autoRouterEnabled}
            onClick={() => onChange({ autoRouterEnabled: !preferences.autoRouterEnabled })}
            onFocus={() => onFieldFocus?.('autoRouter')}
            onBlur={() => onFieldFocus?.(null)}
            disabled={disabled}
            className={cn(
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
              preferences.autoRouterEnabled ? 'bg-fg-primary' : 'bg-surface-raised',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <span
              className={cn(
                'inline-block h-4 w-4 transform rounded-full bg-surface-base transition-transform',
                preferences.autoRouterEnabled ? 'translate-x-6' : 'translate-x-1'
              )}
            />
          </button>
        </div>
        {preferences.autoRouterEnabled && (
          <div className="mt-3 p-3 bg-surface-raised/40 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-fg-primary mt-0.5 flex-shrink-0" />
              <p className="text-xs text-fg-primary">
                Simple messages → Economy models. Complex tasks → Standard/Premium models. Saves
                money without sacrificing quality.
              </p>
            </div>
          </div>
        )}
      </Card>

      <div>
        <label className="block text-sm font-medium text-fg-primary mb-2">
          Default Tier
          {preferences.autoRouterEnabled && (
            <span className="text-fg-secondary font-normal ml-2">
              (fallback when auto-router is uncertain)
            </span>
          )}
        </label>
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-2"
          onFocus={() => onFieldFocus?.('defaultTier')}
          onBlur={() => onFieldFocus?.(null)}
        >
          {MODEL_TIERS.map(tier => {
            const config = TIER_CONFIG[tier];
            const models = getModelsByTier(tier);
            const isSelected = preferences.defaultTier === tier;

            return (
              <button
                key={tier}
                type="button"
                onClick={() => handleTierChange(tier)}
                disabled={disabled}
                className={cn(
                  'p-3 rounded-lg border-2 text-left transition-all',
                  isSelected
                    ? 'border-fg-primary bg-surface-raised/40'
                    : 'border-default hover:border-strong',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{config.label}</span>
                  {config.badge && (
                    <Badge className={`${config.badgeClass} text-xs px-1.5 py-0`}>
                      {config.badge}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-fg-secondary">{models.length} models</p>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-fg-primary mb-2">
          Default Model
          <span className="text-fg-secondary font-normal ml-2">(optional)</span>
        </label>
        <AIModelSelector
          defaultModelId={preferences.defaultModelId}
          defaultTier={preferences.defaultTier}
          autoRouterEnabled={preferences.autoRouterEnabled}
          disabled={disabled}
          onFieldFocus={onFieldFocus}
          onModelSelect={handleModelSelect}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-fg-primary mb-2">
          Maximum Cost per Request ({displayCurrency})
        </label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-tertiary" />
            <Input
              type="number"
              value={preferences.maxCostBtc}
              onChange={e => onChange({ maxCostBtc: parseInt(e.target.value) || 0 })}
              onFocus={() => onFieldFocus?.('maxCostBtc')}
              onBlur={() => onFieldFocus?.(null)}
              disabled={disabled}
              min={0}
              className="pl-9"
              placeholder="100"
            />
          </div>
          <span className="text-sm text-fg-secondary">{displayCurrency}</span>
        </div>
        <p className="mt-1 text-xs text-fg-secondary">
          Set to 0 for unlimited. Auto-router will avoid models exceeding this limit.
        </p>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-fg-primary">Required Capabilities</label>
        <CapabilityToggleCard
          icon={Eye}
          label="Vision"
          description="Image understanding capability"
          checked={preferences.requireVision}
          onToggle={() => onChange({ requireVision: !preferences.requireVision })}
          onFocus={() => onFieldFocus?.('requireVision')}
          onBlur={() => onFieldFocus?.(null)}
          disabled={disabled}
        />
        <CapabilityToggleCard
          icon={Settings2}
          label="Function Calling"
          description="Tool use and structured output"
          checked={preferences.requireFunctionCalling}
          onToggle={() => onChange({ requireFunctionCalling: !preferences.requireFunctionCalling })}
          onFocus={() => onFieldFocus?.('requireFunctionCalling')}
          onBlur={() => onFieldFocus?.(null)}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

export default AIModelPreferences;
