'use client';

import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import type { Withdrawal } from './types';
import { formatDate } from '@/utils/dates';

function getStatusIcon(status: string) {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'pending':
    case 'processing':
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'cancelled':
      return <AlertCircle className="h-4 w-4 text-gray-500" />;
    default:
      return <Clock className="h-4 w-4 text-gray-500" />;
  }
}

interface RecentWithdrawalsProps {
  withdrawals: Withdrawal[];
  formatAmountBtc: (btc: number) => string;
}

export function RecentWithdrawals({ withdrawals, formatAmountBtc }: RecentWithdrawalsProps) {
  if (withdrawals.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-700">Recent Withdrawals</h4>
      <div className="space-y-2">
        {withdrawals.slice(0, 3).map(withdrawal => (
          <div
            key={withdrawal.id}
            className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg text-sm"
          >
            <div className="flex items-center gap-2">
              {getStatusIcon(withdrawal.status)}
              <div>
                <div className="font-medium">{formatAmountBtc(withdrawal.amount_btc)}</div>
                <div className="text-xs text-gray-500">{formatDate(withdrawal.created_at)}</div>
              </div>
            </div>
            <div className="text-xs text-gray-500 capitalize">{withdrawal.status}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
