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
          'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm',
          'bg-muted hover:bg-gray-200 dark:hover:bg-muted/70 transition-colors',
          'border border-border',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <Sparkles className="h-4 w-4 text-muted-foreground" />
        <span className="text-gray-700 dark:text-foreground max-w-[120px] truncate">
          {displayName}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-gray-400 dark:text-muted-foreground transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-card rounded-xl shadow-lg border border-border py-2 z-50 max-h-80 overflow-y-auto">
          {/* Auto option */}
          <button
            onClick={() => {
              onSelect('auto');
              setIsOpen(false);
            }}
            className={cn(
              'w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-muted flex items-center gap-3',
              selectedModel === 'auto' && 'bg-tiffany-50'
            )}
          >
            <div className="flex-1">
              <div className="font-medium text-foreground flex items-center gap-2">
                Auto (Best Free)
                {selectedModel === 'auto' && <Check className="h-4 w-4 text-tiffany-500" />}
              </div>
              <div className="text-xs text-muted-foreground">
                Automatically selects the best model
              </div>
            </div>
          </button>

          <div className="h-px bg-gray-100 dark:bg-border my-1" />

          {/* Free models */}
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
                'w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-muted flex items-center gap-3',
                selectedModel === model.id && 'bg-tiffany-50'
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground flex items-center gap-2 truncate">
                  {model.name}
                  {selectedModel === model.id && (
                    <Check className="h-4 w-4 text-tiffany-500 flex-shrink-0" />
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
