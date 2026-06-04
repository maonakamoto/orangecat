'use client';

import { ChevronDown, ChevronRight, Info, Zap } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip';
import { RISK_COLORS, RISK_ICONS } from '@/config/cat-actions';
import type { Action, CategorySummary } from './types';

interface ActionRowProps {
  action: Action;
  isCategoryEnabled: boolean;
  isSaving: boolean;
  isAnySaving: boolean;
  onToggle: (actionId: string, category: string, enabled: boolean) => void;
}

function ActionRow({ action, isCategoryEnabled, isSaving, isAnySaving, onToggle }: ActionRowProps) {
  const RiskIcon = RISK_ICONS[action.riskLevel];

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg ${
        isCategoryEnabled ? 'bg-card' : 'bg-muted opacity-60'
      }`}
    >
      <div className="flex items-center gap-3 flex-1">
        <Tooltip>
          <TooltipTrigger>
            <div className={`p-1.5 rounded ${RISK_COLORS[action.riskLevel]}`}>
              <RiskIcon className="h-4 w-4" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="capitalize">{action.riskLevel} risk</p>
          </TooltipContent>
        </Tooltip>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground text-sm">{action.name}</span>
            {action.requiresConfirmation && (
              <Badge variant="outline" className="text-xs">
                <Zap className="h-3 w-3 mr-1" />
                Requires confirmation
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{action.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isCategoryEnabled ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Switch
                  checked={true}
                  onCheckedChange={checked => onToggle(action.id, action.category, checked)}
                  disabled={isSaving || isAnySaving}
                  className="data-[state=checked]:bg-foreground"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Toggle individual action (category must stay enabled)</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-dim" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Enable the category first to configure this action</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

interface CategoryRowProps {
  cat: CategorySummary;
  actions: Action[];
  isExpanded: boolean;
  saving: string | null;
  onToggleExpanded: (id: string) => void;
  onToggleCategory: (id: string, enabled: boolean) => void;
  onToggleAction: (actionId: string, category: string, enabled: boolean) => void;
}

export function CategoryRow({
  cat,
  actions,
  isExpanded,
  saving,
  onToggleExpanded,
  onToggleCategory,
  onToggleAction,
}: CategoryRowProps) {
  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <button
            onClick={() => onToggleExpanded(cat.category)}
            className="p-1 hover:bg-muted rounded"
          >
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-muted-dim" />
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-dim" />
            )}
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">{cat.name}</h3>
              <Badge variant="secondary" className="text-xs">
                {cat.enabledActionCount}/{cat.actionCount}
              </Badge>
            </div>
            <p className="text-base text-muted-foreground">{cat.description}</p>
          </div>
        </div>
        <Switch
          checked={cat.enabled}
          onCheckedChange={checked => onToggleCategory(cat.category, checked)}
          disabled={saving === cat.category}
        />
      </div>

      {isExpanded && (
        <div className="border-t border-border-subtle bg-muted p-4">
          <div className="space-y-3">
            {actions.map(action => (
              <ActionRow
                key={action.id}
                action={action}
                isCategoryEnabled={cat.enabled}
                isSaving={saving === action.id}
                isAnySaving={saving === cat.category}
                onToggle={onToggleAction}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
