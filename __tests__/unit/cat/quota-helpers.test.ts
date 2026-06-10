import { resolveTier, secondsUntilUtcMidnight } from '@/services/cat/quota-helpers';

describe('resolveTier', () => {
  it('returns byok when only a Groq key is stored', () => {
    expect(resolveTier({ hasGroqByok: true, hasOpenRouterByok: false })).toBe('byok');
  });

  it('returns byok when only an OpenRouter key is stored', () => {
    expect(resolveTier({ hasGroqByok: false, hasOpenRouterByok: true })).toBe('byok');
  });

  it('returns byok when both providers are stored', () => {
    expect(resolveTier({ hasGroqByok: true, hasOpenRouterByok: true })).toBe('byok');
  });

  it('returns free when no provider key is stored', () => {
    expect(resolveTier({ hasGroqByok: false, hasOpenRouterByok: false })).toBe('free');
  });

  it('returns pro when no BYOK but paidTier=pro', () => {
    expect(resolveTier({ hasGroqByok: false, hasOpenRouterByok: false, paidTier: 'pro' })).toBe(
      'pro'
    );
  });

  it('returns byok when both BYOK and paidTier=pro — BYOK wins', () => {
    expect(resolveTier({ hasGroqByok: true, hasOpenRouterByok: false, paidTier: 'pro' })).toBe(
      'byok'
    );
  });

  it('returns free when paidTier=free', () => {
    expect(resolveTier({ hasGroqByok: false, hasOpenRouterByok: false, paidTier: 'free' })).toBe(
      'free'
    );
  });
});

describe('secondsUntilUtcMidnight', () => {
  it('returns 24h worth of seconds at UTC midnight', () => {
    const midnight = new Date('2026-06-10T00:00:00.000Z');
    expect(secondsUntilUtcMidnight(midnight)).toBe(24 * 60 * 60);
  });

  it('returns 1 hour at UTC 23:00', () => {
    const eleven = new Date('2026-06-10T23:00:00.000Z');
    expect(secondsUntilUtcMidnight(eleven)).toBe(60 * 60);
  });

  it('returns 1 second at UTC 23:59:59', () => {
    const t = new Date('2026-06-10T23:59:59.000Z');
    expect(secondsUntilUtcMidnight(t)).toBe(1);
  });

  it('returns a non-negative integer regardless of input', () => {
    const t = new Date('2026-06-10T12:34:56.789Z');
    const result = secondsUntilUtcMidnight(t);
    expect(result).toBeGreaterThan(0);
    expect(Number.isInteger(result)).toBe(true);
  });
});
