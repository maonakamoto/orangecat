/**
 * Cat Credit usage metering — the spend half of Cat Credits.
 *
 * "Sell intelligence, not rails": platform P2P payments are 0% forever; the
 * platform's revenue is the margin on prepaid Cat Credits spent on
 * platform-served paid ("frontier") models. This module closes that loop:
 *
 *   top-up (credit-topup.ts) → balance (credits.ts) → SPEND (this file)
 *
 * Free-tier models stay on the daily platform quota and never touch the
 * ledger. BYOK usage is the user's own key and is never metered. Only
 * platform-served, non-free registry models are metered here.
 *
 * All amounts are BTC — the canonical unit platform-wide. Satoshis are a
 * Lightning protocol detail and never appear in this API.
 */

import type { AnySupabaseClient } from '@/lib/supabase/types';
import { calculateCostBtc, getModelMetadata, isModelFree } from '@/config/ai-models';
import { appendCreditEntry, getCreditBalance } from '@/services/cat/credits';
import { convertFromBTC } from '@/services/currency/rates';
import { logger } from '@/utils/logger';

/**
 * Platform margin on raw provider cost. The user's ledger is debited
 * cost × markup; the spread is the platform's revenue on intelligence.
 */
export const CREDIT_USAGE_MARKUP = 1.2;

/**
 * Minimum balance (BTC) required to unlock platform-served frontier models —
 * roughly one substantial exchange on a premium model, so a request never
 * starts that the balance can't plausibly cover.
 */
export const MIN_FRONTIER_BALANCE_BTC = 0.000001;

/** Round UP to the ledger precision (numeric(18,8)) so usage never bills 0. */
const ceilBtc = (n: number): number => Math.ceil(n * 1e8) / 1e8;

/**
 * True when serving `modelId` through PLATFORM keys must be metered against
 * Cat Credits: it's a known registry model and not free-tier.
 */
export function isPlatformMeteredModel(modelId: string | undefined): boolean {
  if (!modelId) {
    return false;
  }
  return Boolean(getModelMetadata(modelId)) && !isModelFree(modelId);
}

/**
 * Can this user start a platform-served frontier request?
 * Never throws; a balance-read failure reads as "no credits".
 */
export async function checkFrontierAccess(
  admin: AnySupabaseClient,
  userId: string
): Promise<{ allowed: boolean; balanceBtc: number }> {
  const balanceBtc = await getCreditBalance(admin, userId);
  return { allowed: balanceBtc >= MIN_FRONTIER_BALANCE_BTC, balanceBtc };
}

/**
 * Debit one completed frontier exchange against the user's Cat Credits.
 *
 * Charge = raw provider cost (live BTC/USD rate) × CREDIT_USAGE_MARKUP,
 * rounded up to 1e-8. Fire-and-log: the response has already been served, so
 * a failed debit is logged loudly for reconciliation, never thrown at the
 * user. Idempotent per `ref` at the ledger layer.
 *
 * @returns the debited amount in BTC (0 when nothing was billed).
 */
export async function meterCreditUsage(
  admin: AnySupabaseClient,
  userId: string,
  args: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    /** Real request cost from the provider response when available. */
    rawCostBtc?: number;
    /** Stable per-request id — the ledger idempotency ref. */
    ref: string;
    conversationId?: string | null;
  }
): Promise<number> {
  const { model, inputTokens, outputTokens, rawCostBtc, ref, conversationId } = args;
  if (!isPlatformMeteredModel(model)) {
    return 0;
  }

  let btcPriceUsd = 100000;
  try {
    const usdPerBtc = await convertFromBTC(1, 'USD');
    if (Number.isFinite(usdPerBtc) && usdPerBtc > 0) {
      btcPriceUsd = usdPerBtc;
    }
  } catch {
    /* keep conservative default */
  }

  const meteredRawCostBtc =
    Number.isFinite(rawCostBtc) && (rawCostBtc ?? 0) > 0
      ? (rawCostBtc as number)
      : calculateCostBtc(model, inputTokens, outputTokens, btcPriceUsd);
  if (meteredRawCostBtc <= 0) {
    return 0;
  }
  const chargeBtc = ceilBtc(meteredRawCostBtc * CREDIT_USAGE_MARKUP);

  const newBalance = await appendCreditEntry(admin, userId, {
    kind: 'usage',
    amountBtc: -chargeBtc,
    ref,
    metadata: {
      source: 'cat_chat',
      model,
      inputTokens,
      outputTokens,
      rawCostBtc: meteredRawCostBtc,
      pricingSource:
        Number.isFinite(rawCostBtc) && (rawCostBtc ?? 0) > 0
          ? 'provider_reported'
          : 'registry_estimate',
      markup: CREDIT_USAGE_MARKUP,
      conversationId: conversationId ?? null,
    },
  });

  if (newBalance === null) {
    // Served but not billed (race/duplicate/transient). Reconcilable from logs.
    logger.warn(
      'Cat frontier usage debit failed — response served, ledger not debited',
      { userId, model, chargeBtc, ref },
      'CatCredits'
    );
    return 0;
  }
  return chargeBtc;
}
