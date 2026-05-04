/**
 * Currency types used throughout the UI.
 *
 * Note: @/config/currencies exports CurrencyCode which covers the same domain.
 * These types remain here because 14+ UI files import Currency from this path.
 */

export type FiatCurrency = 'CHF' | 'EUR' | 'USD' | 'GBP';
export type CryptoCurrency = 'BTC' | 'SATS';
export type Currency = FiatCurrency | CryptoCurrency;

export const FIAT_CURRENCIES: FiatCurrency[] = ['CHF', 'EUR', 'USD', 'GBP'];
export const CRYPTO_CURRENCIES: CryptoCurrency[] = ['BTC', 'SATS'];
export const ALL_CURRENCIES: Currency[] = [...FIAT_CURRENCIES, ...CRYPTO_CURRENCIES];
