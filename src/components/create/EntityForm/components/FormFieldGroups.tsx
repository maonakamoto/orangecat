'use client';

import { FormField } from '../../FormField';
import { AIGeneratedIndicator } from './AIGeneratedIndicator';
import type { FieldConfig, FieldGroup, FormState, AIGeneratedFields } from '../../types';

interface FormFieldGroupsProps<T extends Record<string, unknown>> {
  visibleFieldGroups: FieldGroup[];
  isGroupVisible: (group: FieldGroup) => boolean;
  isFieldVisible: (field: FieldConfig) => boolean;
  formState: FormState<T>;
  handleFieldChange: (name: keyof T, value: unknown) => void;
  handleFieldFocus: (name: string) => void;
  handleFieldBlur: (name: string) => void;
  aiGeneratedFields: AIGeneratedFields;
}

export function FormFieldGroups<T extends Record<string, unknown>>({
  visibleFieldGroups,
  isGroupVisible,
  isFieldVisible,
  formState,
  handleFieldChange,
  handleFieldFocus,
  handleFieldBlur,
  aiGeneratedFields,
}: FormFieldGroupsProps<T>) {
  return (
    <>
      {visibleFieldGroups.map(group => {
        if (!isGroupVisible(group)) {
          return null;
        }

        if (group.customComponent) {
          const CustomComponent = group.customComponent;
          return (
            <div key={group.id} className="space-y-4">
              <CustomComponent
                formData={formState.data as Record<string, unknown>}
                onFieldChange={(field, value) => handleFieldChange(field as keyof T, value)}
                disabled={formState.isSubmitting}
              />
            </div>
          );
        }

        return (
          <div key={group.id} className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-foreground">
                {group.title}
              </h3>
              {group.description && (
                <p className="text-base text-gray-600 dark:text-muted-foreground mt-1">
                  {group.description}
                </p>
              )}
            </div>

            {group.fields && group.fields.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {group.fields.map(field => {
                  if (!isFieldVisible(field)) {
                    return null;
                  }

                  const isAIGenerated = aiGeneratedFields.fields.has(field.name);
                  const aiConfidence = aiGeneratedFields.confidence[field.name] || 0.7;

                  return (
                    <div
                      key={field.name}
                      className={`${field.colSpan === 2 ? 'md:col-span-2' : ''} ${isAIGenerated ? 'relative' : ''}`}
                    >
                      {isAIGenerated && <AIGeneratedIndicator confidence={aiConfidence} />}
                      <div
                        className={isAIGenerated ? 'ring-1 ring-tiffany-200 rounded-md p-0.5' : ''}
                      >
                        <FormField
                          config={field}
                          value={formState.data[field.name as keyof T]}
                          error={formState.errors[field.name]}
                          onChange={value => handleFieldChange(field.name as keyof T, value)}
                          onFocus={() => handleFieldFocus(field.name)}
                          onBlur={() => handleFieldBlur(field.name)}
                          disabled={formState.isSubmitting}
                          currency={
                            'currency' in formState.data
                              ? (formState.data.currency as string)
                              : undefined
                          }
                          onCurrencyChange={
                            field.type === 'currency' && 'currency' in formState.data
                              ? currency => handleFieldChange('currency' as keyof T, currency)
                              : undefined
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
