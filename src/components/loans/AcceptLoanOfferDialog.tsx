'use client';

/**
 * Accept-offer dialog + its form schema (borrower records the payoff/refinance
 * handoff). Extracted from IncomingLoanOffersList.tsx to keep it under 300
 * lines. Owns the schema (SSOT for the accept form); the parent owns the
 * react-hook-form instance and the submit handler.
 */
import type { UseFormReturn } from 'react-hook-form';
import * as z from 'zod';
import { LOAN_PAYMENT_METHODS, LOAN_PAYMENT_METHOD_LABELS } from '@/config/loan-payments';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Button from '@/components/ui/Button';
import { Loader2 } from 'lucide-react';

export const acceptOfferSchema = z.object({
  payment_method: z.enum(LOAN_PAYMENT_METHODS),
  transaction_id: z.string().max(200).optional(),
  notes: z.string().max(500).optional(),
});

export type AcceptOfferForm = z.infer<typeof acceptOfferSchema>;

export function AcceptLoanOfferDialog({
  open,
  onClose,
  form,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onClose: () => void;
  form: UseFormReturn<AcceptOfferForm>;
  onSubmit: (values: AcceptOfferForm) => void;
  submitting: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Accept Offer and Record Payment</DialogTitle>
          <DialogDescription>
            Confirm the payment handoff details. Refinance offers will also create the new
            obligation loan when the payment is marked completed.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="payment_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a payment method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {LOAN_PAYMENT_METHODS.map(method => (
                        <SelectItem key={method} value={method}>
                          {LOAN_PAYMENT_METHOD_LABELS[method]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="transaction_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transaction Reference</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional reference or invoice id" {...field} />
                  </FormControl>
                  <FormDescription>
                    Optional, but helpful if you want to trace the transfer later.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional settlement note" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col gap-2 border-t border-default pt-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" className="w-full sm:w-auto" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
