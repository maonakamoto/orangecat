/**
 * Cat Quota
 *
 * Authenticated endpoint that reports the user's current Cat usage budget
 * so the UI can surface "N messages left today" + an upgrade CTA before
 * the request actually 429s.
 *
 * Sources of truth:
 *   - tier: presence of a stored BYOK row (Groq or OpenRouter) on user_api_keys
 *   - quota: ApiKeyService.checkPlatformUsage() — the same RPC used by the
 *     chat route at request time, so the meter never disagrees with the gate
 *
 * GET /api/cat/quota
 */

import { withAuth, type AuthenticatedRequest } from '@/lib/api/withAuth';
import { apiSuccess } from '@/lib/api/standardResponse';
import { createApiKeyService } from '@/services/ai/api-key-service';
import { resolveTier, secondsUntilUtcMidnight, type CatTier } from '@/services/cat/quota-helpers';
import { getUserPlan } from '@/services/billing/getUserPlan';

interface QuotaResponse {
  tier: CatTier;
  hasGroqByok: boolean;
  hasOpenRouterByok: boolean;
  dailyLimit: number;
  dailyRequests: number;
  requestsRemaining: number;
  canUsePlatform: boolean;
  /** Seconds until the daily counter resets (UTC midnight). */
  resetInSeconds: number;
  /** ISO timestamp of Pro renewal deadline; null on Free/BYOK. */
  expiresAt: string | null;
}

export const GET = withAuth(async (request: AuthenticatedRequest) => {
  const { user, supabase } = request;
  const keyService = createApiKeyService(supabase);

  const [hasGroqByok, hasOpenRouterByok, usage, plan] = await Promise.all([
    keyService.hasValidKey(user.id, 'groq'),
    keyService.hasValidKey(user.id, 'openrouter'),
    keyService.checkPlatformUsage(user.id),
    getUserPlan(supabase, user.id),
  ]);

  const payload: QuotaResponse = {
    tier: resolveTier({ hasGroqByok, hasOpenRouterByok, paidTier: plan.tier }),
    hasGroqByok,
    hasOpenRouterByok,
    dailyLimit: usage.daily_limit,
    dailyRequests: usage.daily_requests,
    requestsRemaining: usage.requests_remaining,
    canUsePlatform: usage.can_use_platform,
    resetInSeconds: secondsUntilUtcMidnight(),
    expiresAt: plan.expiresAt,
  };

  return apiSuccess(payload);
});
