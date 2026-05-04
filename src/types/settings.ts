/**
 * Currency types used throughout the UI.
 * Currency derives from the SSOT in @/config/currencies.
 * These exports remain here because 14+ UI files import from this path.
 */

import type { CurrencyCode } from '@/config/currencies';

export type Currency = CurrencyCode;
export type FiatCurrency = Exclude<Currency, 'BTC' | 'SATS'>;
export type CryptoCurrency = Extract<Currency, 'BTC' | 'SATS'>;

export const FIAT_CURRENCIES: FiatCurrency[] = ['CHF', 'EUR', 'USD', 'GBP'];
export const CRYPTO_CURRENCIES: CryptoCurrency[] = ['BTC', 'SATS'];
export const ALL_CURRENCIES: Currency[] = [...FIAT_CURRENCIES, ...CRYPTO_CURRENCIES];
