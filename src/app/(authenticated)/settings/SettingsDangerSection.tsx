'use client';

import { AlertTriangle, Trash2 } from 'lucide-react';
import Button from '@/components/ui/Button';

interface Props {
  isDeleting: boolean;
  onDelete: () => void;
}

export function SettingsDangerSection({ isDeleting, onDelete }: Props) {
  return (
    <div className="border-t border-destructive/20 pt-10">
      <h3 className="mb-4 flex items-center text-lg font-semibold text-destructive">
        <AlertTriangle className="w-6 h-6 mr-2" />
        Danger Zone
      </h3>
      <div className="rounded-md border border-destructive/20 bg-destructive/10 p-6">
        <h4 className="mb-2 text-lg font-medium text-destructive">Delete Account</h4>
        <p className="mb-4 text-base text-muted-foreground">
          This will permanently delete your account and all associated data including your profile,
          projects, and transaction history. This action cannot be undone.
        </p>
        <Button
          type="button"
          variant="danger"
          onClick={onDelete}
          disabled={isDeleting}
          className="px-6 py-2"
        >
          {isDeleting ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-sm border-2 border-background border-t-transparent" />
              Deleting...
            </>
          ) : (
            <>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Account
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
