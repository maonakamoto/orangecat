/**
 * Unit tests for the synchronous currency conversion module.
 *
 * Covers BTC<->SATS arithmetic, BTC<->fiat conversion against the seeded rate
 * cache, the round-trip identity, and — critically — the safe-failure behavior
 * when a currency has no known rate (must return 0, never fabricate a value).
 */

import {
  satsToBitcoin,
  bitcoinToSats,
  convertBtcTo,
  convertToBtc,
  convert,
} from '@/services/currency/conversion';
import { cache } from '@/services/currency/rates';

// Silence the warn that the missing-rate path emits.
jest.mock('@/utils/logger', () => ({
  logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

const SATS_PER_BTC = 100_000_000;

describe('BTC <-> SATS', () => {
  it('satsToBitcoin divides by 100M', () => {
    expect(satsToBitcoin(SATS_PER_BTC)).toBe(1);
    expect(satsToBitcoin(50_000_000)).toBe(0.5);
    expect(satsToBitcoin(0)).toBe(0);
  });

  it('bitcoinToSats multiplies by 100M and rounds', () => {
    expect(bitcoinToSats(1)).toBe(SATS_PER_BTC);
    expect(bitcoinToSats(0.5)).toBe(50_000_000);
    // Floating point: 0.1 BTC -> exactly 10,000,000 sats (rounded, not 9999999.9)
    expect(bitcoinToSats(0.1)).toBe(10_000_000);
  });

  it('round-trips sats -> btc -> sats', () => {
    expect(bitcoinToSats(satsToBitcoin(123_456_789))).toBe(123_456_789);
  });
});

describe('convertBtcTo', () => {
  it('returns the amount unchanged for BTC', () => {
    expect(convertBtcTo(0.5, 'BTC')).toBe(0.5);
  });

  it('converts BTC to SATS (rounded integer)', () => {
    expect(convertBtcTo(0.001, 'SATS')).toBe(100_000);
  });

  it('converts BTC to a seeded fiat using the cached rate', () => {
    const rate = cache.rates['BTC_CHF'];
    expect(convertBtcTo(2, 'CHF')).toBe(2 * rate);
  });

  it('returns 0 for an unsupported currency (never fabricates)', () => {
    expect(convertBtcTo(1, 'JPY')).toBe(0);
  });
});

describe('convertToBtc', () => {
  it('returns the amount unchanged for BTC', () => {
    expect(convertToBtc(0.5, 'BTC')).toBe(0.5);
  });

  it('converts SATS to BTC', () => {
    expect(convertToBtc(100_000, 'SATS')).toBe(0.001);
  });

  it('converts a seeded fiat to BTC using the cached rate', () => {
    const rate = cache.rates['BTC_USD'];
    expect(convertToBtc(rate, 'USD')).toBe(1);
  });

  it('returns 0 for an unsupported currency — must NOT treat fiat as BTC', () => {
    // The bug this guards against: `amount / 1` rendering "100 JPY" as "100 BTC".
    expect(convertToBtc(100, 'JPY')).toBe(0);
  });
});

describe('convert (fiat <-> fiat via BTC)', () => {
  it('returns the amount unchanged when currencies match', () => {
    expect(convert(42, 'CHF', 'CHF')).toBe(42);
  });

  it('round-trips CHF -> BTC -> CHF without drift', () => {
    const out = convert(convert(100, 'CHF', 'BTC'), 'BTC', 'CHF');
    expect(out).toBeCloseTo(100, 6);
  });

  it('converts between two seeded fiats consistently with the rates', () => {
    const usd = 100;
    const expectedChf = (usd / cache.rates['BTC_USD']) * cache.rates['BTC_CHF'];
    expect(convert(usd, 'USD', 'CHF')).toBeCloseTo(expectedChf, 8);
  });

  it('yields 0 when either leg has no rate', () => {
    expect(convert(100, 'JPY', 'CHF')).toBe(0);
    expect(convert(100, 'CHF', 'JPY')).toBe(0);
  });
});
