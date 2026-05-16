/**
 * Preferences Section
 *
 * Form section for user preferences (currency, etc.).
 *
 * Created: 2026-01-05
 * Last Modified: 2026-01-05
 */

'use client';

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProfileFieldType } from '@/lib/profile-guidance';
import { Control } from 'react-hook-form';
import { ProfileFormValues } from '../types';
import { PROFILE_SECTIONS, PROFILE_SECTION_DESCRIPTIONS } from '../constants';
import { currencySelectOptions, PLATFORM_DEFAULT_CURRENCY } from '@/config/currencies';

interface PreferencesSectionProps {
  control: Control<ProfileFormValues>;
  onFieldFocus?: (field: ProfileFieldType) => void;
}

export function PreferencesSection({ control, onFieldFocus }: PreferencesSectionProps) {
  return (
    <div className="space-y-4 rounded-xl border border-border bg-white/80 dark:bg-card/80 px-4 py-5 sm:px-5 sm:py-6">
      <div className="mb-1">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
          {PROFILE_SECTIONS.PREFERENCES}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {PROFILE_SECTION_DESCRIPTIONS.PREFERENCES}
        </p>
      </div>

      {/* Currency Preference */}
      <FormField
        control={control}
        name="currency"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium text-gray-700 dark:text-foreground">
              Default Currency
            </FormLabel>
            <Select onValueChange={field.onChange} value={field.value || PLATFORM_DEFAULT_CURRENCY}>
              <FormControl>
                <SelectTrigger
                  className="w-full"
                  onFocus={() => onFieldFocus?.('currencyPreference')}
                >
                  <SelectValue placeholder="Select your preferred currency" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {currencySelectOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription className="text-xs text-muted-foreground">
              Prices and amounts will be displayed in this currency. All transactions are settled in
              Bitcoin.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
