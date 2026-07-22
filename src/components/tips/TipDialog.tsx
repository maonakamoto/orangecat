'use client';

import { useEffect, useState } from 'react';
import { Loader2, Zap } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { PaymentQRCode } from '@/components/payment/PaymentQRCode';
import { ContributionAmountInput } from '@/components/payment/ContributionAmountInput';
import { fetchTipInvoice, fetchTipReceiveInfo, type TipInvoice } from '@/services/tips/tip-client';
import { DEFAULT_TIP_BTC, TIP_COPY, TIP_MAX_BTC, TIP_MIN_BTC } from '@/config/tips';

interface TipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  username: string;
  recipientName: string;
}

export default function TipDialog({ open, onOpenChange, username, recipientName }: TipDialogProps) {
  const [amount, setAmount] = useState(DEFAULT_TIP_BTC);
  const [checkingWallet, setCheckingWallet] = useState(true);
  const [canReceive, setCanReceive] = useState<boolean | null>(null);
  const [invoice, setInvoice] = useState<TipInvoice | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // On open, reset and check whether the recipient can receive tips.
  useEffect(() => {
    if (!open) {
      return;
    }
    let active = true;
    setInvoice(null);
    setError(null);
    setAmount(DEFAULT_TIP_BTC);
    setCheckingWallet(true);
    setCanReceive(null);
    fetchTipReceiveInfo(username)
      .then(info => {
        if (active) {
          setCanReceive(info.canReceive);
        }
      })
      .catch(() => {
        if (active) {
          setCanReceive(false);
        }
      })
      .finally(() => {
        if (active) {
          setCheckingWallet(false);
        }
      });
    return () => {
      active = false;
    };
  }, [open, username]);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      setInvoice(await fetchTipInvoice(username, amount));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create a tip request.');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-bitcoinOrange" />
            {TIP_COPY.title(recipientName)}
          </DialogTitle>
          <DialogDescription>{TIP_COPY.subtitle}</DialogDescription>
        </DialogHeader>

        {checkingWallet ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-fg-tertiary" />
          </div>
        ) : canReceive === false ? (
          <p className="rounded-md border border-subtle bg-surface-raised/40 px-4 py-6 text-center text-sm text-fg-secondary">
            {TIP_COPY.noWallet(recipientName)}
          </p>
        ) : invoice ? (
          <div className="space-y-4">
            <PaymentQRCode
              qrData={invoice.qrData}
              methodLabel={invoice.methodLabel}
              amountBtc={invoice.amountBtc}
              expiresInSeconds={invoice.expiresInSeconds ?? undefined}
            />
            <p className="text-center text-sm text-fg-secondary">{TIP_COPY.scan}</p>
            <p className="text-center text-xs text-fg-tertiary">{TIP_COPY.disclaimer}</p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={() => setInvoice(null)}>
                {TIP_COPY.again}
              </Button>
              <Button variant="accent" onClick={() => onOpenChange(false)}>
                {TIP_COPY.done}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <ContributionAmountInput
              value={amount}
              onChange={setAmount}
              minBtc={TIP_MIN_BTC}
              maxBtc={TIP_MAX_BTC}
            />
            {error && <p className="text-sm text-status-negative">{error}</p>}
            <p className="text-center text-xs text-fg-tertiary">{TIP_COPY.disclaimer}</p>
            <Button
              variant="accent"
              className="w-full"
              onClick={handleGenerate}
              disabled={generating || amount <= 0}
              isLoading={generating}
            >
              {generating ? TIP_COPY.generating : TIP_COPY.generate}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
