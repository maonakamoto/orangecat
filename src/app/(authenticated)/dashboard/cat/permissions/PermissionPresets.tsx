'use client';

import { Shield, ShieldCheck, Zap } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { CategorySummary } from './types';

interface PermissionPresetsProps {
  categories: CategorySummary[];
  saving: string | null;
  onToggleCategory: (id: string, enabled: boolean) => void;
}

export function PermissionPresets({
  categories,
  saving,
  onToggleCategory,
}: PermissionPresetsProps) {
  const applyPreset = (shouldEnable: (categoryId: string) => boolean) => {
    categories.forEach(cat => {
      const wanted = shouldEnable(cat.category);
      if (wanted !== cat.enabled) {
        onToggleCategory(cat.category, wanted);
      }
    });
  };

  return (
    <div className="mt-8">
      <h3 className="font-semibold text-foreground mb-3">Quick Presets</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => applyPreset(id => id === 'context')}
          disabled={saving !== null}
          className="p-4 border border-border rounded-xl text-left hover:border-green-300 hover:bg-green-50 dark:hover:bg-muted transition-colors disabled:opacity-50"
        >
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="h-5 w-5 text-green-600" />
            <span className="font-medium text-foreground">Minimal</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Only context management. Safest option for new users.
          </p>
        </button>

        <button
          onClick={() => applyPreset(id => ['entities', 'context', 'communication'].includes(id))}
          disabled={saving !== null}
          className="p-4 border border-border rounded-xl text-left hover:border-tiffany hover:bg-tiffany-50 dark:hover:bg-muted transition-colors disabled:opacity-50"
        >
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-5 w-5 text-tiffany" />
            <span className="font-medium text-foreground">Creator</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Create content & communicate. Best for most users.
          </p>
        </button>

        <button
          onClick={() => applyPreset(id => id !== 'payments')}
          disabled={saving !== null}
          className="p-4 border border-border rounded-xl text-left hover:border-amber-300 hover:bg-amber-50 dark:hover:bg-muted transition-colors disabled:opacity-50"
        >
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-5 w-5 text-amber-600" />
            <span className="font-medium text-foreground">Power User</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Everything except payments. For experienced users.
          </p>
        </button>
      </div>

      <div className="mt-4 flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => applyPreset(() => false)}
          disabled={saving !== null}
          className="text-muted-foreground hover:text-red-600"
        >
          Disable All Permissions
        </Button>
      </div>
    </div>
  );
}
