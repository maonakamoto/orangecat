'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Coins, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { useDisplayCurrency } from '@/hooks/useDisplayCurrency';
import { API_ROUTES } from '@/config/api-routes';

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
  charge: 'text-orange-600',
};

export const getTransactionColor = (type: string) => TX_COLOR[type] ?? 'text-gray-600';

export const getTransactionIcon = (type: string): React.ReactNode => {
  if (type === 'charge') {
    return React.createElement(ArrowUpRight, { className: 'h-4 w-4 text-orange-500' });
  }
  if (['deposit', 'bonus', 'refund'].includes(type)) {
    return React.createElement(ArrowDownLeft, { className: 'h-4 w-4 text-green-500' });
  }
  return React.createElement(Coins, { className: 'h-4 w-4 text-gray-500' });
};

export function useAICreditsPanel() {
  const { formatAmount, formatAmountBtc } = useDisplayCurrency();
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
      toast.error(`Minimum deposit is ${formatAmount(100)}`);
      return;
    }

    setDepositing(true);
    try {
      const response = await fetch(API_ROUTES.AI_CREDITS.ADD, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_btc: amount, description: 'Manual deposit' }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add credits');
      }

      await response.json();
      toast.success(`Added ${formatAmount(amount)} to your balance`);
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
    formatAmount,
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
