'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Coins, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { useDisplayCurrency } from '@/hooks/useDisplayCurrency';
import { API_ROUTES } from '@/config/api-routes';
import { satsToBitcoin } from '@/services/currency';

interface CreditBalance {
  balance_btc: number;
  total_deposited_btc: number;
  total_spent_btc: number;
}

interface Transaction {
  id: string;
  transaction_type: 'deposit' | 'charge' | 'refund' | 'bonus';
  amount_btc: number;
  balance_before: number;
  balance_after: number;
  description: string;
  created_at: string;
  assistant?: {
    id: string;
    name: string;
    avatar_url: string | null;
  } | null;
}

export interface AICreditsData {
  balance: CreditBalance;
  transactions: Transaction[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

const TX_COLOR: Record<string, string> = {
  deposit: 'text-green-600',
  bonus: 'text-green-600',
  refund: 'text-green-600',
  charge: 'text-foreground',
};

export const getTransactionColor = (type: string) => TX_COLOR[type] ?? 'text-muted-foreground';

export const getTransactionIcon = (type: string): React.ReactNode => {
  if (type === 'charge') {
    return React.createElement(ArrowUpRight, { className: 'h-4 w-4 text-foreground' });
  }
  if (['deposit', 'bonus', 'refund'].includes(type)) {
    return React.createElement(ArrowDownLeft, { className: 'h-4 w-4 text-green-500' });
  }
  return React.createElement(Coins, { className: 'h-4 w-4 text-muted-foreground' });
};

export function useAICreditsPanel() {
  const { formatSats, formatAmountBtc } = useDisplayCurrency();
  const [data, setData] = useState<AICreditsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [depositing, setDepositing] = useState(false);
  const [showDepositDialog, setShowDepositDialog] = useState(false);
  const [depositAmount, setDepositAmount] = useState('1000');

  const fetchCredits = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(API_ROUTES.AI_CREDITS.BASE);
      if (!response.ok) {
        throw new Error('Failed to fetch credits');
      }
      const result = await response.json();
      if (result.success && result.data) {
        setData(result.data);
      }
    } catch (error) {
      logger.error('Failed to fetch AI credits', error, 'AI');
      toast.error('Failed to load credits');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  const handleDeposit = async () => {
    const amount = parseInt(depositAmount, 10);
    if (isNaN(amount) || amount < 100) {
      toast.error(`Minimum deposit is ${formatSats(100)}`);
      return;
    }

    setDepositing(true);
    try {
      // The deposit input is in sats (validated against minimum 100 sats and
      // labeled via formatSats above), but the API contract expects BTC.
      // Convert at the boundary so the same number doesn't get persisted as
      // 1e8× too big into the balance_btc column.
      const response = await fetch(API_ROUTES.AI_CREDITS.ADD, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount_btc: satsToBitcoin(amount),
          description: 'Manual deposit',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to add credits');
      }

      await response.json();
      toast.success(`Added ${formatSats(amount)} to your balance`);
      setShowDepositDialog(false);
      setDepositAmount('1000');
      fetchCredits();
    } catch (error) {
      logger.error('Deposit failed', error, 'AI');
      toast.error(error instanceof Error ? error.message : 'Deposit failed');
    } finally {
      setDepositing(false);
    }
  };

  return {
    formatSats,
    formatAmountBtc,
    data,
    loading,
    depositing,
    showDepositDialog,
    setShowDepositDialog,
    depositAmount,
    setDepositAmount,
    fetchCredits,
    handleDeposit,
  };
}
