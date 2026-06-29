/**
 * Cat plans — SSOT for the pricing page and any in-product upgrade CTA.
 *
 * Three plans, honest about what's shipped:
 *   - free → what every user gets today (10 msgs/day on free models)
 *   - byok → already implemented; zero platform cost; recommended for power users
 *   - pro  → managed frontier AI, not live yet. OrangeCat has no fiat rails
 *            yet (can't bill francs or pay inference providers in fiat), so the
 *            franc price is a future anchor and the CTA routes to /support:
 *            back OrangeCat in Bitcoin as a founding supporter (a donation, NOT
 *            redeemable inference) + use BYOK to get frontier models today.
 *
 * The /pricing page and QuotaMeter both read from this file. If the daily
 * limit changes, update CAT_FREE_DAILY_LIMIT here and api-key-service.ts in
 * the same commit.
 */

import { ROUTES } from '@/config/routes';

export type CatPlanId = 'free' | 'byok' | 'pro';

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
 * Mirrors WIRED_PROVIDER_IDS in AIKeyAddForm — keep in sync.
 */
export const CAT_WIRED_PROVIDERS = [
  'Groq',
  'OpenRouter',
  'OpenAI',
  'Together',
  'DeepSeek',
  'xAI (Grok)',
] as const;

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
    id: 'pro',
    name: 'Pro',
    tagline: 'Managed frontier AI — zero setup',
    // Franc price as the future anchor; the card makes clear it's not live yet.
    priceCopy: 'CHF 19 / mo · founding access',
    bullets: [
      `Frontier models (${CAT_FRONTIER_MODELS_LIST}) managed by OrangeCat — no keys, no setup`,
      'Higher limits, smarter defaults, full agentic Cat (discovery, matchmaking, multi-step)',
      'Fiat billing is coming — until then, back us in Bitcoin as a founding supporter',
      'Founding supporters get recognition and first access the day Pro goes live',
    ],
    cta: { label: 'Become a founding supporter', href: ROUTES.SUPPORT, variant: 'outline' },
    status: 'coming-soon',
    badge: 'Founding access',
  },
];
