'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useNostr } from '@/hooks/useNostr';
import { NWCClient } from '@/lib/nostr/nwc';
import type { PaymentStatus } from '@/services/bitcoin/types';

export interface Invoice {
  bolt11: string;
  paymentHash: string;
  expiresAt: Date;
  amount: number; // satoshis
  description: string;
}

interface UseLightningPaymentOptions {
  projectTitle: string;
  presetAmount?: number;
  onPaymentComplete?: (paymentHash: string) => void;
  onPaymentFailed?: (error: string) => void;
}

export function useLightningPayment({
  projectTitle,
  presetAmount,
  onPaymentComplete,
  onPaymentFailed,
}: UseLightningPaymentOptions) {
  const { nwcConnected, getNWCUri } = useNostr();

  const [amount, setAmount] = useState(presetAmount?.toString() || '');
  const [message, setMessage] = useState('');
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | 'checking'>('pending');
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [pollInterval, setPollInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!invoice) {
      return;
    }

    const updateTimer = () => {
      const timeRemaining = invoice.expiresAt.getTime() - Date.now();
      if (timeRemaining <= 0) {
        setPaymentStatus('expired');
        setTimeLeft(0);
        return;
      }
      setTimeLeft(Math.floor(timeRemaining / 1000));
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [invoice]);

  useEffect(() => {
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [pollInterval]);

  const startPaymentPolling = useCallback(
    (paymentHash: string) => {
      const nwcUri = getNWCUri();
      if (!nwcUri) {
        return;
      }

      const client = new NWCClient(nwcUri);

      const interval = setInterval(async () => {
        try {
          const result = await client.lookupInvoice(paymentHash);
          if (result.settled_at) {
            setPaymentStatus('paid');
            clearInterval(interval);
            client.disconnect();
            onPaymentComplete?.(paymentHash);
            toast.success('Payment received!');
          }
        } catch {
          /* best-effort poll */
        }
      }, 3000);

      setPollInterval(interval);
      setTimeout(
        () => {
          clearInterval(interval);
          client.disconnect();
        },
        60 * 60 * 1000
      );
    },
    [getNWCUri, onPaymentComplete]
  );

  const generateNWCInvoice = async () => {
    const nwcUri = getNWCUri();
    if (!nwcUri) {
      return;
    }

    const amountSats = parseInt(amount);
    const description = `${projectTitle} - ${message || 'Lightning payment'}`;
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
  };

  const generateDemoInvoice = async () => {
    await new Promise(resolve => setTimeout(resolve, 800));

    const amountSats = parseInt(amount);
    const description = `${projectTitle} - ${message || 'Lightning payment'}`;

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
  };

  const generateInvoice = async () => {
    if (!amount || parseInt(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsGenerating(true);
    try {
      if (nwcConnected) {
        await generateNWCInvoice();
      } else {
        await generateDemoInvoice();
      }
    } catch {
      toast.error('Failed to generate invoice');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyInvoice = async () => {
    if (!invoice) {
      return;
    }
    try {
      await navigator.clipboard.writeText(invoice.bolt11);
      setCopied(true);
      toast.success('Invoice copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const resetPayment = () => {
    if (pollInterval) {
      clearInterval(pollInterval);
    }
    setInvoice(null);
    setPaymentStatus('pending');
    setTimeLeft(null);
    setPollInterval(null);
  };

  return {
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
  };
}
