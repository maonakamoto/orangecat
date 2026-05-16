'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { GRADIENTS } from '@/config/gradients';
import { EntityForm } from './EntityForm';
import { WizardTemplatePicker } from './templates/WizardTemplatePicker';
import { WizardProgressBar } from './WizardProgressBar';
import { WizardTemplateOnlyView } from './WizardTemplateOnlyView';
import { useEntityCreationWizard } from './useEntityCreationWizard';
import type { EntityConfig, EntityTemplate } from './types';

const WIZARD_THEMES: Record<string, { gradient: string; ring: string; bg: string }> = {
  orange: {
    gradient: 'from-orange-500 to-amber-500',
    ring: 'ring-orange-100',
    bg: 'bg-orange-500',
  },
  tiffany: {
    gradient: 'from-tiffany to-tiffany-dark',
    ring: 'ring-tiffany-light',
    bg: 'bg-tiffany',
  },
  rose: {
    gradient: 'from-rose-500 to-pink-500',
    ring: 'ring-rose-100',
    bg: 'bg-rose-500',
  },
  blue: {
    gradient: 'from-blue-500 to-cyan-500',
    ring: 'ring-blue-100',
    bg: 'bg-tiffany-500',
  },
  green: {
    gradient: 'from-green-500 to-emerald-500',
    ring: 'ring-green-100',
    bg: 'bg-green-500',
  },
};

const WIZARD_STEP_VARIANTS = {
  enter: (direction: number) => ({
    x: direction > 0 ? 1000 : -1000,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 1000 : -1000,
    opacity: 0,
  }),
};

interface EntityCreationWizardProps<T extends Record<string, unknown>> {
  config: EntityConfig<T>;
  initialData?: Partial<T>;
  onSuccess?: (data: T & { id: string }) => void;
  onCancel?: () => void;
}

export function EntityCreationWizard<T extends Record<string, unknown>>({
  config,
  initialData,
  onSuccess,
  onCancel,
}: EntityCreationWizardProps<T>) {
  const {
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
  } = useEntityCreationWizard({ config, initialData, onSuccess, onCancel });

  const theme = WIZARD_THEMES[config.colorTheme] || WIZARD_THEMES.orange;

  if (showTemplateSelection && isTemplateOnlyMode) {
    return (
      <WizardTemplateOnlyView
        config={config}
        onCancel={handleCancel}
        onSelectTemplate={handleTemplateOnlySelect}
      />
    );
  }

  if (!config.wizardConfig?.enabled || wizardSteps.length === 0) {
    return (
      <EntityForm
        config={config}
        initialValues={formInitialValues || initialData}
        onSuccess={onSuccess}
      />
    );
  }

  return (
    <div className={cn(GRADIENTS.pageBg, 'min-h-screen p-4 sm:p-6 lg:p-8')}>
      <div className="max-w-4xl mx-auto mb-3">
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={handleCancel}
            className="inline-flex items-center text-gray-600 dark:text-muted-foreground hover:text-gray-900 dark:hover:text-foreground transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Cancel
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-foreground">
            {config.pageTitle}
          </h1>
        </div>
        <p className="text-sm text-gray-600 dark:text-muted-foreground ml-12">
          {config.pageDescription}
        </p>
      </div>

      <WizardProgressBar
        wizardSteps={wizardSteps}
        currentStep={currentStep}
        completedSteps={completedSteps}
        progress={progress}
        theme={theme}
        onStepClick={handleStepClick}
      />

      <div className="max-w-4xl mx-auto">
        <AnimatePresence mode="wait" custom={currentStep}>
          <motion.div
            key={currentStep}
            custom={currentStep}
            variants={WIZARD_STEP_VARIANTS}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: 'spring', stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
          >
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center gap-3">
                  {isTemplateStep && <Sparkles className="h-6 w-6 text-orange-500" />}
                  <div>
                    <CardTitle>{currentStepConfig.title}</CardTitle>
                    <CardDescription>{currentStepConfig.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isTemplateStep ? (
                  <div className="space-y-4">
                    <WizardTemplatePicker
                      templates={(config.templates || []) as EntityTemplate<T>[]}
                      onSelectTemplate={handleTemplateSelect}
                      selectedTemplateId={selectedTemplate?.id}
                      showStartFromScratch
                      entityLabel={config.pageTitle?.replace(/^Create\s+/i, '')}
                    />
                  </div>
                ) : (
                  <EntityForm
                    config={config}
                    initialValues={formInitialValues}
                    onSuccess={onSuccess}
                    wizardMode={{
                      currentStep,
                      totalSteps: wizardSteps.length,
                      visibleFields: currentStepConfig.fields,
                      onNext: !isLastStep ? handleNext : undefined,
                      onPrevious: currentStep > 0 ? handlePrevious : undefined,
                      onSkip: currentStepConfig.optional ? handleSkip : undefined,
                      isLastStep,
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {isTemplateStep && (
          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={handlePrevious} disabled={currentStep === 0}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            <div className="flex gap-3">
              {currentStepConfig.optional && (
                <Button variant="ghost" onClick={handleSkip}>
                  Skip
                </Button>
              )}

              <Button onClick={handleNext}>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
