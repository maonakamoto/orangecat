export interface AssistantRevenue {
  id: string;
  name: string;
  avatar_url: string | null;
  total_revenue_btc: number;
  total_conversations: number;
  total_messages: number;
  pricing_model: string;
  price_per_message: number;
}

export interface RevenueSummary {
  total_revenue_btc: number;
  available_balance_btc: number;
  total_conversations: number;
  total_messages: number;
  total_assistants: number;
}

export interface RevenueData {
  summary: RevenueSummary;
  assistants: AssistantRevenue[];
}

import type { AIWithdrawalStatus } from '@/config/database-constants';

export interface Withdrawal {
  id: string;
  amount_btc: number;
  status: AIWithdrawalStatus;
  lightning_address: string | null;
  created_at: string;
}

export interface EarningsData {
  total_earned_btc: number;
  total_withdrawn_btc: number;
  available_balance_btc: number;
  pending_withdrawal_btc: number;
}

export const MIN_WITHDRAWAL_SATS = 1000;
export const MIN_WITHDRAWAL_BTC = MIN_WITHDRAWAL_SATS / 100_000_000;
