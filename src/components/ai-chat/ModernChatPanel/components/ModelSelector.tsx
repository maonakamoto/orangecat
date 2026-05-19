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
}

export function ModelSelector({ selectedModel, onSelect, disabled }: ModelSelectorProps) {
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
          'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm',
          'border border-border-subtle bg-muted transition-colors hover:bg-muted/80',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <Sparkles className="h-4 w-4 text-muted-foreground" />
        <span className="text-foreground max-w-[120px] truncate">{displayName}</span>
        <ChevronDown
          className={cn('h-4 w-4 text-muted-dim transition-transform', isOpen && 'rotate-180')}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-2 max-h-80 w-72 overflow-y-auto rounded-md border border-border-subtle bg-popover py-2 shadow-sm">
          <button
            onClick={() => {
              onSelect('auto');
              setIsOpen(false);
            }}
            className={cn(
              'flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted',
              selectedModel === 'auto' && 'bg-muted'
            )}
          >
            <div className="flex-1">
              <div className="font-medium text-foreground flex items-center gap-2">
                Auto (Best Free)
                {selectedModel === 'auto' && <Check className="h-4 w-4 text-foreground" />}
              </div>
              <div className="text-xs text-muted-foreground">
                Automatically selects the best model
              </div>
            </div>
          </button>

          <div className="h-px bg-border-subtle my-1" />

          <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase">
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
                'flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted',
                selectedModel === model.id && 'bg-muted'
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground flex items-center gap-2 truncate">
                  {model.name}
                  {selectedModel === model.id && (
                    <Check className="h-4 w-4 flex-shrink-0 text-foreground" />
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate">
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
