/**
 * MODEL SELECTOR COMPONENT
 * Dropdown for selecting AI model
 */

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { getFreeModels, getModelMetadata } from '@/config/ai-models';
import { Sparkles, ChevronDown, Check } from 'lucide-react';

interface ModelSelectorProps {
  selectedModel: string;
  onSelect: (model: string) => void;
  disabled?: boolean;
  /** Open the menu upward — for use at the bottom-anchored composer. */
  openUp?: boolean;
  /** Ghost trigger (no border/fill) so it reads as part of the composer bar. */
  subtle?: boolean;
}

export function ModelSelector({
  selectedModel,
  onSelect,
  disabled,
  openUp,
  subtle,
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const freeModels = getFreeModels();
  const selectedMeta = getModelMetadata(selectedModel);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName =
    selectedModel === 'auto' ? 'Auto (Best Free)' : selectedMeta?.name || selectedModel;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'flex items-center gap-1.5 rounded-md text-sm transition-colors',
          subtle
            ? 'px-2 py-1 text-fg-secondary hover:bg-surface-raised hover:text-fg-primary'
            : 'border border-subtle bg-surface-raised px-3 py-1.5 hover:bg-surface-raised/80',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <Sparkles className="h-4 w-4 text-fg-secondary" />
        <span
          className={cn('max-w-[120px] truncate', subtle ? 'text-fg-secondary' : 'text-fg-primary')}
        >
          {displayName}
        </span>
        <ChevronDown
          className={cn('h-4 w-4 text-fg-tertiary transition-transform', isOpen && 'rotate-180')}
        />
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute left-0 z-50 max-h-80 w-72 overflow-y-auto rounded-md border border-subtle bg-surface-modal py-2 shadow-sm',
            openUp ? 'bottom-full mb-2' : 'top-full mt-2'
          )}
        >
          <button
            onClick={() => {
              onSelect('auto');
              setIsOpen(false);
            }}
            className={cn(
              'flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-raised',
              selectedModel === 'auto' && 'bg-surface-raised'
            )}
          >
            <div className="flex-1">
              <div className="font-medium text-fg-primary flex items-center gap-2">
                Auto (Best Free)
                {selectedModel === 'auto' && <Check className="h-4 w-4 text-fg-primary" />}
              </div>
              <div className="text-xs text-fg-secondary">Automatically selects the best model</div>
            </div>
          </button>

          <div className="h-px bg-border-subtle my-1" />

          <div className="px-3 py-1.5 text-xs font-medium text-fg-secondary uppercase">
            Free Models
          </div>
          {freeModels.map(model => (
            <button
              key={model.id}
              onClick={() => {
                onSelect(model.id);
                setIsOpen(false);
              }}
              className={cn(
                'flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-raised',
                selectedModel === model.id && 'bg-surface-raised'
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-fg-primary flex items-center gap-2 truncate">
                  {model.name}
                  {selectedModel === model.id && (
                    <Check className="h-4 w-4 flex-shrink-0 text-fg-primary" />
                  )}
                </div>
                <div className="text-xs text-fg-secondary truncate">
                  {model.provider} • {model.rateLimit}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
