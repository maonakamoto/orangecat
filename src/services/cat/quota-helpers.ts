/**
 * Cat quota helpers — pure functions used by /api/cat/quota.
 *
 * Lives outside the route module so they can be unit-tested without
 * mocking Supabase auth, the API-key service, or the RPC.
 */

export type CatTier = 'byok' | 'free';

/**
 * A user is on the BYOK tier as soon as they have at least one valid
 * stored key for any supported provider. Provider-stored keys (Groq or
 * OpenRouter) take precedence over the platform daily allowance because
 * the chat route routes through them first.
 */
export function resolveTier(opts: { hasGroqByok: boolean; hasOpenRouterByok: boolean }): CatTier {
  return opts.hasGroqByok || opts.hasOpenRouterByok ? 'byok' : 'free';
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
