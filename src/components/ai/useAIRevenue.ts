'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { API_ROUTES } from '@/config/api-routes';
import type { RevenueData, EarningsData, Withdrawal } from './types';

export function useAIRevenue() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [recentWithdrawals, setRecentWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRevenue = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(API_ROUTES.AI_CREDITS.REVENUE);
      if (!response.ok) {
        throw new Error('Failed to fetch revenue');
      }
      const result = await response.json();
      if (result.success && result.data) {
        setData(result.data);
      }
    } catch (error) {
      logger.error('Failed to fetch revenue', error, 'AI');
      toast.error('Failed to load revenue data');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWithdrawals = useCallback(async () => {
    try {
      const response = await fetch(`${API_ROUTES.AI_CREDITS.WITHDRAWALS}?limit=5`);
      if (!response.ok) {
        return;
      }
      const result = await response.json();
      if (result.success && result.data) {
        setEarnings(result.data.earnings);
        setRecentWithdrawals(result.data.withdrawals);
      }
    } catch (error) {
      logger.error('Failed to fetch withdrawals', error, 'AI');
    }
  }, []);

  const refresh = useCallback(() => {
    fetchRevenue();
    fetchWithdrawals();
  }, [fetchRevenue, fetchWithdrawals]);

  useEffect(() => {
    fetchRevenue();
    fetchWithdrawals();
  }, [fetchRevenue, fetchWithdrawals]);

  return { data, earnings, recentWithdrawals, loading, refresh, fetchRevenue };
}
