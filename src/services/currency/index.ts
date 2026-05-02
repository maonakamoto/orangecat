/**
 * CURRENCY SERVICE — thin re-export barrel.
 *
 * Sub-modules are the SSOT:
 *   types.ts       — shared interfaces
 *   rates.ts       — rate cache, CoinGecko service, async helpers
 *   conversion.ts  — sync BTC/fiat/sats conversions
 *   formatting.ts  — display formatting functions
 *   validation.ts  — input parsing and amount validation
 */

export type { ExchangeRates, RateCache, CurrencyBreakdown, CurrencyConversion } from './types';

export {
  updateRates,
  getRate,
  fetchRates,
  ratesNeedRefresh,
  currencyConverter,
  convertToBTC,
  convertFromBTC,
  convertCurrencyAsync,
  useBitcoinPrice,
} from './rates';

export {
  satsToBitcoin,
  bitcoinToSats,
  satsToBTC,
  satsToBtc,
  btcToSats,
  satoshisToBitcoin,
  bitcoinToSatoshis,
  convertBtcTo,
  convertToBtc,
  convert,
  convertCurrency,
  getCurrencyBreakdown,
  convertBitcoinToAll,
  convertSatsToAll,
} from './conversion';

export {
  formatCurrency,
  formatBitcoinDisplay,
  formatBTC,
  displayBTC,
  formatSats,
  formatSwissFrancs,
  formatUSD,
  getRegionName,
  getRegionEmoji,
  formatRegionalAlternatives,
} from './formatting';

export { parseAmount, validateAmount, parseBTCAmount, validateBTCAmount } from './validation';

// ==================== CONVENIENCE BUNDLE ====================

import {
  convertBtcTo,
  convertToBtc,
  convert,
  getCurrencyBreakdown,
  convertBitcoinToAll,
  convertSatsToAll,
  satsToBitcoin,
  bitcoinToSats,
} from './conversion';
import {
  formatCurrency,
  formatBitcoinDisplay,
  formatBTC,
  formatSats,
  formatSwissFrancs,
  formatUSD,
  getRegionName,
  getRegionEmoji,
  formatRegionalAlternatives,
} from './formatting';
import { getRate, updateRates, fetchRates, ratesNeedRefresh, useBitcoinPrice } from './rates';
import { parseAmount, validateAmount } from './validation';

export const currencyService = {
  convertBtcTo,
  convertToBtc,
  convert,
  formatCurrency,
  getCurrencyBreakdown,
  getRate,
  updateRates,
  fetchRates,
  ratesNeedRefresh,
  parseAmount,
  validateAmount,
  satsToBitcoin,
  bitcoinToSats,
  formatBitcoinDisplay,
  formatSwissFrancs,
  formatBTC,
  formatSats,
  formatUSD,
  convertBitcoinToAll,
  convertSatsToAll,
  getRegionName,
  getRegionEmoji,
  formatRegionalAlternatives,
  useBitcoinPrice,
};

export default currencyService;
