'use client';

import { ArrowLeft } from 'lucide-react';
import { WizardTemplatePicker } from './templates/WizardTemplatePicker';
import type { EntityConfig, EntityTemplate } from './types';

interface WizardTemplateOnlyViewProps<T extends Record<string, unknown>> {
  config: EntityConfig<T>;
  onCancel: () => void;
  onSelectTemplate: (template: EntityTemplate<T> | null) => void;
}

export function WizardTemplateOnlyView<T extends Record<string, unknown>>({
  config,
  onCancel,
  onSelectTemplate,
}: WizardTemplateOnlyViewProps<T>) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <button
          onClick={onCancel}
          className="inline-flex items-center text-muted-foreground hover:text-gray-900 dark:hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Cancel
        </button>
        <h1 className="text-3xl font-bold text-foreground mb-2">{config.pageTitle}</h1>
        <p className="text-muted-foreground">{config.pageDescription}</p>
      </div>

      <WizardTemplatePicker
        templates={(config.templates || []) as EntityTemplate<T>[]}
        onSelectTemplate={onSelectTemplate}
        selectedTemplateId={null}
        showStartFromScratch
      />

      <div className="text-center pt-6 border-t border-border mt-6">
        <button
          type="button"
          onClick={() => onSelectTemplate(null)}
          className="text-sm text-muted-foreground hover:text-gray-900 dark:hover:text-foreground font-medium"
        >
          Or start from scratch →
        </button>
      </div>
    </div>
  );
}
