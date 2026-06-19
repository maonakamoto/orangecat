/**
 * useDisplayCurrency — the SSOT money-display path used across the UI.
 *
 * Locks in the branching that decides how an amount is rendered: zero handling
 * per unit, fiat conversion, sats/BTC modes, forceSats, showBoth, and the
 * rates-still-loading fallback to sats (so the UI never flashes a wrong fiat
 * number before rates arrive).
 */

import { renderHook } from '@testing-library/react';
import { useDisplayCurrency } from '@/hooks/useDisplayCurrency';

// Mutable so each test can pick a display currency / loading state.
let mockCurrency = 'CHF';
let mockIsLoading = false;
const CHF_PER_BTC = 86000;

jest.mock('@/hooks/useUserCurrency', () => ({
  useUserCurrency: () => mockCurrency,
}));
jest.mock('@/hooks/useCurrencyConversion', () => ({
  useCurrencyConversion: () => ({
    isLoading: mockIsLoading,
    convertFromBTC: (btc: number, currency: string) =>
      currency === 'CHF' ? btc * CHF_PER_BTC : 0,
    convertToBTC: (amount: number) => amount / CHF_PER_BTC,
  }),
}));

beforeEach(() => {
  mockCurrency = 'CHF';
  mockIsLoading = false;
});

describe('useDisplayCurrency', () => {
  it('formats BTC into the user fiat currency', () => {
    const { result } = renderHook(() => useDisplayCurrency());
    // 0.001 BTC * 86,000 = CHF 86
    expect(result.current.formatAmountBtc(0.001)).toBe('CHF 86.00');
    expect(result.current.prefersFiat).toBe(true);
  });

  it('renders zero per unit', () => {
    mockCurrency = 'CHF';
    const chf = renderHook(() => useDisplayCurrency());
    expect(chf.result.current.formatSats(0)).toBe('CHF 0.00');

    mockCurrency = 'SATS';
    const sats = renderHook(() => useDisplayCurrency());
    expect(sats.result.current.formatSats(0)).toBe('0 sat');

    mockCurrency = 'BTC';
    const btc = renderHook(() => useDisplayCurrency());
    expect(btc.result.current.formatSats(0)).toBe('₿0');
  });

  it('respects forceSats regardless of preference', () => {
    mockCurrency = 'CHF';
    const { result } = renderHook(() => useDisplayCurrency());
    expect(result.current.formatSats(100_000, { forceSats: true })).toBe('100,000 sat');
  });

  it('renders sats preference as raw sats', () => {
    mockCurrency = 'SATS';
    const { result } = renderHook(() => useDisplayCurrency());
    expect(result.current.formatSats(100_000)).toBe('100,000 sat');
  });

  it('renders BTC preference with the ₿ symbol', () => {
    mockCurrency = 'BTC';
    const { result } = renderHook(() => useDisplayCurrency());
    expect(result.current.formatAmountBtc(0.001)).toBe('₿0.001');
  });

  it('falls back to sats while rates are loading (no wrong fiat flash)', () => {
    mockCurrency = 'CHF';
    mockIsLoading = true;
    const { result } = renderHook(() => useDisplayCurrency());
    expect(result.current.formatSats(100_000)).toBe('100,000 sat');
    expect(result.current.isLoading).toBe(true);
  });

  it('shows both fiat and sats when requested', () => {
    mockCurrency = 'CHF';
    const { result } = renderHook(() => useDisplayCurrency());
    expect(result.current.formatSats(100_000, { showBoth: true })).toBe('CHF 86.00 (100,000 sat)');
  });
});
