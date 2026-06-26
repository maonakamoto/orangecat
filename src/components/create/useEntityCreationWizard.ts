'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { EntityConfig, EntityTemplate, WizardStep } from './types';

interface UseEntityCreationWizardOptions<T extends Record<string, unknown>> {
  config: EntityConfig<T>;
  initialData?: Partial<T>;
  onSuccess?: (data: T & { id: string }) => void;
  onCancel?: () => void;
}

export function useEntityCreationWizard<T extends Record<string, unknown>>({
  config,
  initialData,
  onCancel,
}: UseEntityCreationWizardOptions<T>) {
  const router = useRouter();

  const wizardSteps = useMemo((): WizardStep[] => {
    if (!config.wizardConfig?.steps) {
      return [];
    }
    const steps = [...config.wizardConfig.steps];
    if (config.wizardConfig.includeTemplateStep && config.templates?.length) {
      steps.unshift({
        id: 'template',
        title: 'Choose Template (Optional)',
        description: 'Start with a pre-built template or create from scratch',
        optional: true,
        fields: [],
      });
    }
    return steps;
  }, [config]);

  const hasWizard = config.wizardConfig?.enabled && config.wizardConfig.steps?.length > 0;
  const hasTemplates = (config.templates?.length ?? 0) > 0;
  const isTemplateOnlyMode = !hasWizard && hasTemplates && !initialData;

  // When Cat (or any deep link) supplies a prefilled draft, skip the optional
  // template-picker step and land straight on the first content step — the
  // template is irrelevant once the fields are already drafted. Manual creates
  // (no prefill) still open on the picker, and "Previous" from step 1 lets a
  // prefilled user reach the templates anyway, so nothing is lost.
  const skipTemplateStep = wizardSteps[0]?.id === 'template' && !!initialData;

  const [currentStep, setCurrentStep] = useState(skipTemplateStep ? 1 : 0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(
    skipTemplateStep ? new Set([0]) : new Set()
  );
  const [selectedTemplate, setSelectedTemplate] = useState<EntityTemplate<T> | null>(null);
  const [formInitialValues, setFormInitialValues] = useState<Partial<T> | undefined>(initialData);
  const [showTemplateSelection, setShowTemplateSelection] = useState(isTemplateOnlyMode);

  const currentStepConfig = wizardSteps[currentStep];
  const progress = ((currentStep + 1) / wizardSteps.length) * 100;
  const isTemplateStep = currentStepConfig?.id === 'template';
  const isLastStep = currentStep === wizardSteps.length - 1;

  const handleNext = useCallback(() => {
    if (currentStep < wizardSteps.length - 1) {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, wizardSteps.length]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    if (currentStepConfig?.optional) {
      handleNext();
    }
  }, [currentStepConfig?.optional, handleNext]);

  const handleStepClick = useCallback(
    (stepIndex: number) => {
      if (stepIndex <= currentStep || completedSteps.has(stepIndex)) {
        setCurrentStep(stepIndex);
      }
    },
    [currentStep, completedSteps]
  );

  const handleTemplateSelect = useCallback(
    (template: EntityTemplate<T> | null) => {
      setSelectedTemplate(template);
      if (template?.defaults) {
        setFormInitialValues(prev => ({ ...prev, ...template.defaults }));
      } else {
        setFormInitialValues(initialData);
      }
    },
    [initialData]
  );

  const handleTemplateOnlySelect = useCallback(
    (template: EntityTemplate<T> | null) => {
      setFormInitialValues(
        template?.defaults
          ? { ...config.defaultValues, ...template.defaults }
          : (config.defaultValues as Partial<T>)
      );
      setShowTemplateSelection(false);
    },
    [config.defaultValues]
  );

  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel();
    } else {
      router.push(config.backUrl);
    }
  }, [onCancel, router, config.backUrl]);

  return {
    wizardSteps,
    isTemplateOnlyMode,
    currentStep,
    completedSteps,
    selectedTemplate,
    formInitialValues,
    showTemplateSelection,
    currentStepConfig,
    progress,
    isTemplateStep,
    isLastStep,
    handleNext,
    handlePrevious,
    handleSkip,
    handleStepClick,
    handleTemplateSelect,
    handleTemplateOnlySelect,
    handleCancel,
  };
}
