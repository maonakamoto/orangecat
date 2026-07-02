/**
 * Cat Credit usage metering — money path.
 *
 * The unit is BTC everywhere: this suite pins the 2026-07-02 fix where
 * calculateCostBtc returned satoshis despite its name (a 1e8 drift that would
 * have drained balances). It also pins the metering rules: only paid registry
 * models bill, the debit is cost × markup rounded up to 1e-8, and a failed
 * ledger append never throws at the user.
 */

import {
  meterCreditUsage,
  checkFrontierAccess,
  isPlatformMeteredModel,
  CREDIT_USAGE_MARKUP,
  MIN_FRONTIER_BALANCE_BTC,
} from '@/services/cat/credit-metering';
import { calculateCostBtc, getFreeModels, getAvailableModels } from '@/config/ai-models';

jest.mock('@/utils/logger', () => ({
  logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

// Live-rate lookup is best-effort; pin it for determinism.
jest.mock('@/services/currency/rates', () => ({
  convertFromBTC: jest.fn().mockResolvedValue(100000), // 1 BTC = 100k USD
}));

const appendCreditEntry = jest.fn();
const getCreditBalance = jest.fn();
jest.mock('@/services/cat/credits', () => ({
  appendCreditEntry: (...a: unknown[]) => appendCreditEntry(...a),
  getCreditBalance: (...a: unknown[]) => getCreditBalance(...a),
}));

const admin = {} as never;
const PAID_MODEL = getAvailableModels().find(m => m.tier !== 'free')?.id as string;
const FREE_MODEL = getFreeModels()[0]?.id as string;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('calculateCostBtc returns BTC, not satoshis', () => {
  it('a ~$0.01 completion costs ~1e-7 BTC (would be ~10 BTC under the sats bug)', () => {
    // Any paid model: cost scales linearly, so assert the magnitude bound.
    const cost = calculateCostBtc(PAID_MODEL, 1000, 1000, 100000);
    expect(cost).toBeGreaterThan(0);
    expect(cost).toBeLessThan(0.001); // sats-bug values were >= 1 whole unit
  });

  it('rounds up to ledger precision instead of billing 0', () => {
    const cost = calculateCostBtc(PAID_MODEL, 1, 1, 100000);
    expect(cost).toBeGreaterThanOrEqual(0.00000001);
  });

  it('unknown models cost 0', () => {
    expect(calculateCostBtc('no-such-model', 1000, 1000)).toBe(0);
  });
});

describe('isPlatformMeteredModel', () => {
  it('true for paid registry models only', () => {
    expect(isPlatformMeteredModel(PAID_MODEL)).toBe(true);
    expect(isPlatformMeteredModel(FREE_MODEL)).toBe(false);
    expect(isPlatformMeteredModel('not-in-registry')).toBe(false);
    expect(isPlatformMeteredModel(undefined)).toBe(false);
  });
});

describe('checkFrontierAccess', () => {
  it('allows at or above the minimum balance', async () => {
    getCreditBalance.mockResolvedValue(MIN_FRONTIER_BALANCE_BTC);
    await expect(checkFrontierAccess(admin, 'u1')).resolves.toEqual({
      allowed: true,
      balanceBtc: MIN_FRONTIER_BALANCE_BTC,
    });
  });

  it('denies below it', async () => {
    getCreditBalance.mockResolvedValue(0);
    await expect(checkFrontierAccess(admin, 'u1')).resolves.toMatchObject({ allowed: false });
  });
});

describe('meterCreditUsage', () => {
  it('debits cost × markup as a negative usage entry with the request ref', async () => {
    appendCreditEntry.mockResolvedValue(0.001);
    const charged = await meterCreditUsage(admin, 'u1', {
      model: PAID_MODEL,
      inputTokens: 100000,
      outputTokens: 100000,
      ref: 'cat_chat_abc',
    });

    expect(charged).toBeGreaterThan(0);
    expect(appendCreditEntry).toHaveBeenCalledTimes(1);
    const [, userId, entry] = appendCreditEntry.mock.calls[0] as [unknown, string, any];
    expect(userId).toBe('u1');
    expect(entry.kind).toBe('usage');
    expect(entry.ref).toBe('cat_chat_abc');
    expect(entry.amountBtc).toBeCloseTo(-charged, 10);

    // Charge covers the raw cost plus the platform margin.
    const raw = calculateCostBtc(PAID_MODEL, 100000, 100000, 100000);
    expect(charged).toBeGreaterThanOrEqual(raw * CREDIT_USAGE_MARKUP - 1e-8);
    expect(charged).toBeLessThan(raw * CREDIT_USAGE_MARKUP + 1e-7);
  });

  it('never bills free or unknown models', async () => {
    await meterCreditUsage(admin, 'u1', {
      model: FREE_MODEL,
      inputTokens: 5000,
      outputTokens: 5000,
      ref: 'r1',
    });
    await meterCreditUsage(admin, 'u1', {
      model: 'no-such-model',
      inputTokens: 5000,
      outputTokens: 5000,
      ref: 'r2',
    });
    expect(appendCreditEntry).not.toHaveBeenCalled();
  });

  it('returns 0 (never throws) when the ledger append fails', async () => {
    appendCreditEntry.mockResolvedValue(null);
    await expect(
      meterCreditUsage(admin, 'u1', {
        model: PAID_MODEL,
        inputTokens: 100000,
        outputTokens: 100000,
        ref: 'r3',
      })
    ).resolves.toBe(0);
  });
});
