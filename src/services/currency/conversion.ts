/**
 * Currency Conversion Functions
 *
 * Synchronous conversion between BTC, sats, and fiat currencies.
 */

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
  const rate = cache.rates[`BTC_${targetCurrency}`] || 0;
  return amount * rate;
}

export function convertToBtc(amount: number, fromCurrency: string): number {
  if (fromCurrency === 'BTC') {
    return amount;
  }
  if (fromCurrency === 'SATS') {
    return amount / SATS_PER_BTC;
  }
  const rate = cache.rates[`BTC_${fromCurrency}`] || 1;
  return amount / rate;
}

export function convert(amount: number, fromCurrency: string, toCurrency: string): number {
  if (fromCurrency === toCurrency) {
    return amount;
  }
  const btc = convertToBtc(amount, fromCurrency);
  return convertBtcTo(btc, toCurrency);
}
