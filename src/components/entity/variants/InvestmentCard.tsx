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
        <Card className="hover:shadow-md transition-shadow">
          <div className="flex items-center p-4 gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-foreground truncate">
                {investment.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-muted-foreground truncate">
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
              <span className="text-gray-500 dark:text-muted-foreground">
                {formatRelativeTime(investment.created_at)}
              </span>
            </div>
          </div>
        </Card>
      </Link>
    );
  }

  return (
    <Link href={`${ENTITY_REGISTRY['investment'].publicBasePath}/${investment.id}`}>
      <Card className="hover:shadow-md transition-shadow h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-green-600" />
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
            <p className="text-sm text-gray-600 dark:text-muted-foreground line-clamp-2">
              {investment.description}
            </p>
          )}

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Raised</span>
              <span className="font-semibold text-green-600">
                {formatAmount(investment.total_raised)}
              </span>
            </div>
            <Progress value={progress} className="h-1.5" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{progress}% funded</span>
              <span>{formatAmount(investment.target_amount)} goal</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            {investment.expected_return_rate !== null &&
              investment.expected_return_rate !== undefined && (
                <div className="flex items-center gap-1">
                  <Percent className="h-3 w-3 text-gray-400 dark:text-muted-foreground" />
                  <span>{investment.expected_return_rate}% expected return</span>
                </div>
              )}
            {investment.risk_level && (
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  INVESTMENT_RISK_COLORS[investment.risk_level] ??
                  'bg-gray-100 dark:bg-muted text-gray-700 dark:text-muted-foreground border-gray-200 dark:border-border'
                }`}
              >
                <Shield className="h-3 w-3" />
                {investment.risk_level} risk
              </span>
            )}
          </div>

          {investment.term_months !== null && investment.term_months !== undefined && (
            <p className="text-xs text-muted-foreground">
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
