'use client';

import { useMemo, useState } from 'react';
import type { LoanOffer } from '@/types/loans';
import loansService from '@/services/loans';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { STATUS } from '@/config/database-constants';
import { formatRelativeTime } from '@/utils/dates';
import { getLoanOfferStatusColor, getLoanOfferStatusIcon } from '@/config/loans';
import { LOAN_PAYMENT_METHODS, LOAN_PAYMENT_METHOD_LABELS } from '@/config/loan-payments';
import { formatLoanAmount } from './useLoanList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import Button from '@/components/ui/Button';
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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';

const acceptOfferSchema = z.object({
  payment_method: z.enum(LOAN_PAYMENT_METHODS),
  transaction_id: z.string().max(200).optional(),
  notes: z.string().max(500).optional(),
});

type AcceptOfferForm = z.infer<typeof acceptOfferSchema>;

interface IncomingLoanOffersListProps {
  offers: LoanOffer[];
  borrowerId: string;
  onOfferUpdated?: () => void;
}

export function IncomingLoanOffersList({
  offers,
  borrowerId,
  onOfferUpdated,
}: IncomingLoanOffersListProps) {
  const [activeOffer, setActiveOffer] = useState<LoanOffer | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const pendingOffers = useMemo(
    () => offers.filter(offer => offer.status === STATUS.LOAN_OFFERS.PENDING),
    [offers]
  );

  const form = useForm<AcceptOfferForm>({
    resolver: zodResolver(acceptOfferSchema),
    defaultValues: {
      payment_method: 'bank_transfer',
      transaction_id: '',
      notes: '',
    },
  });

  const handleReject = async (offer: LoanOffer) => {
    setSubmitting(true);
    try {
      const result = await loansService.respondToOffer(offer.id, false);
      if (!result.success) {
        toast.error(result.error || 'Failed to reject offer');
        return;
      }
      toast.success('Offer rejected');
      onOfferUpdated?.();
    } catch (error) {
      logger.error('Failed to reject loan offer', error, 'IncomingLoanOffers');
      toast.error('Failed to reject offer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAccept = async (values: AcceptOfferForm) => {
    if (!activeOffer) {
      return;
    }

    setSubmitting(true);
    try {
      const result = await loansService.acceptOfferAndSettle({
        offer: activeOffer,
        borrowerId,
        paymentMethod: values.payment_method,
        transactionId: values.transaction_id || undefined,
        notes: values.notes || undefined,
      });

      if (!result.success) {
        toast.error(result.error || 'Failed to accept offer');
        if (result.mutated) {
          onOfferUpdated?.();
        }
        return;
      }

      toast.success(
        result.refinanced
          ? 'Offer accepted and refinance handoff completed'
          : 'Offer accepted and payoff recorded'
      );
      form.reset();
      setActiveOffer(null);
      onOfferUpdated?.();
    } catch (error) {
      logger.error('Failed to accept loan offer', error, 'IncomingLoanOffers');
      toast.error('Failed to accept offer');
    } finally {
      setSubmitting(false);
    }
  };

  if (offers.length === 0) {
    return null;
  }

  return (
    <>
      <div className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-fg-primary">Incoming Offers</h3>
          <p className="text-sm text-fg-secondary">
            Review lender proposals on your loans and complete the payoff/refinance handoff.
          </p>
        </div>

        <div className="space-y-4">
          {offers.map(offer => {
            const offererLabel =
              offer.profiles?.display_name || offer.profiles?.username || 'Community lender';
            const loanTitle = offer.loans?.title || 'Loan';
            const StatusIcon = getLoanOfferStatusIcon(offer.status);

            return (
              <Card key={offer.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <CardTitle className="text-base sm:text-lg">
                        {offer.offer_type === 'refinance' ? 'Refinance Offer' : 'Payoff Offer'}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {offererLabel} on {loanTitle} • {formatRelativeTime(offer.created_at)}
                      </CardDescription>
                    </div>
                    <Badge className={`${getLoanOfferStatusColor(offer.status)} w-fit gap-1`}>
                      <StatusIcon className="h-4 w-4" />
                      {offer.status}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-md bg-surface-raised p-3">
                      <p className="text-xs text-fg-secondary">Offer Amount</p>
                      <p className="mt-1 text-base font-semibold text-status-positive">
                        {formatLoanAmount(offer.offer_amount, offer.loans?.currency || undefined)}
                      </p>
                    </div>
                    {offer.interest_rate !== undefined && offer.interest_rate !== null && (
                      <div className="rounded-md bg-surface-raised p-3">
                        <p className="text-xs text-fg-secondary">Interest Rate</p>
                        <p className="mt-1 text-base font-semibold">{offer.interest_rate}%</p>
                      </div>
                    )}
                    {offer.term_months !== undefined && offer.term_months !== null && (
                      <div className="rounded-md bg-surface-raised p-3">
                        <p className="text-xs text-fg-secondary">Term</p>
                        <p className="mt-1 text-base font-semibold">{offer.term_months} months</p>
                      </div>
                    )}
                    <div className="rounded-md bg-surface-raised p-3">
                      <p className="text-xs text-fg-secondary">Loan Balance</p>
                      <p className="mt-1 text-base font-semibold">
                        {formatLoanAmount(
                          offer.loans?.remaining_balance || 0,
                          offer.loans?.currency || undefined
                        )}
                      </p>
                    </div>
                  </div>

                  {offer.terms && (
                    <div className="rounded-md bg-surface-raised/60 p-3">
                      <p className="text-sm font-medium text-fg-primary">Terms</p>
                      <p className="mt-1 text-sm text-fg-secondary whitespace-pre-wrap">
                        {offer.terms}
                      </p>
                    </div>
                  )}

                  {offer.conditions && (
                    <div className="rounded-md bg-surface-raised/60 p-3">
                      <p className="text-sm font-medium text-fg-primary">Conditions</p>
                      <p className="mt-1 text-sm text-fg-secondary whitespace-pre-wrap">
                        {offer.conditions}
                      </p>
                    </div>
                  )}

                  {offer.status === STATUS.LOAN_OFFERS.PENDING && (
                    <div className="flex flex-col gap-2 border-t border-default pt-3 sm:flex-row sm:justify-end">
                      <Button
                        variant="outline"
                        className="w-full sm:w-auto text-status-negative hover:text-status-negative/80"
                        onClick={() => handleReject(offer)}
                        disabled={submitting}
                      >
                        Reject
                      </Button>
                      <Button
                        className="w-full sm:w-auto"
                        onClick={() => setActiveOffer(offer)}
                        disabled={submitting}
                      >
                        Accept and Record Payment
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {pendingOffers.length === 0 && (
          <p className="text-sm text-fg-secondary">All current offers have been processed.</p>
        )}
      </div>

      <Dialog open={Boolean(activeOffer)} onOpenChange={open => !open && setActiveOffer(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Accept Offer and Record Payment</DialogTitle>
            <DialogDescription>
              Confirm the payment handoff details. Refinance offers will also create the new
              obligation loan when the payment is marked completed.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAccept)} className="space-y-4">
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
                  onClick={() => setActiveOffer(null)}
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
    </>
  );
}
