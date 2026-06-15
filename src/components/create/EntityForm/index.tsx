'use client';

import { useCallback, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserCurrency } from '@/hooks/useUserCurrency';
import Loading from '@/components/Loading';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';

import { GuidancePanel } from '../GuidancePanel';
import { TemplatePicker } from '../templates/TemplatePicker';
import { AIPrefillBar } from '../AIPrefillBar';
import type { EntityConfig, EntityTemplate } from '../types';
import { FORM_THEME } from '@/config/theme-colors';

import { EntityCreationSuccess } from '../EntityCreationSuccess';
import { useEntityFormState } from './hooks/useEntityFormState';
import { formatRelativeTime } from './hooks/useEntityFormDraft';
import { useFieldVisibility } from './hooks/useFieldVisibility';
import { useEntityFormSubmit } from './hooks/useEntityFormSubmit';
import { FormHeader } from './components/FormHeader';
import { FormInfoBanner } from './components/FormInfoBanner';
import { FormActions } from './components/FormActions';
import { FormFieldGroups } from './components/FormFieldGroups';

export interface WizardMode {
  currentStep: number;
  totalSteps: number;
  visibleFields: string[];
  onNext?: () => void;
  onPrevious?: () => void;
  onSkip?: () => void;
  isLastStep?: boolean;
}

interface EntityFormProps<T extends Record<string, unknown>> {
  config: EntityConfig<T>;
  initialValues?: Partial<T>;
  onSuccess?: (data: T & { id: string }) => void;
  onError?: (error: string) => void;
  mode?: 'create' | 'edit';
  entityId?: string;
  wizardMode?: WizardMode;
  /** When true, removes page-level wrapper (min-h-screen, FormHeader) for embedding in dialogs */
  embedded?: boolean;
  /**
   * Actor that will own the created entity. `null` = personal actor. Group
   * actor IDs are validated server-side (resolveCreationActor) — invalid
   * IDs return 403.
   */
  actorId?: string | null;
}

export function EntityForm<T extends Record<string, unknown>>({
  config,
  initialValues,
  onSuccess,
  onError,
  mode = 'create',
  entityId,
  wizardMode,
  embedded,
  actorId,
}: EntityFormProps<T>) {
  const { user, isLoading: authLoading, hydrated } = useAuth();
  const userCurrency = useUserCurrency();

  const {
    formState,
    aiGeneratedFields,
    lastSavedAt,
    initialFormData,
    handleFieldChange,
    handleFieldFocus,
    handleAIPrefill,
    clearDraft,
    setSubmitting,
    setErrors,
    validateField,
  } = useEntityFormState({ config, initialValues, userCurrency, userId: user?.id, mode });

  const [createdEntity, setCreatedEntity] = useState<{ id: string; title: string } | null>(null);

  const handleFieldBlur = useCallback(
    (fieldName: string) => validateField(fieldName),
    [validateField]
  );

  const { isFieldVisible, isGroupVisible, visibleFieldGroups } = useFieldVisibility({
    formData: formState.data,
    fieldGroups: config.fieldGroups,
    wizardMode,
  });

  const { handleSubmit } = useEntityFormSubmit({
    config,
    formState,
    mode,
    entityId,
    user,
    onSuccess,
    onError,
    clearDraft,
    setSubmitting,
    setErrors,
    onEntityCreated: setCreatedEntity,
    handleFieldChange,
    wizardMode,
    actorId,
  });

  const handleTemplateSelect = useCallback(
    (template: EntityTemplate<T>) => {
      handleFieldChange('__template__' as keyof T, { ...initialFormData, ...template.defaults });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [initialFormData, handleFieldChange]
  );

  if (!hydrated || authLoading) {
    return <Loading fullScreen message="Loading..." />;
  }
  if (!user) {
    return null;
  }

  if (createdEntity) {
    return (
      <EntityCreationSuccess
        entityType={config.type}
        entityId={createdEntity.id}
        entityTitle={createdEntity.title}
        entityTypeName={config.name}
        dashboardUrl={config.backUrl}
        detailUrl={config.successUrl
          .replace(/:id/g, createdEntity.id)
          .replace(/\[id\]/g, createdEntity.id)}
      />
    );
  }

  const Icon = config.icon;
  const theme = FORM_THEME[config.colorTheme];

  return (
    <div
      className={
        wizardMode || embedded
          ? ''
          : `min-h-screen ${theme.pageSurface} p-4 sm:p-6 lg:p-8 pb-24 md:pb-8`
      }
    >
      {!wizardMode && !embedded && (
        <FormHeader
          icon={Icon}
          colorTheme={config.colorTheme}
          name={config.name}
          namePlural={config.namePlural}
          pageDescription={config.pageDescription}
          backUrl={config.backUrl}
          mode={mode}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{mode === 'create' ? config.formTitle : `Edit ${config.name}`}</CardTitle>
              <CardDescription>
                {mode === 'create'
                  ? config.formDescription
                  : `Update your ${config.name.toLowerCase()} details.`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-8">
                {mode === 'create' && (
                  <AIPrefillBar
                    entityType={config.type}
                    onPrefill={handleAIPrefill}
                    disabled={formState.isSubmitting}
                    existingData={formState.data}
                  />
                )}

                <FormFieldGroups
                  visibleFieldGroups={visibleFieldGroups}
                  isGroupVisible={isGroupVisible}
                  isFieldVisible={isFieldVisible}
                  formState={formState}
                  handleFieldChange={handleFieldChange}
                  handleFieldFocus={handleFieldFocus}
                  handleFieldBlur={handleFieldBlur}
                  aiGeneratedFields={aiGeneratedFields}
                />

                {config.infoBanner && <FormInfoBanner banner={config.infoBanner} />}

                {formState.errors.general && (
                  <div className="oc-error-surface">
                    <p className="text-sm">{formState.errors.general}</p>
                  </div>
                )}

                {config.templates &&
                  config.templates.length > 0 &&
                  mode === 'create' &&
                  !wizardMode && (
                    <div className="mt-8 pt-8 border-t border-default">
                      <TemplatePicker
                        label={config.namePlural}
                        templates={config.templates as EntityTemplate<T>[]}
                        onSelectTemplate={handleTemplateSelect}
                      />
                    </div>
                  )}

                <FormActions
                  isSubmitting={formState.isSubmitting}
                  mode={mode}
                  entityName={config.name}
                  backUrl={config.backUrl}
                  theme={theme}
                  wizardMode={wizardMode}
                  lastSavedAt={lastSavedAt}
                  formatRelativeTime={formatRelativeTime}
                />
              </form>
            </CardContent>
          </Card>
        </div>

        {!wizardMode && (
          <div className="lg:col-span-1">
            <GuidancePanel
              activeField={formState.activeField}
              guidanceContent={config.guidanceContent}
              defaultGuidance={config.defaultGuidance}
            />
          </div>
        )}
      </div>
    </div>
  );
}
