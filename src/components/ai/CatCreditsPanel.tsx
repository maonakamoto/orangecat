'use client';

/**
 * CatCreditsPanel — your Bitcoin-paid Cat credit balance + ledger history.
 *
 * Phase 1: read-only. Shows the sats balance (the canonical unit — Bitcoin
 * Orange applies) with the user's display-currency equivalent, plus the ledger.
 * "Top up" is shown but disabled until platform Lightning-receiving infra is
 * provisioned (Phase 2). See docs/architecture/CAT_CREDITS.md.
 */

import { useCallback, useEffect, useState } from 'react';
import { Coins, Loader2, AlertCircle, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useDisplayCurrency } from '@/hooks/useDisplayCurrency';
import { logger } from '@/utils/logger';

interface CreditEntry {
  id: string;
  kind: 'topup' | 'usage' | 'grant' | 'refund' | 'adjustment';
  amount_sats: number;
  balance_after: number;
  created_at: string;
}

const KIND_LABELS: Record<CreditEntry['kind'], string> = {
  topup: 'Top-up',
  usage: 'Cat usage',
  grant: 'Included credit',
  refund: 'Refund',
  adjustment: 'Adjustment',
};

export function CatCreditsPanel() {
  const { formatSats } = useDisplayCurrency();
  const [balanceSats, setBalanceSats] = useState(0);
  const [entries, setEntries] = useState<CreditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/cat/credits');
      if (!res.ok) {
        throw new Error('Failed to load credits');
      }
      const json = await res.json();
      setBalanceSats(json?.data?.balanceSats ?? 0);
      setEntries((json?.data?.entries ?? []) as CreditEntry[]);
    } catch (err) {
      logger.error('Failed to load cat credits', err, 'CatCredits');
      setError('Could not load your credits. Try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="rounded-lg border border-default bg-surface-base p-6">
      <div className="mb-4 flex items-start gap-3">
        <div className="rounded-md bg-surface-raised p-2">
          <Coins className="h-5 w-5 text-bitcoinOrange" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-fg-primary">Cat Credits</h2>
          <p className="mt-1 text-sm text-fg-secondary">
            Pay with Bitcoin to run Cat on frontier models — no card, no per-provider accounts.
            Credits are priced near cost; OrangeCat earns from platform activity, not your AI bill.
          </p>
        </div>
      </div>

      {/* Balance */}
      <div className="mb-4 flex items-center justify-between rounded-md border border-subtle bg-surface-raised/30 p-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-fg-tertiary">Balance</p>
          {isLoading ? (
            <Loader2 className="mt-1 h-5 w-5 animate-spin text-fg-secondary" />
          ) : (
            <p className="mt-0.5 text-2xl font-semibold text-bitcoinOrange">
              {balanceSats.toLocaleString('en-US')}{' '}
              <span className="text-base font-normal text-fg-secondary">sats</span>
            </p>
          )}
          {!isLoading && balanceSats > 0 && (
            <p className="text-xs text-fg-tertiary">≈ {formatSats(balanceSats)}</p>
          )}
        </div>
        <button
          type="button"
          disabled
          title="Lightning top-up is coming soon"
          className="cursor-not-allowed rounded-md border border-subtle px-4 py-2 text-sm font-medium text-fg-tertiary opacity-60"
        >
          Top up (soon)
        </button>
      </div>

      {/* History */}
      {error ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-subtle bg-surface-raised/30 p-4">
          <span className="flex items-center gap-2 text-sm text-status-negative">
            <AlertCircle className="h-4 w-4" /> {error}
          </span>
          <button
            type="button"
            onClick={load}
            className="rounded-md border border-subtle px-3 py-1.5 text-sm text-fg-secondary hover:bg-surface-raised"
          >
            Retry
          </button>
        </div>
      ) : isLoading ? null : entries.length === 0 ? (
        <p className="text-sm text-fg-tertiary">
          No credit activity yet. Once top-up is live, your purchases and Cat usage show here.
        </p>
      ) : (
        <ul className="divide-y divide-border-subtle">
          {entries.map(e => {
            const credit = e.amount_sats >= 0;
            return (
              <li key={e.id} className="flex items-center justify-between py-2 text-sm">
                <span className="flex items-center gap-2 text-fg-primary">
                  {credit ? (
                    <ArrowDownLeft className="h-4 w-4 text-status-positive" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4 text-fg-tertiary" />
                  )}
                  {KIND_LABELS[e.kind]}
                  <span className="text-fg-tertiary">
                    {new Date(e.created_at).toLocaleDateString()}
                  </span>
                </span>
                <span className={credit ? 'text-status-positive' : 'text-fg-secondary'}>
                  {credit ? '+' : ''}
                  {e.amount_sats.toLocaleString('en-US')} sats
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default CatCreditsPanel;
