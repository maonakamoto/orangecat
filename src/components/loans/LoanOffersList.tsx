'use client';

import { LoanOffer } from '@/types/loans';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/Button';
import { Target, TrendingUp, Clock, CheckCircle, XCircle, Edit, MessageSquare } from 'lucide-react';
import { STATUS } from '@/config/database-constants';
import { formatRelativeTime } from '@/utils/dates';
import { getLoanOfferStatusColor } from '@/config/loans';
import { formatLoanAmount } from './useLoanList';

interface LoanOffersListProps {
  offers: LoanOffer[];
  onOfferUpdated?: () => void;
}

export function LoanOffersList({ offers, onOfferUpdated: _onOfferUpdated }: LoanOffersListProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case STATUS.LOAN_OFFERS.PENDING:
        return <Clock className="h-4 w-4" />;
      case STATUS.LOAN_OFFERS.ACCEPTED:
        return <CheckCircle className="h-4 w-4" />;
      case STATUS.LOAN_OFFERS.REJECTED:
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (offers.length === 0) {
    return (
      <div className="text-center py-8">
        <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold">No offers yet</h3>
        <p className="text-muted-foreground">Your offers will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {offers.map(offer => (
        <Card key={offer.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <CardTitle className="text-lg">
                    {offer.offer_type === 'refinance' ? 'Refinance Offer' : 'Payoff Offer'}
                  </CardTitle>
                  <Badge className={`${getLoanOfferStatusColor(offer.status)} gap-1`}>
                    {getStatusIcon(offer.status)}
                    {offer.status}
                  </Badge>
                </div>
                <CardDescription>Made {formatRelativeTime(offer.created_at)}</CardDescription>
              </div>
              <div className="flex gap-1">
                {offer.status === STATUS.LOAN_OFFERS.PENDING && (
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Offer Details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Offer Amount</p>
                <p className="text-lg font-semibold text-green-600">
                  {formatLoanAmount(offer.offer_amount)}
                </p>
              </div>

              {offer.interest_rate && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Interest Rate</p>
                  <p className="text-lg font-semibold">{offer.interest_rate}%</p>
                </div>
              )}

              {offer.term_months && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Term</p>
                  <p className="text-lg font-semibold">{offer.term_months} months</p>
                </div>
              )}

              {offer.monthly_payment && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Monthly Payment</p>
                  <p className="text-lg font-semibold">{formatLoanAmount(offer.monthly_payment)}</p>
                </div>
              )}
            </div>

            {/* Terms */}
            {offer.terms && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Terms & Conditions</p>
                <p className="text-sm text-muted-foreground bg-gray-50 p-3 rounded">
                  {offer.terms}
                </p>
              </div>
            )}

            {/* Status-specific info */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="text-sm text-muted-foreground">
                {offer.status === STATUS.LOAN_OFFERS.PENDING && offer.expires_at && (
                  <span>Expires {formatRelativeTime(offer.expires_at)}</span>
                )}
                {offer.status === STATUS.LOAN_OFFERS.ACCEPTED && offer.accepted_at && (
                  <span>Accepted {formatRelativeTime(offer.accepted_at)}</span>
                )}
                {offer.status === STATUS.LOAN_OFFERS.REJECTED && offer.rejected_at && (
                  <span>Rejected {formatRelativeTime(offer.rejected_at)}</span>
                )}
              </div>

              <div className="flex gap-2">
                {offer.status === STATUS.LOAN_OFFERS.PENDING && (
                  <>
                    <Button variant="outline" size="sm" className="gap-1">
                      <MessageSquare className="h-3 w-3" />
                      Message
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                      Cancel Offer
                    </Button>
                  </>
                )}
                {offer.status === STATUS.LOAN_OFFERS.ACCEPTED && (
                  <Button variant="outline" size="sm" className="gap-1">
                    <TrendingUp className="h-3 w-3" />
                    View Agreement
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
