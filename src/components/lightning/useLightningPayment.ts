'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useNostr } from '@/hooks/useNostr';
import { NWCClient } from '@/lib/nostr/nwc';
import type { PaymentStatus } from '@/services/bitcoin/types';
import { generateNWCInvoice, generateDemoInvoice, type Invoice } from './lightningInvoiceUtils';
export type { Invoice } from './lightningInvoiceUtils';

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

  const generateInvoice = async () => {
    if (!amount || parseInt(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    setIsGenerating(true);
    const amountSats = parseInt(amount);
    const description = `${projectTitle} - ${message || 'Lightning payment'}`;
    try {
      if (nwcConnected) {
        const nwcUri = getNWCUri();
        if (nwcUri) {
          await generateNWCInvoice({
            amountSats,
            description,
            nwcUri,
            setInvoice,
            setPaymentStatus,
            onPaymentFailed,
            startPaymentPolling,
          });
        }
      } else {
        await generateDemoInvoice({ amountSats, description, setInvoice, setPaymentStatus });
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
