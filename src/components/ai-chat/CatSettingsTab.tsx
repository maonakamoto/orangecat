/**
 * Cat Settings Tab - AI settings and permissions for the Cat hub
 *
 * Combines model selection, API keys, and permissions in one place.
 *
 * Created: 2026-01-22
 */

'use client';

import Link from 'next/link';
import { useAISettings } from '@/hooks/useAISettings';
import { useCatPermissions } from '@/hooks/useCatPermissions';
import {
  Bot,
  Key,
  Shield,
  ShieldAlert,
  ChevronRight,
  Loader2,
  Sparkles,
  Zap,
  AlertTriangle,
  Check,
  Gift,
  type LucideIcon,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { MODEL_TIERS, TIER_CONFIG, type ModelTier } from '@/config/ai-models';
import { ROUTES } from '@/config/routes';

const TIER_ICONS: Record<ModelTier, LucideIcon> = {
  free: Gift,
  economy: Zap,
  standard: Bot,
  premium: Sparkles,
};

export function CatSettingsTab() {
  const { preferences, hasByok, updatePreferences, isLoading: aiLoading } = useAISettings();
  const {
    permissions,
    isLoading: permLoading,
    isSaving: saving,
    toggleCategory,
  } = useCatPermissions();
  const handleTierChange = async (tier: ModelTier) => {
    try {
      await updatePreferences({ default_tier: tier });
    } catch {
      // ignore
    }
  };

  const currentTier = preferences?.default_tier || 'free';

  return (
    <div className="space-y-6">
      {/* AI Model Selection */}
      <div className="overflow-hidden rounded-md border border-border-subtle bg-background">
        <div className="flex items-center gap-2 border-b border-border-subtle bg-muted/50 px-4 py-3">
          <Bot className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">AI Model</span>
        </div>
        <div className="p-4 space-y-3">
          {MODEL_TIERS.map(tierId => {
            const Icon = TIER_ICONS[tierId];
            const isSelected = currentTier === tierId;
            return (
              <button
                key={tierId}
                onClick={() => handleTierChange(tierId)}
                disabled={aiLoading}
                className={`flex w-full items-center gap-3 rounded-md border p-3 transition-colors ${
                  isSelected
                    ? 'border-border-strong bg-muted'
                    : 'border-border-subtle bg-background hover:border-border-strong hover:bg-muted/40'
                }`}
              >
                <div className={`rounded-md p-2 ${isSelected ? 'bg-background' : 'bg-muted'}`}>
                  <Icon
                    className={`h-4 w-4 ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}
                  />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-foreground">{TIER_CONFIG[tierId].label}</p>
                  <p className="text-sm text-muted-foreground">{TIER_CONFIG[tierId].description}</p>
                </div>
                {isSelected && <Check className="h-5 w-5 text-foreground" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* API Keys Status */}
      <div className="overflow-hidden rounded-md border border-border-subtle bg-background">
        <div className="flex items-center gap-2 border-b border-border-subtle bg-muted/50 px-4 py-3">
          <Key className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">API Keys</span>
        </div>
        <div className="p-4">
          {hasByok ? (
            <div className="flex items-center gap-3 rounded-md border border-green-500/20 bg-green-500/10 p-3">
              <div className="rounded-md bg-background p-2">
                <Check className="h-4 w-4 text-green-700 dark:text-green-300" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">API key connected</p>
                <p className="text-xs text-muted-foreground">Using your own provider key</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-md border border-amber-500/20 bg-amber-500/10 p-3">
              <div className="rounded-md bg-background p-2">
                <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-300" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Using platform key</p>
                <p className="text-xs text-muted-foreground">Daily usage limits may apply</p>
              </div>
            </div>
          )}
          <Link
            href={ROUTES.SETTINGS_AI}
            className="mt-3 flex items-center justify-between rounded-md p-3 transition-colors hover:bg-muted"
          >
            <span className="text-sm text-muted-strong">Manage API Keys</span>
            <ChevronRight className="h-4 w-4 text-muted-dim" />
          </Link>
        </div>
      </div>

      {/* Permissions */}
      <div className="overflow-hidden rounded-md border border-border-subtle bg-background">
        <div className="flex items-center justify-between border-b border-border-subtle bg-muted/50 px-4 py-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">Permissions</span>
          </div>
          {permissions && (
            <span className="text-xs text-muted-foreground">
              {permissions.summary.enabledActions}/{permissions.summary.totalActions} enabled
            </span>
          )}
        </div>

        {permLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-dim" />
          </div>
        ) : permissions ? (
          <div className="divide-y divide-border">
            {permissions.summary.categories.map(cat => {
              const isSaving = saving === cat.category;
              return (
                <div key={cat.category} className="flex items-center justify-between px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{cat.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{cat.description}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    {isSaving && <Loader2 className="h-4 w-4 animate-spin text-muted-dim" />}
                    <Switch
                      checked={cat.enabled}
                      onCheckedChange={checked => toggleCategory(cat.category, checked)}
                      disabled={isSaving}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Failed to load permissions
          </div>
        )}

        {permissions?.summary.highRiskEnabled && (
          <div className="flex items-center gap-2 border-t border-destructive/20 bg-destructive/10 px-4 py-3">
            <ShieldAlert className="h-4 w-4 text-destructive" />
            <span className="text-xs text-destructive">High-risk actions enabled</span>
          </div>
        )}
      </div>

      {/* Link to full settings */}
      <Link
        href={ROUTES.SETTINGS_AI}
        className="block py-2 text-center text-sm text-muted-foreground hover:text-foreground"
      >
        View all AI settings
      </Link>
    </div>
  );
}

export default CatSettingsTab;
