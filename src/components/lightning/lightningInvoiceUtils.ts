import { toast } from 'sonner';
import { NWCClient } from '@/lib/nostr/nwc';
import type { PaymentStatus } from '@/services/bitcoin/types';

export interface Invoice {
  bolt11: string;
  paymentHash: string;
  expiresAt: Date;
  amount: number; // satoshis
  description: string;
}

interface GenerateNWCParams {
  amountSats: number;
  description: string;
  nwcUri: string;
  setInvoice: (inv: Invoice) => void;
  setPaymentStatus: (s: PaymentStatus | 'checking') => void;
  onPaymentFailed?: (error: string) => void;
  startPaymentPolling: (paymentHash: string) => void;
}

export async function generateNWCInvoice({
  amountSats,
  description,
  nwcUri,
  setInvoice,
  setPaymentStatus,
  onPaymentFailed,
  startPaymentPolling,
}: GenerateNWCParams): Promise<void> {
  const client = new NWCClient(nwcUri);
  try {
    await client.connect();
    const nwcInvoice = await client.makeInvoice(amountSats, description, 3600);
    const inv: Invoice = {
      bolt11: nwcInvoice.invoice,
      paymentHash: nwcInvoice.payment_hash,
      expiresAt: new Date(Date.now() + 3600 * 1000),
      amount: amountSats,
      description,
    };
    setInvoice(inv);
    setPaymentStatus('pending');
    toast.success('Lightning invoice created!');
    startPaymentPolling(nwcInvoice.payment_hash);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to create invoice';
    toast.error(msg);
    onPaymentFailed?.(msg);
  } finally {
    client.disconnect();
  }
}

interface GenerateDemoParams {
  amountSats: number;
  description: string;
  setInvoice: (inv: Invoice) => void;
  setPaymentStatus: (s: PaymentStatus | 'checking') => void;
}

export async function generateDemoInvoice({
  amountSats,
  description,
  setInvoice,
  setPaymentStatus,
}: GenerateDemoParams): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 800));
  const demoInvoice: Invoice = {
    bolt11: `lnbc${amountSats}u1p${Math.random().toString(36).substring(2, 60)}`,
    paymentHash: `demo_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    amount: amountSats,
    description,
  };
  setInvoice(demoInvoice);
  setPaymentStatus('pending');
  toast.info('Demo invoice generated (connect NWC for real payments)');
}
