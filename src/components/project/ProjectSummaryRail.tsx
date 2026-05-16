'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { computeAmountRaised } from '@/lib/projectGoal';
import Button from '@/components/ui/Button';
import { useDisplayCurrency } from '@/hooks/useDisplayCurrency';

import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { Bitcoin } from 'lucide-react';
import { formatRelativeTime } from '@/utils/dates';
import { PLATFORM_DEFAULT_CURRENCY } from '@/config/currencies';
import { formatCurrency } from '@/services/currency';
import { API_ROUTES } from '@/config/api-routes';

interface Props {
  project: {
    id: string;
    goal_amount: number | null;
    currency?: string | null;
    goal_currency?: string | null;
    bitcoin_address?: string | null;
    bitcoin_balance_btc?: number;
    bitcoin_balance_updated_at?: string | null;
    supporters_count?: number;
    last_support_at?: string | null;
    user_id?: string;
  };
  isOwner?: boolean;
}

export default function ProjectSummaryRail({ project, isOwner }: Props) {
  const { formatAmountBtc: formatAmount } = useDisplayCurrency();
  const goalCurrency = project.goal_currency || project.currency || PLATFORM_DEFAULT_CURRENCY;
  const [amountRaised, setAmountRaised] = useState<number>(0);
  const [refreshing, setRefreshing] = useState(false);
  const [bitcoinBalanceBtc, setBitcoinBalanceBtc] = useState<number>(
    project.bitcoin_balance_btc || 0
  );
  const [bitcoinBalanceUpdatedAt, setBitcoinBalanceUpdatedAt] = useState<string | null>(
    project.bitcoin_balance_updated_at || null
  );

  useEffect(() => {
    const init = async () => {
      const btc = bitcoinBalanceBtc;
      const amt = await computeAmountRaised(btc, goalCurrency);
      setAmountRaised(amt);
    };
    init();
  }, [bitcoinBalanceBtc, goalCurrency]);

  const progress = useMemo(() => {
    const goal = project.goal_amount || 0;
    if (!goal) {
      return 0;
    }
    return Math.min((amountRaised / goal) * 100, 100);
  }, [amountRaised, project.goal_amount]);

  const onRefresh = useCallback(async () => {
    if (!project.bitcoin_address) {
      return;
    }
    setRefreshing(true);
    try {
      const res = await fetch(API_ROUTES.PROJECTS.REFRESH_BALANCE(project.id), { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        if (data.balance_btc !== undefined) {
          setBitcoinBalanceBtc(data.balance_btc);
          setBitcoinBalanceUpdatedAt(data.updated_at || new Date().toISOString());
          toast.success('Balance refreshed successfully');
        }
      } else {
        toast.error(data.error || 'Failed to refresh balance');
        logger.error(
          'Failed to refresh balance',
          { projectId: project.id, error: data.error },
          'ProjectSummaryRail'
        );
      }
    } catch (error) {
      toast.error('Failed to refresh balance. Please try again.');
      logger.error(
        'Failed to refresh balance',
        { projectId: project.id, error },
        'ProjectSummaryRail'
      );
    } finally {
      setRefreshing(false);
    }
  }, [project.id, project.bitcoin_address]);

  return (
    <aside className="sticky top-6 rounded-xl border bg-white dark:bg-card dark:border-border p-6 space-y-4">
      <div>
        <div className="text-2xl font-bold">{formatCurrency(amountRaised, goalCurrency)}</div>
        {project.goal_amount && (
          <div className="text-sm text-gray-600 dark:text-muted-foreground">
            of {formatCurrency(project.goal_amount, goalCurrency)} goal
          </div>
        )}
        {project.bitcoin_address && (
          <div className="mt-3 p-3 bg-orange-50 rounded-lg border border-orange-100">
            <div className="flex items-center gap-2 mb-1">
              <Bitcoin className="w-4 h-4 text-orange-600" />
              <span className="text-xs font-medium text-orange-700 uppercase tracking-wide">
                Bitcoin Balance
              </span>
            </div>
            <div className="text-base font-semibold text-gray-900 dark:text-foreground">
              {formatAmount(bitcoinBalanceBtc)}
            </div>
            {bitcoinBalanceUpdatedAt && (
              <div className="text-xs text-gray-500 dark:text-muted-foreground mt-1">
                Updated {formatRelativeTime(bitcoinBalanceUpdatedAt)}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="w-full bg-gray-200 dark:bg-muted rounded-full h-3">
        <div className="bg-orange-500 h-3 rounded-full" style={{ width: `${progress}%` }} />
      </div>

      {/* Social Proof - Supporters Count */}
      {(project.supporters_count || project.last_support_at) && (
        <div className="space-y-2 text-sm border-t pt-4">
          {project.supporters_count !== undefined && project.supporters_count > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-muted-foreground">Supporters</span>
              <span className="font-semibold text-gray-900 dark:text-foreground">
                {project.supporters_count} {project.supporters_count === 1 ? 'person' : 'people'}
              </span>
            </div>
          )}
          {project.last_support_at && (
            <div className="text-xs text-green-600 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
              Last contribution {formatRelativeTime(project.last_support_at)}
            </div>
          )}
        </div>
      )}

      {/* Owner Actions */}
      {isOwner && project.bitcoin_address && (
        <Button onClick={onRefresh} disabled={refreshing} variant="outline" className="w-full">
          {refreshing ? 'Refreshing…' : 'Refresh Balance'}
        </Button>
      )}
    </aside>
  );
}
