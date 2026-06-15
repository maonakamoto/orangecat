'use client';

import Link from 'next/link';
import { TrendingUp, Percent, Shield } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatRelativeTime } from '@/utils/dates';
import type { Investment } from '@/types/investments';
import { formatCurrency as formatCurrencyFn } from '@/services/currency';
import { INVESTMENT_TYPE_LABELS, INVESTMENT_RISK_COLORS } from '@/config/investments';
import { ENTITY_REGISTRY } from '@/config/entity-registry';

interface InvestmentCardProps {
  investment: Investment;
  viewMode?: 'grid' | 'list';
}

export function InvestmentCard({ investment, viewMode = 'grid' }: InvestmentCardProps) {
  const formatAmount = (amount: number) => formatCurrencyFn(amount, investment.currency || 'USD');

  const progress =
    investment.target_amount > 0
      ? Math.min(Math.round((investment.total_raised / investment.target_amount) * 100), 100)
      : 0;

  if (viewMode === 'list') {
    return (
      <Link href={`${ENTITY_REGISTRY['investment'].publicBasePath}/${investment.id}`}>
        <Card className="oc-card-link">
          <div className="flex items-center p-4 gap-4">
            <div className="oc-icon-tile h-12 w-12">
              <TrendingUp className="w-6 h-6 text-status-positive" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-fg-primary truncate">{investment.title}</h3>
              <p className="text-sm text-fg-secondary truncate">
                {formatAmount(investment.total_raised)} raised of{' '}
                {formatAmount(investment.target_amount)}
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              {investment.expected_return_rate !== null &&
                investment.expected_return_rate !== undefined && (
                  <Badge variant="secondary" className="gap-1">
                    <Percent className="h-3 w-3" />
                    {investment.expected_return_rate}% return
                  </Badge>
                )}
              <span className="text-fg-secondary">{formatRelativeTime(investment.created_at)}</span>
            </div>
          </div>
        </Card>
      </Link>
    );
  }

  return (
    <Link href={`${ENTITY_REGISTRY['investment'].publicBasePath}/${investment.id}`}>
      <Card className="oc-card-link h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="oc-icon-tile h-8 w-8">
                <TrendingUp className="w-4 h-4 text-status-positive" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base truncate">{investment.title}</CardTitle>
                <CardDescription className="text-xs">
                  Listed {formatRelativeTime(investment.created_at)}
                </CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="capitalize text-xs">
              {INVESTMENT_TYPE_LABELS[investment.investment_type] ?? investment.investment_type}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {investment.description && (
            <p className="text-sm text-fg-secondary line-clamp-2">{investment.description}</p>
          )}

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-fg-secondary">Raised</span>
              <span className="font-semibold text-status-positive">
                {formatAmount(investment.total_raised)}
              </span>
            </div>
            <Progress value={progress} className="h-1.5" />
            <div className="flex justify-between text-xs text-fg-secondary">
              <span>{progress}% funded</span>
              <span>{formatAmount(investment.target_amount)} goal</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            {investment.expected_return_rate !== null &&
              investment.expected_return_rate !== undefined && (
                <div className="flex items-center gap-1">
                  <Percent className="h-3 w-3 text-fg-tertiary" />
                  <span>{investment.expected_return_rate}% expected return</span>
                </div>
              )}
            {investment.risk_level && (
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  INVESTMENT_RISK_COLORS[investment.risk_level] ??
                  'bg-surface-raised text-fg-primary border-default'
                }`}
              >
                <Shield className="h-3 w-3" />
                {investment.risk_level} risk
              </span>
            )}
          </div>

          {investment.term_months !== null && investment.term_months !== undefined && (
            <p className="text-xs text-fg-secondary">
              {investment.term_months}-month term · min{' '}
              {formatAmount(investment.minimum_investment)}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export default InvestmentCard;
