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
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { EntityCard } from '@/components/entity/EntityCard';
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
              <DollarSign className="w-6 h-6 text-fg-primary" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-fg-primary truncate">{loan.title}</h3>
              <p className="text-sm text-fg-secondary truncate">
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
              <span className="text-fg-secondary">{formatRelativeTime(loan.created_at)}</span>
            </div>
          </div>
        </Card>
      </Link>
    );
  }

  return (
    <EntityCard
      id={loan.id}
      title={loan.title}
      description={loan.description}
      href={`${ENTITY_REGISTRY['loan'].publicBasePath}/${loan.id}`}
      headerSlot={
        <Badge
          variant={loan.status === STATUS.LOANS.ACTIVE ? 'default' : 'secondary'}
          className="text-xs capitalize"
        >
          {loan.status}
        </Badge>
      }
      progressSlot={
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-fg-secondary">Remaining</span>
            <span className="font-semibold text-fg-primary">
              {formatAmount(loan.remaining_balance, loan.currency)}
            </span>
          </div>
          <Progress value={progress} className="h-1.5" />
          <div className="flex justify-between text-xs text-fg-secondary">
            <span>{progress.toFixed(0)}% funded</span>
            <span>{formatAmount(loan.original_amount, loan.currency)} total</span>
          </div>
        </div>
      }
      metricsSlot={
        loan.interest_rate || loan.monthly_payment ? (
          <div className="flex items-center justify-between text-sm">
            {loan.interest_rate && (
              <div className="flex items-center gap-1">
                <Percent className="h-3 w-3 text-fg-tertiary" />
                <span>{loan.interest_rate}% APR</span>
              </div>
            )}
            {loan.monthly_payment && (
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-fg-tertiary" />
                <span>{formatAmount(loan.monthly_payment, loan.currency)}/mo</span>
              </div>
            )}
          </div>
        ) : null
      }
      footerSlot={
        loan.lender_name ? (
          <div className="flex items-center gap-2 text-xs text-fg-secondary">
            <User className="h-3 w-3" />
            <span className="truncate">Current lender: {loan.lender_name}</span>
          </div>
        ) : null
      }
    />
  );
}

export default LoanCard;
