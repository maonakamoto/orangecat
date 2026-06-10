/**
 * Cat quota helpers — pure functions used by /api/cat/quota.
 *
 * Lives outside the route module so they can be unit-tested without
 * mocking Supabase auth, the API-key service, or the RPC.
 */

export type CatTier = 'byok' | 'pro' | 'free';

/**
 * Resolves the user-facing tier the QuotaMeter should show. Precedence:
 *   1. byok — a stored Groq or OpenRouter key wins, because the chat route
 *      routes through it before touching the platform credentials. The
 *      paid plan is irrelevant in this case; there's no cap to enforce.
 *   2. pro  — a paid, non-expired user_plans.tier='pro' row.
 *   3. free — everything else (no key, no plan, expired plan, ...).
 *
 * `paidTier` is optional so existing callers stay binary-compatible.
 */
export function resolveTier(opts: {
  hasGroqByok: boolean;
  hasOpenRouterByok: boolean;
  paidTier?: 'free' | 'pro';
}): CatTier {
  if (opts.hasGroqByok || opts.hasOpenRouterByok) {
    return 'byok';
  }
  if (opts.paidTier === 'pro') {
    return 'pro';
  }
  return 'free';
}

/**
 * Seconds remaining until the next UTC midnight — when the platform daily
 * counter resets. Returns a non-negative integer.
 *
 * Pass `now` for deterministic tests; defaults to `new Date()` otherwise.
 */
export function secondsUntilUtcMidnight(now: Date = new Date()): number {
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0)
  );
  return Math.max(0, Math.floor((next.getTime() - now.getTime()) / 1000));
}
