/**
 * BASICS STEP COMPONENT
 * Username, name, and bio fields
 */

import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/Input';
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

interface BasicsStepProps {
  form: UseFormReturn<ProfileFormValues>;
}

export function BasicsStep({ form }: BasicsStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          Welcome! Let's set up your profile
        </h2>
        <p className="text-muted-foreground mb-3">
          This will help people understand who you are and what you're about.
        </p>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-tiffany-50 text-tiffany-700 text-xs rounded-full">
          <span>💡</span>
          <span>Only username is required - everything else is optional</span>
        </div>
      </div>

      <FormField
        control={form.control}
        name="username"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium text-gray-700 dark:text-foreground flex items-center gap-1">
              Username
              <span className="text-red-500 text-xs font-bold">*</span>
              <span className="text-xs text-muted-foreground font-normal">(required)</span>
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                value={field.value || ''}
                placeholder="Choose a unique username"
                className="text-sm"
              />
            </FormControl>
            <FormDescription className="text-xs text-muted-foreground">
              This will be your public profile URL: orangecat.ch/@username
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium text-gray-700 dark:text-foreground">
              Display Name
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                value={field.value || ''}
                placeholder="Your full name or display name"
                className="text-sm"
              />
            </FormControl>
            <FormDescription className="text-xs text-muted-foreground">
              Optional: How you want to be displayed publicly
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="bio"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium text-gray-700 dark:text-foreground">
              Bio
            </FormLabel>
            <FormControl>
              <Textarea
                {...field}
                value={field.value || ''}
                placeholder="Tell people about yourself, your interests, or what you're working on..."
                className="text-sm resize-none"
                rows={4}
              />
            </FormControl>
            <FormDescription className="text-xs text-muted-foreground">
              Optional: Share your story to build trust with supporters
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
