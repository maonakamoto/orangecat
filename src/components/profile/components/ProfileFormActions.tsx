/**
 * Profile Form Actions
 *
 * Action buttons for profile form (Cancel, Save).
 *
 * Created: 2025-01-30
 * Last Modified: 2025-01-30
 */

'use client';

import { Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ProfileFormActionsProps {
  isSaving: boolean;
  isValid: boolean;
  onCancel: () => void;
  variant?: 'inline' | 'modal';
}

export function ProfileFormActions({
  isSaving,
  isValid,
  onCancel,
  variant = 'inline',
}: ProfileFormActionsProps) {
  const containerClass =
    variant === 'inline'
      ? 'flex items-center justify-between gap-3 pt-6 border-t border-border mt-6 bg-muted -mx-6 px-6 py-4 rounded-b-xl'
      : 'flex items-center justify-between gap-3 pt-6 border-t border-border bg-muted -mx-6 px-6 py-4 rounded-b-lg';

  return (
    <div className={containerClass}>
      <Button
        type="button"
        variant="ghost"
        onClick={onCancel}
        disabled={isSaving}
        className="px-4 text-muted-foreground hover:text-foreground"
      >
        Cancel
      </Button>
      <Button
        type="submit"
        disabled={isSaving || !isValid}
        className="px-8 py-3 text-base font-semibold bg-foreground hover:bg-foreground/90 text-background shadow-sm oc-card-link duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSaving ? (
          <>
            <div className="w-5 h-5 mr-2 border-2 border-card border-t-transparent rounded-full animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="w-5 h-5 mr-2" />
            Save Profile
          </>
        )}
      </Button>
    </div>
  );
}
