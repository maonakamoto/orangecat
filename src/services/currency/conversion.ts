/**
 * Currency Conversion Functions
 *
 * Synchronous conversion between BTC, sats, and fiat currencies.
 *
 * These read the in-memory `cache.rates`, which is seeded with sane defaults for
 * every supported fiat (USD/EUR/CHF/GBP) and refreshed from the API. A missing
 * rate therefore means an *unsupported* currency code — we must NOT fabricate a
 * value. Fabricating is a money-correctness bug: `amount / 1` would render e.g.
 * "100 CHF" as "100 BTC". For an unknown rate we fail safe to 0 and warn.
 */

import { logger } from '@/utils/logger';
import { cache } from './rates';

const SATS_PER_BTC = 100_000_000;

// ==================== BTC <-> SATS ====================

export function satsToBitcoin(sats: number): number {
  return sats / SATS_PER_BTC;
}

export function bitcoinToSats(bitcoin: number): number {
  return Math.round(bitcoin * SATS_PER_BTC);
}

// ==================== CORE CONVERSION ====================

export function convertBtcTo(amount: number, targetCurrency: string): number {
  if (targetCurrency === 'BTC') {
    return amount;
  }
  if (targetCurrency === 'SATS') {
    return Math.round(amount * SATS_PER_BTC);
  }
  const rate = cache.rates[`BTC_${targetCurrency}`];
  if (!rate) {
    logger.warn('No BTC rate for currency; cannot convert', { targetCurrency }, 'Currency');
    return 0;
  }
  return amount * rate;
}

export function convertToBtc(amount: number, fromCurrency: string): number {
  if (fromCurrency === 'BTC') {
    return amount;
  }
  if (fromCurrency === 'SATS') {
    return amount / SATS_PER_BTC;
  }
  const rate = cache.rates[`BTC_${fromCurrency}`];
  if (!rate) {
    // Fail safe to 0 — never treat an unpriced fiat amount as if it were BTC.
    logger.warn('No BTC rate for currency; cannot convert', { fromCurrency }, 'Currency');
    return 0;
  }
  return amount / rate;
}

export function convert(amount: number, fromCurrency: string, toCurrency: string): number {
  if (fromCurrency === toCurrency) {
    return amount;
  }
  const btc = convertToBtc(amount, fromCurrency);
  return convertBtcTo(btc, toCurrency);
}
