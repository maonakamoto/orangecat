/**
 * USE DISPLAY CURRENCY HOOK
 *
 * Provides formatting of sats amounts in the user's preferred display currency.
 * Combines useUserCurrency + useCurrencyConversion + formatCurrency in one hook.
 *
 * This is the RECOMMENDED way to display prices/amounts in components.
 * It respects the user's currency preference (defaults to CHF).
 *
 * Created: 2026-01-28
 * Last Modified: 2026-01-28
 * Last Modified Summary: Initial implementation for SSOT currency display
 */

'use client';

import { useCallback } from 'react';
import { useUserCurrency } from './useUserCurrency';
import { isFiatCurrency } from '@/utils/currency-helpers';
import { useCurrencyConversion } from './useCurrencyConversion';
import { formatCurrency, satsToBitcoin, bitcoinToSats } from '@/services/currency';
import type { CurrencyCode } from '@/config/currencies';

interface DisplayCurrencyOptions {
  /** Show currency symbol (default: true) */
  showSymbol?: boolean;
  /** Compact format for large numbers (default: false) */
  compact?: boolean;
}

interface UseDisplayCurrencyReturn {
  /** Format a sats amount in user's preferred display currency. Caller must pass sats. */
  formatSats: (sats: number, options?: DisplayCurrencyOptions) => string;
  /** Format a BTC amount (database canonical unit) in user's preferred display currency. Caller must pass BTC. */
  formatAmountBtc: (btc: number, options?: DisplayCurrencyOptions) => string;
  /**
   * Format a listing price that may be denominated in fiat OR BTC. When
   * `currency` is a non-BTC fiat code, render it in that currency (entities
   * price in their own currency, not BTC); otherwise (omitted/'BTC') render as
   * a BTC amount in the user's preferred display unit.
   */
  formatPrice: (amount: number, currency?: string) => string;
  /** User's preferred display currency code */
  displayCurrency: CurrencyCode;
  /** Whether user prefers fiat (CHF/EUR/USD) vs crypto (BTC/SATS) */
  prefersFiat: boolean;
  /** Whether exchange rates are still loading */
  isLoading: boolean;
}

/**
 * Hook for displaying amounts in the user's preferred currency.
 *
 * BTC is the canonical unit on this platform — prefer `formatAmountBtc`.
 * Use `formatSats` only when the amount is already in sats (Lightning
 * protocol contexts). Picking the wrong one used to silently render ~0;
 * the explicit names compile-prevent that mistake.
 *
 * @example
 * ```tsx
 * const { formatSats, formatAmountBtc } = useDisplayCurrency();
 * <span>{formatAmountBtc(0.001)}</span>   // "CHF 86.00"
 * <span>{formatSats(100_000)}</span>      // "CHF 86.00" (same amount, different unit)
 * ```
 */
export function useDisplayCurrency(): UseDisplayCurrencyReturn {
  const displayCurrency = useUserCurrency() as CurrencyCode;
  const { convertFromBTC, isLoading } = useCurrencyConversion();
  const prefersFiat = isFiatCurrency(displayCurrency);

  const formatSats = useCallback(
    (sats: number, options: DisplayCurrencyOptions = {}): string => {
      const { showSymbol = true, compact = false } = options;

      // Handle zero/invalid amounts
      if (!sats || sats === 0) {
        if (displayCurrency === 'BTC') {
          return showSymbol ? '₿0' : '0';
        }
        return formatCurrency(0, displayCurrency, { showSymbol, compact });
      }

      // If user prefers BTC
      if (displayCurrency === 'BTC') {
        const btc = satsToBitcoin(sats);
        return formatCurrency(btc, 'BTC', { showSymbol, compact });
      }

      // Convert to user's fiat currency
      const btc = satsToBitcoin(sats);
      const fiatAmount = convertFromBTC(btc, displayCurrency);

      // Rates not loaded yet (e.g. logged-out visitors) → fall back to BTC, the
      // canonical unit — NEVER sats. Showing sats here was why public pages
      // rendered "100,000 sat" before rates arrived.
      if (isLoading || fiatAmount === 0) {
        return formatCurrency(btc, 'BTC', { showSymbol, compact });
      }

      return formatCurrency(fiatAmount, displayCurrency, { showSymbol, compact });
    },
    [displayCurrency, convertFromBTC, isLoading]
  );

  const formatAmountBtc = useCallback(
    (btc: number, options?: DisplayCurrencyOptions): string =>
      formatSats(Math.round(bitcoinToSats(btc)), options),
    [formatSats]
  );

  const formatPrice = useCallback(
    (amount: number, currency?: string): string =>
      currency && currency.toUpperCase() !== 'BTC'
        ? formatCurrency(amount, currency as CurrencyCode)
        : formatAmountBtc(amount),
    [formatAmountBtc]
  );

  return {
    formatSats,
    formatAmountBtc,
    formatPrice,
    displayCurrency,
    prefersFiat,
    isLoading,
  };
}
