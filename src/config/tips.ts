/**
 * Tips — SSOT for the Bitcoin tipping surface.
 *
 * A tip is an UNCONDITIONAL Bitcoin gift from one person to another. It settles
 * NON-CUSTODIALLY: OrangeCat generates a payment request against the recipient's
 * OWN wallet (NWC / Lightning address / on-chain) and never touches the funds.
 * Zero platform fee — the tipper pays exactly the amount they choose.
 *
 * v1 shows the payment request (QR + copy) so any Bitcoin wallet can pay it; it
 * does not record the tip server-side (that needs a schema change). Keep the copy
 * honest: we help you pay the writer directly, we don't hold or take a cut.
 */

import { CONTRIBUTION_QUICK_AMOUNTS_BTC, DEFAULT_CONTRIBUTION_BTC } from './payment-presets';

/** Quick-pick amounts (BTC). Reuses the contribution presets for consistency. */
export const TIP_QUICK_AMOUNTS_BTC = CONTRIBUTION_QUICK_AMOUNTS_BTC;

export const DEFAULT_TIP_BTC = DEFAULT_CONTRIBUTION_BTC;

/** Sane bounds — a positive amount, capped to avoid fat-finger disasters. */
export const TIP_MIN_BTC = 0.000001;
export const TIP_MAX_BTC = 1;

export const TIP_COPY = {
  button: 'Tip',
  title: (name: string) => `Tip ${name}`,
  subtitle: 'Send a Bitcoin gift, paid straight to their wallet.',
  amountLabel: 'Amount',
  custom: 'Custom',
  generate: 'Show tip QR',
  generating: 'Preparing…',
  scan: 'Scan with any Bitcoin wallet to send your tip.',
  noWallet: (name: string) => `${name} hasn't set up a wallet to receive Bitcoin tips yet.`,
  /** The honesty line — non-custodial, zero fee. */
  disclaimer: 'Paid directly to them. OrangeCat takes 0% and never touches your funds.',
  again: 'Change amount',
  done: 'Done',
} as const;
