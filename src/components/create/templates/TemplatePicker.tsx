/**
 * TemplatePicker - generic picker for prefilled entity templates.
 *
 * Keeps UI consistent across entities (projects, assets, services, products, etc.).
 *
 * Uses EntityTemplate from types.ts as the single source of truth.
 *
 * Templates are shown at the bottom of forms as quick-start helpers.
 *
 * @example
 * ```tsx
 * <TemplatePicker
 *   label="Products"
 *   templates={PRODUCT_TEMPLATES}
 *   onSelectTemplate={handleSelectTemplate}
 * />
 * ```
 */

'use client';

import { useState } from 'react';
import { Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EntityTemplate } from '../types';

// Re-export for backward compatibility
export type GenericTemplate = EntityTemplate;

interface TemplatePickerProps<T extends EntityTemplate> {
  label: string;
  templates: T[];
  onSelectTemplate: (template: T) => void;
  className?: string;
}

export function TemplatePicker<T extends GenericTemplate>({
  label,
  templates,
  onSelectTemplate,
  className = '',
}: TemplatePickerProps<T>) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!templates || templates.length === 0) {
    return null;
  }

  // Show first template by default, rest when expanded
  const visibleTemplates = isExpanded ? templates : templates.slice(0, 1);
  const hasMore = templates.length > 1;

  return (
    <div
      className={cn('space-y-4 rounded-md border border-border-subtle bg-muted/30 p-5', className)}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md border border-border-subtle bg-background text-foreground">
          <Lightbulb className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground">Need inspiration?</h3>
          <p className="text-xs text-muted-foreground">
            Quick-start with a template and customize from there.
          </p>
        </div>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="space-y-3">
        {visibleTemplates.map(template => (
          <button
            key={template.id}
            onClick={() => onSelectTemplate(template)}
            className="w-full rounded-md border border-border-subtle bg-background p-3 text-left transition-colors hover:border-border-strong hover:bg-muted"
            type="button"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md border border-border-subtle bg-muted text-foreground">
                {template.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-foreground mb-0.5">{template.name}</h4>
                <p className="text-xs text-muted-foreground line-clamp-2">{template.tagline}</p>
              </div>
            </div>
          </button>
        ))}
        {hasMore && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex w-full items-center justify-center gap-2 py-2 text-sm font-medium text-foreground transition-colors hover:text-muted-foreground"
            type="button"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Show {templates.length - 1} more {templates.length === 2 ? 'template' : 'templates'}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
