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
      <div className="bg-white dark:bg-card rounded-xl border border-gray-200 dark:border-border overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 dark:bg-muted border-b border-gray-100 dark:border-border flex items-center gap-2">
          <Bot className="h-4 w-4 text-gray-600 dark:text-muted-foreground" />
          <span className="text-sm font-semibold text-gray-900 dark:text-foreground">AI Model</span>
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
                className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                  isSelected
                    ? 'border-gray-700 bg-gray-50 dark:border-foreground dark:bg-muted'
                    : 'border-gray-200 hover:border-gray-300 bg-white dark:border-border dark:hover:border-muted-foreground dark:bg-card'
                }`}
              >
                <div
                  className={`p-2 rounded-lg ${isSelected ? 'bg-gray-200 dark:bg-accent' : 'bg-gray-100 dark:bg-muted'}`}
                >
                  <Icon
                    className={`h-4 w-4 ${isSelected ? 'text-gray-700 dark:text-foreground' : 'text-gray-500 dark:text-muted-foreground'}`}
                  />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-foreground">
                    {TIER_CONFIG[tierId].label}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-muted-foreground">
                    {TIER_CONFIG[tierId].description}
                  </p>
                </div>
                {isSelected && <Check className="h-5 w-5 text-gray-700 dark:text-foreground" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* API Keys Status */}
      <div className="bg-white dark:bg-card rounded-xl border border-gray-200 dark:border-border overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 dark:bg-muted border-b border-gray-100 dark:border-border flex items-center gap-2">
          <Key className="h-4 w-4 text-amber-600" />
          <span className="text-sm font-semibold text-gray-900 dark:text-foreground">API Keys</span>
        </div>
        <div className="p-4">
          {hasByok ? (
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <div className="p-2 bg-green-100 rounded-full">
                <Check className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900">Your own API key connected</p>
                <p className="text-xs text-green-700">Unlimited usage with your key</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg">
              <div className="p-2 bg-amber-100 rounded-full">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900">Using free tier</p>
                <p className="text-xs text-amber-700">Limited daily messages</p>
              </div>
            </div>
          )}
          <Link
            href={ROUTES.SETTINGS_AI}
            className="mt-3 flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-muted transition-colors"
          >
            <span className="text-sm text-gray-700 dark:text-muted-foreground">
              Manage API Keys
            </span>
            <ChevronRight className="h-4 w-4 text-gray-400 dark:text-muted-foreground" />
          </Link>
        </div>
      </div>

      {/* Permissions */}
      <div className="bg-white dark:bg-card rounded-xl border border-gray-200 dark:border-border overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 dark:bg-muted border-b border-gray-100 dark:border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-gray-600 dark:text-muted-foreground" />
            <span className="text-sm font-semibold text-gray-900 dark:text-foreground">
              Permissions
            </span>
          </div>
          {permissions && (
            <span className="text-xs text-gray-500 dark:text-muted-foreground">
              {permissions.summary.enabledActions}/{permissions.summary.totalActions} enabled
            </span>
          )}
        </div>

        {permLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : permissions ? (
          <div className="divide-y divide-gray-100 dark:divide-border">
            {permissions.summary.categories.map(cat => {
              const isSaving = saving === cat.category;
              return (
                <div key={cat.category} className="flex items-center justify-between px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-foreground">
                      {cat.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-muted-foreground truncate">
                      {cat.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    {isSaving && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
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
          <div className="p-4 text-center text-sm text-gray-500 dark:text-muted-foreground">
            Failed to load permissions
          </div>
        )}

        {permissions?.summary.highRiskEnabled && (
          <div className="px-4 py-3 bg-red-50 border-t border-red-100 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-red-600" />
            <span className="text-xs text-red-700">High-risk actions enabled</span>
          </div>
        )}
      </div>

      {/* Link to full settings */}
      <Link
        href={ROUTES.SETTINGS_AI}
        className="block text-center text-sm text-gray-600 dark:text-muted-foreground hover:text-gray-800 dark:hover:text-foreground py-2"
      >
        View all AI settings
      </Link>
    </div>
  );
}

export default CatSettingsTab;
