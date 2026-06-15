/**
 * BIO STEP COMPONENT
 * Background and inspiration fields
 */

import { UseFormReturn } from 'react-hook-form';
import { Textarea } from '@/components/ui/Textarea';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import type { ProfileFormValues } from '../types';

interface BioStepProps {
  form: UseFormReturn<ProfileFormValues>;
}

export function BioStep({ form }: BioStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-fg-primary mb-2">Share Your Story</h2>
        <p className="text-fg-secondary mb-3">Help supporters understand what drives you.</p>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface-raised text-fg-secondary border border-subtle text-xs rounded-full">
          <span>💭</span>
          <span>All story fields are optional</span>
        </div>
      </div>

      <FormField
        control={form.control}
        name="background"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium text-fg-primary">
              Professional Background
            </FormLabel>
            <FormControl>
              <Textarea
                {...field}
                value={field.value || ''}
                placeholder="What's your background? Any relevant experience or education..."
                className="text-sm resize-none"
                rows={4}
              />
            </FormControl>
            <FormDescription className="text-xs text-fg-secondary">
              Optional: Share your experience to build credibility
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="inspiration_statement"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium text-fg-primary">
              What Inspires You?
            </FormLabel>
            <FormControl>
              <Textarea
                {...field}
                value={field.value || ''}
                placeholder="What drives you? What's your 'why'?"
                className="text-sm resize-none"
                rows={3}
              />
            </FormControl>
            <FormDescription className="text-xs text-fg-secondary">
              Optional: Help supporters understand your motivation
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
