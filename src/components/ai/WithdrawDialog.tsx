'use client';

import { useState } from 'react';
import { Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { API_ROUTES } from '@/config/api-routes';
import { QUICK_AMOUNT_PRESETS_SATS } from '@/config/ai-credits';
import { bitcoinToSats, satsToBitcoin } from '@/services/currency';
import type { EarningsData } from './types';
import { MIN_WITHDRAWAL_SATS } from './types';

interface WithdrawDialogProps {
  open: boolean;
  onClose: () => void;
  earnings: EarningsData | null;
  formatSats: (sats: number) => string;
  formatAmountBtc: (btc: number) => string;
  onWithdrawSuccess: () => void;
}

export function WithdrawDialog({
  open,
  onClose,
  earnings,
  formatSats,
  formatAmountBtc,
  onWithdrawSuccess,
}: WithdrawDialogProps) {
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [lightningAddress, setLightningAddress] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  const maxWithdrawable =
    (earnings?.available_balance_btc || 0) - (earnings?.pending_withdrawal_btc || 0);

  const handleWithdraw = async () => {
    const amount = parseInt(withdrawAmount, 10);
    if (isNaN(amount) || amount < MIN_WITHDRAWAL_SATS) {
      toast.error(`Minimum withdrawal is ${formatSats(MIN_WITHDRAWAL_SATS)}`);
      return;
    }
    if (!lightningAddress || !lightningAddress.includes('@')) {
      toast.error('Please enter a valid Lightning address');
      return;
    }
    const maxWithdrawableSats = bitcoinToSats(maxWithdrawable);
    if (amount > maxWithdrawableSats) {
      toast.error(`Maximum available for withdrawal: ${formatAmountBtc(maxWithdrawable)}`);
      return;
    }

    setWithdrawing(true);
    try {
      const response = await fetch(API_ROUTES.AI_CREDITS.WITHDRAWALS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount_btc: satsToBitcoin(amount),
          lightning_address: lightningAddress,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to request withdrawal');
      }
      toast.success('Withdrawal request submitted!');
      setWithdrawAmount('');
      onWithdrawSuccess();
    } catch (error) {
      logger.error('Withdrawal failed', error, 'AI');
      toast.error(error instanceof Error ? error.message : 'Withdrawal failed');
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={isOpen => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-green-500" />
            Withdraw Earnings
          </DialogTitle>
          <DialogDescription>
            Withdraw your AI assistant earnings to a Lightning address.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="text-sm text-green-800">Available to withdraw</div>
            <div className="text-2xl font-bold text-green-900">
              {formatAmountBtc(maxWithdrawable)}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {QUICK_AMOUNT_PRESETS_SATS.map(amount => (
              <Button
                key={amount}
                variant={withdrawAmount === amount.toString() ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setWithdrawAmount(amount.toString())}
                disabled={amount > bitcoinToSats(maxWithdrawable)}
              >
                {formatSats(amount)}
              </Button>
            ))}
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Amount</label>
            <Input
              type="number"
              value={withdrawAmount}
              onChange={e => setWithdrawAmount(e.target.value)}
              min={MIN_WITHDRAWAL_SATS}
              max={maxWithdrawable}
              className="mt-1"
              placeholder={`Minimum: ${formatSats(MIN_WITHDRAWAL_SATS)}`}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Lightning Address</label>
            <Input
              type="email"
              value={lightningAddress}
              onChange={e => setLightningAddress(e.target.value)}
              className="mt-1"
              placeholder="your@wallet.com"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Enter your Lightning address to receive the withdrawal
            </p>
          </div>

          <div className="bg-muted/40 border border-border-subtle rounded-lg p-3">
            <p className="text-base text-foreground">
              <strong>Note:</strong> Withdrawals are typically processed within a few minutes. You
              will receive the funds at your Lightning address.
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleWithdraw}
              disabled={withdrawing || !withdrawAmount || !lightningAddress}
            >
              {withdrawing
                ? 'Processing...'
                : `Withdraw ${formatSats(parseInt(withdrawAmount) || 0)}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
