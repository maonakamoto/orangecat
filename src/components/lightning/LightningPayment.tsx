'use client';

import Link from 'next/link';
import { Zap, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { useDisplayCurrency } from '@/hooks/useDisplayCurrency';
import { useLightningPayment } from './useLightningPayment';
import { BADGE_COLORS } from '@/config/badge-colors';
import { LightningInvoiceForm } from './LightningInvoiceForm';
import { LightningInvoiceDisplay } from './LightningInvoiceDisplay';
import { LightningPaymentSuccess } from './LightningPaymentSuccess';
import { ROUTES } from '@/config/routes';

export type { Invoice } from './useLightningPayment';

interface LightningPaymentProps {
  recipientAddress: string;
  projectTitle: string;
  projectId: string;
  presetAmount?: number;
  onPaymentComplete?: (paymentHash: string) => void;
  onPaymentFailed?: (error: string) => void;
  className?: string;
}

export default function LightningPayment({
  recipientAddress: _recipientAddress,
  projectTitle,
  projectId: _projectId,
  presetAmount,
  onPaymentComplete,
  onPaymentFailed,
  className = '',
}: LightningPaymentProps) {
  const { displayCurrency } = useDisplayCurrency();
  const {
    nwcConnected,
    amount,
    setAmount,
    message,
    setMessage,
    invoice,
    isGenerating,
    paymentStatus,
    copied,
    timeLeft,
    generateInvoice,
    copyInvoice,
    resetPayment,
  } = useLightningPayment({ projectTitle, presetAmount, onPaymentComplete, onPaymentFailed });

  if (paymentStatus === 'paid') {
    return (
      <LightningPaymentSuccess
        projectTitle={projectTitle}
        amountSats={invoice!.amount}
        onReset={resetPayment}
      />
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-bitcoin-orange" />
          Lightning Payment
          {nwcConnected ? (
            <span
              className={`ml-auto flex items-center gap-1 px-2 py-1 ${BADGE_COLORS.success} text-xs font-medium rounded-full`}
            >
              <Wifi className="w-3 h-3" />
              NWC
            </span>
          ) : (
            <span
              className={`ml-auto flex items-center gap-1 px-2 py-1 ${BADGE_COLORS.warning} text-xs font-medium rounded-full`}
            >
              <WifiOff className="w-3 h-3" />
              Demo
            </span>
          )}
        </CardTitle>

        {!nwcConnected && (
          <Alert className="mt-2 border-status-warning/30 bg-status-warning-subtle">
            <AlertTriangle className="h-4 w-4 text-status-warning" />
            <AlertDescription className="text-status-warning text-sm">
              <strong>Demo Mode</strong> — Invoices are simulated.{' '}
              <Link href={ROUTES.SETTINGS} className="text-status-warning underline font-medium">
                Connect your wallet
              </Link>{' '}
              via NWC to make real Lightning payments.
            </AlertDescription>
          </Alert>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {!invoice ? (
          <LightningInvoiceForm
            amount={amount}
            setAmount={setAmount}
            message={message}
            setMessage={setMessage}
            displayCurrency={displayCurrency}
            isGenerating={isGenerating}
            onGenerate={generateInvoice}
          />
        ) : (
          <LightningInvoiceDisplay
            invoice={invoice}
            paymentStatus={paymentStatus}
            timeLeft={timeLeft}
            copied={copied}
            nwcConnected={nwcConnected}
            onCopy={copyInvoice}
            onReset={resetPayment}
          />
        )}
      </CardContent>
    </Card>
  );
}
