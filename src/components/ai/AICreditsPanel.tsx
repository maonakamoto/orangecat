'use client';

import { Plus, RefreshCw, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { QUICK_AMOUNT_PRESETS_SATS } from '@/config/ai-credits';
import { formatDate } from '@/utils/dates';
import { useAICreditsPanel, getTransactionIcon, getTransactionColor } from './useAICreditsPanel';

export function AICreditsPanel() {
  const {
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
  } = useAICreditsPanel();

  if (loading && !data) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-16 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const balance = data?.balance || {
    balance_btc: 0,
    total_deposited_btc: 0,
    total_spent_btc: 0,
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              AI Credits
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={fetchCredits} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/30 rounded-lg p-4 border border-yellow-200">
            <div className="text-sm text-yellow-800 mb-1">Available Balance</div>
            <div className="text-3xl font-bold text-yellow-900">
              {formatAmountBtc(balance.balance_btc)}
            </div>
            <div className="text-xs text-yellow-700 mt-2 flex gap-4">
              <span>Deposited: {formatAmountBtc(balance.total_deposited_btc)}</span>
              <span>Spent: {formatAmountBtc(balance.total_spent_btc)}</span>
            </div>
          </div>

          <Button className="w-full" onClick={() => setShowDepositDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Credits
          </Button>

          {data?.transactions && data.transactions.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground">Recent Activity</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {data.transactions.slice(0, 5).map(tx => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between py-2 px-3 bg-muted rounded-lg text-sm"
                  >
                    <div className="flex items-center gap-2">
                      {getTransactionIcon(tx.transaction_type)}
                      <div>
                        <div className="font-medium dark:text-foreground">
                          {tx.assistant?.name || tx.description || tx.transaction_type}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(tx.created_at)}
                        </div>
                      </div>
                    </div>
                    <div className={`font-medium ${getTransactionColor(tx.transaction_type)}`}>
                      {tx.transaction_type === 'charge' ? '-' : '+'}
                      {formatAmountBtc(tx.amount_btc)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(!data?.transactions || data.transactions.length === 0) && (
            <div className="text-center py-4 text-muted-foreground text-base">
              No transactions yet. Add credits to start chatting with AI assistants.
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDepositDialog} onOpenChange={setShowDepositDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Add AI Credits
            </DialogTitle>
            <DialogDescription>
              Add credits to chat with AI assistants. Credits are used to pay for AI messages.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-4 gap-2">
              {QUICK_AMOUNT_PRESETS_SATS.map(amount => (
                <Button
                  key={amount}
                  variant={depositAmount === amount.toString() ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setDepositAmount(amount.toString())}
                >
                  {formatSats(amount)}
                </Button>
              ))}
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Custom Amount</label>
              <Input
                type="number"
                value={depositAmount}
                onChange={e => setDepositAmount(e.target.value)}
                min={100}
                max={1000000}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Minimum: {formatSats(100)} | Maximum: {formatSats(1000000)}
              </p>
            </div>

            <div className="bg-muted/40 border border-border-subtle rounded-lg p-3">
              <p className="text-base text-foreground">
                <strong>Development Mode:</strong> Credits are added instantly for testing. In
                production, this will generate a Lightning invoice for payment.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowDepositDialog(false)}
              >
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleDeposit} disabled={depositing}>
                {depositing ? 'Adding...' : `Add ${formatSats(parseInt(depositAmount) || 0)}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default AICreditsPanel;
