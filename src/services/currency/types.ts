/**
 * Currency Service Types
 */

export interface ExchangeRates {
  btcToChf: number;
  btcToUsd: number;
  btcToEur: number;
  lastUpdated: number;
}

export interface RateCache {
  rates: Record<string, number>;
  lastUpdated: Date | null;
  expiresAt: Date | null;
}
