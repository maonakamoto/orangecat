/**
 * WIZARD HEADER COMPONENT
 * Title and progress bar
 */

import { X } from 'lucide-react';

interface WizardHeaderProps {
  progress: number;
  onCancel: () => void;
}

export function WizardHeader({ progress, onCancel }: WizardHeaderProps) {
  return (
    <div className="flex items-center justify-between p-6 border-b bg-surface-raised/30">
      <div className="flex items-center gap-4">
        <button
          onClick={onCancel}
          aria-label="Cancel"
          className="p-2 hover:bg-surface-raised rounded-full transition-colors min-h-11 min-w-11 flex items-center justify-center"
        >
          <X className="w-5 h-5 text-fg-secondary" />
        </button>

        <div>
          <h1 className="text-xl font-semibold text-fg-primary">Complete Your Profile</h1>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 bg-surface-raised rounded-full h-2">
              <div
                className="bg-fg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-sm text-fg-secondary">{progress}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
