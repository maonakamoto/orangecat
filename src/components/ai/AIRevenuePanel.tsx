'use client';

import { useState } from 'react';
import { TrendingUp, MessageSquare, Users, Wallet, RefreshCw, Bot } from 'lucide-react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useDisplayCurrency } from '@/hooks/useDisplayCurrency';
import { bitcoinToSats } from '@/services/currency';
import { MIN_WITHDRAWAL_SATS } from './types';
import { useAIRevenue } from './useAIRevenue';
import { WithdrawDialog } from './WithdrawDialog';
import { RecentWithdrawals } from './RecentWithdrawals';

export function AIRevenuePanel() {
  const { formatSats, formatAmountBtc } = useDisplayCurrency();
  const { data, earnings, recentWithdrawals, loading, refresh, fetchRevenue } = useAIRevenue();
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);

  if (loading && !data) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-16 bg-muted rounded"></div>
              <div className="h-16 bg-muted rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const summary = data?.summary || {
    total_revenue_btc: 0,
    available_balance_btc: 0,
    total_conversations: 0,
    total_messages: 0,
    total_assistants: 0,
  };
  const assistants = data?.assistants || [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            Creator Revenue
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchRevenue} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Revenue Summary */}
        <div className="bg-status-positive-subtle rounded-lg p-4 border border-status-positive/30">
          <div className="text-sm text-green-800 mb-1">Total Earnings</div>
          <div className="text-3xl font-bold text-green-900">
            {formatAmountBtc(earnings?.total_earned_btc || summary.total_revenue_btc)}
          </div>
          <div className="text-sm text-green-700 mt-1 space-y-0.5">
            <div>
              Available:{' '}
              {formatAmountBtc(earnings?.available_balance_btc || summary.available_balance_btc)}
            </div>
            {(earnings?.pending_withdrawal_btc || 0) > 0 && (
              <div className="text-yellow-700">
                Pending: {formatAmountBtc(earnings?.pending_withdrawal_btc || 0)}
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Users className="h-4 w-4" />
              Conversations
            </div>
            <div className="text-xl font-semibold mt-1">
              {summary.total_conversations.toLocaleString()}
            </div>
          </div>
          <div className="bg-muted rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <MessageSquare className="h-4 w-4" />
              Messages
            </div>
            <div className="text-xl font-semibold mt-1">
              {summary.total_messages.toLocaleString()}
            </div>
          </div>
        </div>

        {bitcoinToSats(
          (earnings?.available_balance_btc || 0) - (earnings?.pending_withdrawal_btc || 0)
        ) >= MIN_WITHDRAWAL_SATS && (
          <Button className="w-full" variant="outline" onClick={() => setShowWithdrawDialog(true)}>
            <Wallet className="h-4 w-4 mr-2" />
            Withdraw Earnings
          </Button>
        )}

        <RecentWithdrawals withdrawals={recentWithdrawals} formatAmountBtc={formatAmountBtc} />

        {/* Per-Assistant Breakdown */}
        {assistants.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground">By Assistant</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {assistants.map(assistant => (
                <div
                  key={assistant.id}
                  className="flex items-center justify-between py-2 px-3 bg-muted rounded-lg text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      {assistant.avatar_url ? (
                        <Image
                          src={assistant.avatar_url}
                          alt={assistant.name}
                          width={32}
                          height={32}
                          className="h-8 w-8 rounded-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <Bot className="h-4 w-4 text-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{assistant.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {assistant.total_conversations} chats, {assistant.total_messages} msgs
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <div className="font-medium text-green-600">
                      {formatAmountBtc(assistant.total_revenue_btc)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {assistants.length === 0 && (
          <div className="text-center py-4 text-muted-foreground text-base">
            No AI assistants yet. Create one to start earning!
          </div>
        )}
      </CardContent>

      <WithdrawDialog
        open={showWithdrawDialog}
        onClose={() => setShowWithdrawDialog(false)}
        earnings={earnings}
        formatSats={formatSats}
        formatAmountBtc={formatAmountBtc}
        onWithdrawSuccess={() => {
          setShowWithdrawDialog(false);
          refresh();
        }}
      />
    </Card>
  );
}

export default AIRevenuePanel;
