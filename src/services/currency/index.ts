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

export { getRate, currencyConverter, convertToBTC, convertFromBTC } from './rates';

export { satsToBitcoin, bitcoinToSats, convertBtcTo, convertToBtc, convert } from './conversion';

export {
  formatCurrency,
  formatBitcoinDisplay,
  formatBTC,
  displayBTC,
  formatSats,
} from './formatting';

export { parseAmount, validateAmount, parseBTCAmount, validateBTCAmount } from './validation';
