'use client';

import { Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { CurrencyDisplay } from '@/components/ui/CurrencyDisplay';

interface LightningPaymentSuccessProps {
  projectTitle: string;
  amountSats: number;
  onReset: () => void;
}

export function LightningPaymentSuccess({
  projectTitle,
  amountSats,
  onReset,
}: LightningPaymentSuccessProps) {
  return (
    <Card className="text-center">
      <CardContent className="p-6">
        <div className="w-16 h-16 bg-status-positive-subtle rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-status-positive" />
        </div>
        <h3 className="text-lg font-semibold text-fg-primary mb-2">Payment Received!</h3>
        <p className="text-fg-secondary mb-4">
          Thank you for supporting {projectTitle} with your Lightning payment.
        </p>
        <CurrencyDisplay
          amount={amountSats}
          currency="SATS"
          className="text-lg font-semibold text-status-positive"
        />
        <Button onClick={onReset} variant="outline" className="mt-4">
          Make Another Payment
        </Button>
      </CardContent>
    </Card>
  );
}
