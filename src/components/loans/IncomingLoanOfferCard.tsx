'use client';

/**
 * One incoming loan offer card (borrower's view). Extracted from
 * IncomingLoanOffersList.tsx to keep it under 300 lines. Presentational:
 * the parent owns submit state and the accept/reject handlers.
 */
import type { LoanOffer } from '@/types/loans';
import { STATUS } from '@/config/database-constants';
import { formatRelativeTime } from '@/utils/dates';
import { getLoanOfferStatusColor, getLoanOfferStatusIcon } from '@/config/loans';
import { formatLoanAmount } from './useLoanList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import Button from '@/components/ui/Button';

export function IncomingLoanOfferCard({
  offer,
  submitting,
  onReject,
  onAccept,
}: {
  offer: LoanOffer;
  submitting: boolean;
  onReject: (offer: LoanOffer) => void;
  onAccept: (offer: LoanOffer) => void;
}) {
  const offererLabel =
    offer.profiles?.display_name || offer.profiles?.username || 'Community lender';
  const loanTitle = offer.loans?.title || 'Loan';
  const StatusIcon = getLoanOfferStatusIcon(offer.status);

  return (
    <Card>
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
            <p className="mt-1 text-sm text-fg-secondary whitespace-pre-wrap">{offer.terms}</p>
          </div>
        )}

        {offer.conditions && (
          <div className="rounded-md bg-surface-raised/60 p-3">
            <p className="text-sm font-medium text-fg-primary">Conditions</p>
            <p className="mt-1 text-sm text-fg-secondary whitespace-pre-wrap">{offer.conditions}</p>
          </div>
        )}

        {offer.status === STATUS.LOAN_OFFERS.PENDING && (
          <div className="flex flex-col gap-2 border-t border-default pt-3 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="w-full sm:w-auto text-status-negative hover:text-status-negative/80"
              onClick={() => onReject(offer)}
              disabled={submitting}
            >
              Reject
            </Button>
            <Button
              className="w-full sm:w-auto"
              onClick={() => onAccept(offer)}
              disabled={submitting}
            >
              Accept and Record Payment
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
