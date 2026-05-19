'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { CREATE_OPTIONS, type CreateOption } from '@/components/dashboard/SmartCreateButton';

interface MobileCreateSheetProps {
  /** Whether the sheet is visible */
  isOpen: boolean;
  /** Callback when sheet should close */
  onClose: () => void;
  /** Optional callback when an option is selected (before navigation) */
  onSelect?: (option: CreateOption) => void;
}

/**
 * Mobile Create Sheet
 *
 * A bottom sheet that displays all create options for mobile users.
 * Used by MobileBottomNav when the "+" button triggers a menu.
 */
export function MobileCreateSheet({ isOpen, onClose, onSelect }: MobileCreateSheetProps) {
  if (!isOpen) {
    return null;
  }

  const handleSelect = (option: CreateOption) => {
    onSelect?.(option);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" />

      {/* Sheet */}
      <div
        className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-md border-t border-border-subtle bg-background p-4 pb-8 animate-in slide-in-from-bottom duration-300"
        onClick={e => e.stopPropagation()}
        style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}
      >
        {/* Handle indicator */}
        <div className="mx-auto mb-4 h-1 w-12 rounded-sm bg-muted-foreground/20" />

        {/* Header */}
        <h3 className="text-lg font-semibold text-foreground mb-4 px-2">Create New</h3>

        {/* Options Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {CREATE_OPTIONS.map(option => (
            <Link
              key={option.name}
              href={option.href}
              onClick={() => handleSelect(option)}
              className="flex touch-manipulation flex-col items-center gap-1.5 rounded-md border border-border-subtle p-3 transition-colors hover:border-border-strong hover:bg-muted active:bg-muted/80"
            >
              <div className={cn('rounded-md p-2.5', option.bgColor)}>
                <option.icon className={cn('w-5 h-5', option.color)} />
              </div>
              <span className="text-xs font-medium text-foreground text-center">{option.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default MobileCreateSheet;
