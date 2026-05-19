/**
 * Loan Card Component for Discover/Browse Pages
 *
 * Displays loan information in a card format for discovery.
 * Consistent with ProjectCard and ProfileCard patterns.
 *
 * Created: 2025-12-31
 */

'use client';

import Link from 'next/link';
import { DollarSign, Percent, TrendingUp, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatRelativeTime } from '@/utils/dates';
import type { Loan } from '@/types/loans';
import { STATUS } from '@/config/database-constants';
import { ENTITY_REGISTRY } from '@/config/entity-registry';
import { formatCurrency as formatCurrencyFn } from '@/services/currency';
import { calculateProgress } from '@/components/loans/useLoanList';

interface LoanCardProps {
  loan: Loan;
  viewMode?: 'grid' | 'list';
}

export function LoanCard({ loan, viewMode = 'grid' }: LoanCardProps) {
  const formatAmount = (amount: number, currency: string = 'USD') =>
    formatCurrencyFn(amount, currency);

  const progress = calculateProgress(loan.original_amount, loan.remaining_balance);

  if (viewMode === 'list') {
    return (
      <Link href={`${ENTITY_REGISTRY['loan'].publicBasePath}/${loan.id}`}>
        <Card className="oc-card-link">
          <div className="flex items-center p-4 gap-4">
            {/* Icon */}
            <div className="oc-icon-tile h-12 w-12">
              <DollarSign className="w-6 h-6 text-tiffany-600 dark:text-tiffany-400" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate">{loan.title}</h3>
              <p className="text-sm text-muted-foreground truncate">
                {formatAmount(loan.remaining_balance, loan.currency)} remaining
              </p>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm">
              {loan.interest_rate && (
                <Badge variant="secondary" className="gap-1">
                  <Percent className="h-3 w-3" />
                  {loan.interest_rate}%
                </Badge>
              )}
              <span className="text-muted-foreground">{formatRelativeTime(loan.created_at)}</span>
            </div>
          </div>
        </Card>
      </Link>
    );
  }

  return (
    <Link href={`${ENTITY_REGISTRY['loan'].publicBasePath}/${loan.id}`}>
      <Card className="oc-card-link h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="oc-icon-tile h-8 w-8">
                <DollarSign className="w-4 h-4 text-tiffany-600 dark:text-tiffany-400" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base truncate">{loan.title}</CardTitle>
                <CardDescription className="text-xs">
                  Listed {formatRelativeTime(loan.created_at)}
                </CardDescription>
              </div>
            </div>
            <Badge
              variant={loan.status === STATUS.LOANS.ACTIVE ? 'default' : 'secondary'}
              className="capitalize text-xs"
            >
              {loan.status}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Description */}
          {loan.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{loan.description}</p>
          )}

          {/* Financial Summary */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Remaining</span>
              <span className="font-semibold text-tiffany-600">
                {formatAmount(loan.remaining_balance, loan.currency)}
              </span>
            </div>
            <Progress value={progress} className="h-1.5" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{progress.toFixed(0)}% funded</span>
              <span>{formatAmount(loan.original_amount, loan.currency)} total</span>
            </div>
          </div>

          {/* Interest Rate & Monthly Payment */}
          <div className="flex items-center justify-between text-sm">
            {loan.interest_rate && (
              <div className="flex items-center gap-1">
                <Percent className="h-3 w-3 text-muted-dim" />
                <span>{loan.interest_rate}% APR</span>
              </div>
            )}
            {loan.monthly_payment && (
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-muted-dim" />
                <span>{formatAmount(loan.monthly_payment, loan.currency)}/mo</span>
              </div>
            )}
          </div>

          {/* Lender Info */}
          {loan.lender_name && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              <span className="truncate">Current lender: {loan.lender_name}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export default LoanCard;
