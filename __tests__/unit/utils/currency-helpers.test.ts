import {
  isBitcoinNativeCurrency,
  isFiatCurrency,
  getGoalExplanation,
} from '@/utils/currency-helpers';
import type { Currency } from '@/types/settings';

describe('isBitcoinNativeCurrency', () => {
  it('returns true for BTC', () => {
    expect(isBitcoinNativeCurrency('BTC')).toBe(true);
  });

  it('returns false for SATS — satoshis are not a product currency', () => {
    // @ts-expect-error SATS was removed from CurrencyCode (2026-07-02)
    expect(isBitcoinNativeCurrency('SATS')).toBe(false);
  });

  it('returns false for CHF', () => {
    expect(isBitcoinNativeCurrency('CHF')).toBe(false);
  });

  it('returns false for USD', () => {
    expect(isBitcoinNativeCurrency('USD')).toBe(false);
  });

  it('returns false for EUR', () => {
    expect(isBitcoinNativeCurrency('EUR')).toBe(false);
  });

  it('returns false for GBP', () => {
    expect(isBitcoinNativeCurrency('GBP')).toBe(false);
  });
});

describe('isFiatCurrency', () => {
  it('returns true for CHF', () => {
    expect(isFiatCurrency('CHF')).toBe(true);
  });

  it('returns true for USD', () => {
    expect(isFiatCurrency('USD')).toBe(true);
  });

  it('returns true for EUR', () => {
    expect(isFiatCurrency('EUR')).toBe(true);
  });

  it('returns true for GBP', () => {
    expect(isFiatCurrency('GBP')).toBe(true);
  });

  it('returns false for BTC', () => {
    expect(isFiatCurrency('BTC')).toBe(false);
  });

  it('returns false for BTC-only edge', () => {
    expect(isFiatCurrency('BTC')).toBe(false);
  });
});

describe('getGoalExplanation', () => {
  const currencies: Currency[] = ['BTC', 'CHF', 'USD', 'EUR', 'GBP'];

  // Verify no thrown errors and always returns a non-empty string
  for (const currency of currencies) {
    for (const isGoal of [true, false]) {
      it(`returns a string for currency=${currency} isGoal=${isGoal}`, () => {
        const result = getGoalExplanation(currency, isGoal);
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      });
    }
  }

  // Verify default isGoal=true branch is exercised when omitted
  it('uses isGoal=true by default', () => {
    const withDefault = getGoalExplanation('BTC');
    const withExplicit = getGoalExplanation('BTC', true);
    expect(withDefault).toBe(withExplicit);
  });

  // Verify content differentiation between BTC and fiat
  it('returns a Bitcoin-native message for BTC with isGoal=true', () => {
    expect(getGoalExplanation('BTC', true)).toMatch(/bitcoin/i);
  });

  it('returns a fiat message for CHF with isGoal=true', () => {
    expect(getGoalExplanation('CHF', true)).toMatch(/fiat/i);
  });

  it('returns different strings for isGoal=true vs isGoal=false (BTC)', () => {
    expect(getGoalExplanation('BTC', true)).not.toBe(getGoalExplanation('BTC', false));
  });

  it('returns different strings for isGoal=true vs isGoal=false (CHF)', () => {
    expect(getGoalExplanation('CHF', true)).not.toBe(getGoalExplanation('CHF', false));
  });
});
