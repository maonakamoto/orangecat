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
import { OPENAI_COMPAT_PROVIDER_IDS } from '@/config/ai-provider-runtime';
import { getAIProvider } from '@/data/aiProviders';

interface QuotaResponse {
  tier: CatTier;
  hasGroqByok: boolean;
  hasOpenRouterByok: boolean;
  /**
   * Provider id Cat would route through right now if the user is on BYOK
   * (first match in priority order: groq > openrouter > openai > together
   * > deepseek > xai). Null when no BYOK key is stored. The UI displays
   * the name so the freedom architecture is visible in every chat.
   */
  activeByokProvider: string | null;
  /** Human-readable name of the active BYOK provider, if any. */
  activeByokProviderName: string | null;
  dailyLimit: number;
  dailyRequests: number;
  requestsRemaining: number;
  canUsePlatform: boolean;
  /** Seconds until the daily counter resets (UTC midnight). */
  resetInSeconds: number;
  /** ISO timestamp of Pro renewal deadline; null on Free/BYOK. */
  expiresAt: string | null;
}

const BYOK_PRIORITY: string[] = ['groq', 'openrouter', ...OPENAI_COMPAT_PROVIDER_IDS];

export const GET = withAuth(async (request: AuthenticatedRequest) => {
  const { user, supabase } = request;
  const keyService = createApiKeyService(supabase);

  const [keyChecks, usage, plan] = await Promise.all([
    Promise.all(BYOK_PRIORITY.map(p => keyService.hasValidKey(user.id, p))),
    keyService.checkPlatformUsage(user.id),
    getUserPlan(supabase, user.id),
  ]);

  const hasGroqByok = keyChecks[BYOK_PRIORITY.indexOf('groq')] ?? false;
  const hasOpenRouterByok = keyChecks[BYOK_PRIORITY.indexOf('openrouter')] ?? false;

  const activeIndex = keyChecks.findIndex(Boolean);
  const activeByokProvider = activeIndex >= 0 ? BYOK_PRIORITY[activeIndex] : null;
  const activeByokProviderName = activeByokProvider
    ? (getAIProvider(activeByokProvider)?.name ?? activeByokProvider)
    : null;

  const payload: QuotaResponse = {
    tier: resolveTier({ hasGroqByok, hasOpenRouterByok, paidTier: plan.tier }),
    hasGroqByok,
    hasOpenRouterByok,
    activeByokProvider,
    activeByokProviderName,
    dailyLimit: usage.daily_limit,
    dailyRequests: usage.daily_requests,
    requestsRemaining: usage.requests_remaining,
    canUsePlatform: usage.can_use_platform,
    resetInSeconds: secondsUntilUtcMidnight(),
    expiresAt: plan.expiresAt,
  };

  return apiSuccess(payload);
});
