/**
 * PublicPayPanel — let anyone pay an entity in Bitcoin without an account.
 *
 * Permissionless participation is a core principle: a logged-out visitor must
 * be able to send sats. The seller's receiving address is public data (the same
 * address the profile page already shows), so this reveals it with a baked-in
 * amount, a QR, and an open-in-wallet link. The payer settles directly from
 * their own wallet — non-custodial, no sign-up.
 *
 * Only renders for sellers with a static address (on-chain or Lightning
 * address). NWC-only sellers have no static address to reveal — the caller
 * falls back to the sign-in/invoice flow for those.
 */

'use client';

import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';
import { Bitcoin, Zap, Copy, Check, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { useDisplayCurrency } from '@/hooks/useDisplayCurrency';

interface PublicPayPanelProps {
  entityTitle: string;
  /** Contribution entities accept any amount; fixed-price bake the amount in. */
  isContribution: boolean;
  /** Price in its own currency (fixed-price entities). */
  priceAmount?: number;
  /** Currency of priceAmount (e.g. 'CHF'); omitted/'BTC' → BTC. */
  priceCurrency?: string;
  /** BTC-converted amount for the BIP21 URI (0/undefined → payer chooses). */
  amountBtc?: number;
  /** Receiving method — drives icon, label, and URI scheme. */
  method: 'onchain' | 'lightning_address';
  /** The receiving address to reveal. */
  address: string;
  /** Sign-in link for the optional "track your order" affordance. */
  signInHref: string;
}

function truncateMiddle(value: string, head = 12, tail = 10): string {
  return value.length <= head + tail + 1 ? value : `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export function PublicPayPanel({
  entityTitle,
  isContribution,
  priceAmount,
  priceCurrency,
  amountBtc,
  method,
  address,
  signInHref,
}: PublicPayPanelProps) {
  const { formatPrice, formatAmountBtc } = useDisplayCurrency();
  const { copied, copy } = useCopyToClipboard();

  const isOnchain = method === 'onchain';
  const Icon = isOnchain ? Bitcoin : Zap;

  // Build the payment URI. On-chain uses BIP21 with the amount + label baked in;
  // a Lightning address is paid via the lightning: scheme (wallet prompts for
  // the amount, which we also show on screen).
  const paymentUri = (() => {
    if (isOnchain) {
      const params = new URLSearchParams();
      if (amountBtc && amountBtc > 0) {
        params.set('amount', amountBtc.toFixed(8).replace(/\.?0+$/, ''));
      }
      if (entityTitle) {
        params.set('label', entityTitle);
      }
      const query = params.toString();
      return `bitcoin:${address}${query ? `?${query}` : ''}`;
    }
    return `lightning:${address}`;
  })();

  const hasFixedAmount = !isContribution && priceAmount !== undefined && priceAmount > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="h-5 w-5 text-bitcoinOrange" />
          Pay with Bitcoin
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasFixedAmount ? (
          <div className="flex items-baseline justify-between">
            <span className="text-fg-secondary">Amount</span>
            <span className="text-lg font-bold text-fg-primary">
              {formatPrice(priceAmount as number, priceCurrency)}
              {amountBtc && amountBtc > 0 && priceCurrency && priceCurrency !== 'BTC' && (
                <span className="ml-2 text-sm font-normal text-fg-secondary">
                  ≈ {formatAmountBtc(amountBtc)}
                </span>
              )}
            </span>
          </div>
        ) : (
          <p className="text-sm text-fg-secondary">Send any amount in Bitcoin to support this.</p>
        )}

        <div className="flex justify-center rounded-lg border border-default bg-surface-base p-4">
          <QRCodeSVG value={paymentUri} size={192} level="M" />
        </div>

        <div className="space-y-1">
          <span className="text-xs text-fg-secondary">
            {isOnchain ? 'On-chain Bitcoin address' : 'Lightning address'}
          </span>
          <button
            type="button"
            onClick={() => copy(address)}
            className="flex w-full items-center justify-between gap-2 rounded-lg border border-default bg-surface-raised/40 px-3 py-2 text-left hover:bg-surface-raised/70"
            aria-label="Copy receiving address"
          >
            <span className="min-w-0 truncate font-mono text-sm text-fg-primary">
              {truncateMiddle(address)}
            </span>
            {copied ? (
              <Check className="h-4 w-4 shrink-0 text-status-positive" />
            ) : (
              <Copy className="h-4 w-4 shrink-0 text-fg-secondary" />
            )}
          </button>
        </div>

        <a
          href={paymentUri}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-bitcoinOrange px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-bitcoinOrange/90 min-h-11"
        >
          <ExternalLink className="h-4 w-4" />
          Open in wallet
        </a>

        <p className="text-xs text-fg-secondary text-center">
          Pay directly from any Bitcoin wallet — no account needed.
        </p>
        <p className="text-xs text-fg-tertiary text-center">
          Have an account?{' '}
          <Link href={signInHref} className="underline hover:text-fg-secondary">
            Sign in to track your order
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
