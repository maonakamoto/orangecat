/**
 * Cat plans — SSOT for the pricing page and any in-product upgrade CTA.
 *
 * Three plans, honest about what's shipped ("sell intelligence, not rails" —
 * P2P payments stay 0% forever; the platform earns on Cat Credits):
 *   - free    → what every user gets today (10 msgs/day on free models)
 *   - byok    → already implemented; zero platform cost; for power users
 *   - credits → pay-as-you-go frontier AI, billed in Bitcoin against a
 *               prepaid Cat Credit balance (ledger + metering are live in
 *               code; Lightning top-up activates with the platform wallet —
 *               flip CAT_CREDITS_LIVE when PLATFORM_NWC_URI is provisioned).
 *
 * A flat Supporter subscription (CHF/month) may come later; it is deliberately
 * NOT a card until it can actually be bought.
 *
 * The /pricing page and QuotaMeter both read from this file. If the daily
 * limit changes, update CAT_FREE_DAILY_LIMIT here only — all fallbacks import it.
 */

import { ROUTES } from '@/config/routes';
import { CREDIT_USAGE_MARKUP } from '@/services/cat/credit-metering';
import { WIRED_PROVIDER_DISPLAY_NAMES } from '@/data/aiProviders';

export type CatPlanId = 'free' | 'byok' | 'credits';

/**
 * Flip to true the moment the platform Lightning wallet (PLATFORM_NWC_URI)
 * is provisioned and one live top-up has been verified — the credits card
 * then switches from "activating" to a live top-up CTA.
 */
export const CAT_CREDITS_LIVE = false;

/** Platform margin label — derived from CREDIT_USAGE_MARKUP so marketing never drifts. */
export const CAT_CREDITS_MARKUP_LABEL = `provider cost + ${Math.round((CREDIT_USAGE_MARKUP - 1) * 100)}%`;

export interface CatPlan {
  id: CatPlanId;
  name: string;
  tagline: string;
  /** Short price line shown under the name. Honest copy only. */
  priceCopy: string;
  bullets: string[];
  cta: {
    label: string;
    href: string;
    variant: 'accent' | 'outline';
  };
  status: 'available' | 'coming-soon';
  /** Optional badge text shown on the tier card. */
  badge?: string;
}

/**
 * Daily message cap for non-BYOK users on the free tier. Mirrors the
 * default in src/services/ai/api-key-service.ts:checkPlatformUsage so the
 * page never advertises a different number than the runtime enforces.
 */
export const CAT_FREE_DAILY_LIMIT = 10;

/**
 * Providers Cat actually routes through today, surfaced on /pricing so the
 * BYOK card shows real names instead of a vague "any provider" promise.
 * Derived from WIRED_PROVIDER_IDS in src/data/aiProviders.ts.
 */
export const CAT_WIRED_PROVIDERS = WIRED_PROVIDER_DISPLAY_NAMES;

/**
 * SSOT for the frontier models named in marketing copy (pricing, support,
 * settings). Brand-level on purpose — never a specific version like "GPT-4o",
 * which reads as stale the moment a new model ships. Change here once and every
 * page updates; do NOT hardcode this list in page copy.
 */
export const CAT_FRONTIER_MODELS = ['Claude', 'GPT', 'Grok'] as const;
/** "Claude, GPT, Grok" */
export const CAT_FRONTIER_MODELS_LIST = CAT_FRONTIER_MODELS.join(', ');
/** "Claude, GPT, or Grok" */
export const CAT_FRONTIER_MODELS_OR = `${CAT_FRONTIER_MODELS.slice(0, -1).join(', ')}, or ${CAT_FRONTIER_MODELS[CAT_FRONTIER_MODELS.length - 1]}`;

export const CAT_PLANS: CatPlan[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'For everyone, forever',
    priceCopy: 'CHF 0 / mo',
    bullets: [
      `${CAT_FREE_DAILY_LIMIT} Cat messages every day`,
      'Best free open-source model, picked automatically (Llama, Gemini, DeepSeek)',
      'Cat reads your entities — knows your projects, products, wallet',
      'Visible tool calls, cited results, chats clearable any time',
    ],
    cta: { label: 'Start chatting', href: ROUTES.DASHBOARD.CAT, variant: 'outline' },
    status: 'available',
  },
  {
    id: 'byok',
    name: 'Bring your own key',
    tagline: 'Any provider. Your bill. No markup.',
    priceCopy: 'CHF 0 / mo to OrangeCat',
    bullets: [
      `Six providers wired direct: ${CAT_WIRED_PROVIDERS.join(', ')}`,
      'Want Claude / GPT / Gemini? OpenRouter fronts 200+ models with one key',
      'Cat routes through your key — OrangeCat never sees your bill, never marks it up',
      'Keys encrypted at rest, scrubbed from logs, never echoed back to the client',
    ],
    cta: { label: 'Add your key', href: ROUTES.SETTINGS_AI, variant: 'accent' },
    status: 'available',
    badge: 'Available now',
  },
  {
    id: 'credits',
    name: 'Cat Credits',
    tagline: 'Pay as you go — managed frontier AI, billed in Bitcoin',
    priceCopy: `Top up over Lightning · ${CAT_CREDITS_MARKUP_LABEL}`,
    bullets: [
      `Frontier models (${CAT_FRONTIER_MODELS_LIST}) managed by OrangeCat — no keys, no setup`,
      'No subscription: you pay only for what the Cat actually computes',
      'Prepaid balance, transparent per-message ledger, top up from 0.00001 BTC',
      'Full agentic Cat: discovery, matchmaking, multi-step tasks',
    ],
    cta: CAT_CREDITS_LIVE
      ? { label: 'Top up credits', href: ROUTES.SETTINGS_AI, variant: 'accent' }
      : { label: 'Back us as a founding supporter', href: ROUTES.SUPPORT, variant: 'outline' },
    status: CAT_CREDITS_LIVE ? 'available' : 'coming-soon',
    badge: CAT_CREDITS_LIVE ? 'Live' : 'Activating',
  },
];
