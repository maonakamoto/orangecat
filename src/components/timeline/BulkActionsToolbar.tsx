'use client';

import React, { useState } from 'react';
import { X, Trash2, Globe, Lock, CheckSquare, Square, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TimelineVisibility } from '@/types/timeline';
import { cn } from '@/lib/utils';
import { TIMELINE_SURFACE } from '@/config/timeline';

interface BulkActionsToolbarProps {
  selectedCount: number;
  totalCount: number;
  isProcessing: boolean;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onExitSelectionMode: () => void;
  onBulkDelete: () => void;
  onBulkVisibilityChange: (visibility: TimelineVisibility) => void;
  className?: string;
}

/**
 * Sticky toolbar for bulk post actions
 *
 * Appears when posts are selected, providing actions for:
 * - Select/Deselect all
 * - Bulk delete
 * - Bulk visibility change (public/private)
 *
 * Designed to integrate with the timeline's sticky header area
 */
export function BulkActionsToolbar({
  selectedCount,
  totalCount,
  isProcessing,
  onSelectAll,
  onClearSelection: _onClearSelection,
  onExitSelectionMode,
  onBulkDelete,
  onBulkVisibilityChange,
  className,
}: BulkActionsToolbarProps) {
  const [showVisibilityMenu, setShowVisibilityMenu] = useState(false);

  const allSelected = selectedCount === totalCount && totalCount > 0;
  const hasSelection = selectedCount > 0;

  return (
    <div
      className={cn(
        'sticky top-0 z-30 border-b border-border-subtle bg-background/90 backdrop-blur-xl',
        'px-4 py-2.5 transition-all duration-200',
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left side: Selection status and controls */}
        <div className="flex items-center gap-3">
          {/* Select all toggle */}
          <button
            onClick={onSelectAll}
            disabled={isProcessing}
            className={cn(
              TIMELINE_SURFACE.chip,
              'disabled:cursor-not-allowed disabled:opacity-50',
              allSelected && TIMELINE_SURFACE.chipActive
            )}
            aria-label={allSelected ? 'Deselect all' : 'Select all'}
          >
            {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            <span className="hidden sm:inline">{allSelected ? 'Deselect all' : 'Select all'}</span>
          </button>

          {/* Selection count */}
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{selectedCount}</span>
            <span className="hidden sm:inline"> of {totalCount}</span>
            <span className="sm:hidden">/{totalCount}</span>
            <span className="ml-1">{selectedCount === 1 ? 'post' : 'posts'}</span>
          </div>
        </div>

        {/* Right side: Actions */}
        <div className="flex items-center gap-2">
          {/* Visibility dropdown */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowVisibilityMenu(prev => !prev)}
              disabled={!hasSelection || isProcessing}
              className="gap-1.5 text-sm"
            >
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline">Visibility</span>
            </Button>

            {showVisibilityMenu && (
              <>
                {/* Backdrop to close menu */}
                <div className="fixed inset-0 z-40" onClick={() => setShowVisibilityMenu(false)} />
                <div
                  className={`absolute right-0 top-full z-50 mt-1 w-44 py-1 ${TIMELINE_SURFACE.menu}`}
                >
                  <button
                    onClick={() => {
                      onBulkVisibilityChange('public');
                      setShowVisibilityMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
                    disabled={isProcessing}
                  >
                    <Globe className="w-4 h-4 text-status-positive" />
                    <span>Make Public</span>
                  </button>
                  <button
                    onClick={() => {
                      onBulkVisibilityChange('private');
                      setShowVisibilityMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
                    disabled={isProcessing}
                  >
                    <Lock className="w-4 h-4 text-muted-foreground" />
                    <span>Make Private</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Delete button */}
          <Button
            variant="danger"
            size="sm"
            onClick={onBulkDelete}
            disabled={!hasSelection || isProcessing}
            className="gap-1.5 text-sm"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Delete</span>
            <span className="sm:hidden">{selectedCount > 0 ? selectedCount : ''}</span>
          </Button>

          {/* Exit selection mode */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onExitSelectionMode}
            disabled={isProcessing}
            className={TIMELINE_SURFACE.iconButton}
            aria-label="Exit selection mode"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default BulkActionsToolbar;
