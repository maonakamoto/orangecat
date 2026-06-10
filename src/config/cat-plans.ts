/**
 * Cat plans — SSOT for the pricing page and any in-product upgrade CTA.
 *
 * Three plans, honest about what's shipped:
 *   - free → what every user gets today (10 msgs/day on free models)
 *   - byok → already implemented; zero platform cost; recommended for power users
 *   - pro  → waitlist only. The Pro card is intentionally vague about WHAT
 *            you'd be paying for — the business model isn't decided yet
 *            (could be more Cat capacity, could be platform features like
 *            entity caps + verified badge, could be transaction fees, could
 *            be all of the above). The waitlist exists to collect signal
 *            before any irreversible decision is made.
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

export const CAT_PLANS: CatPlan[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'For everyone, forever',
    priceCopy: 'CHF 0 / mo',
    bullets: [
      `${CAT_FREE_DAILY_LIMIT} Cat messages every day`,
      'Free open-source models (Llama, Gemini, DeepSeek, Qwen)',
      'Visible tool calls + cited results',
      'Chats save to your history — clear anytime',
    ],
    cta: { label: 'Start chatting', href: ROUTES.DASHBOARD.CAT, variant: 'outline' },
    status: 'available',
  },
  {
    id: 'byok',
    name: 'Bring your own key',
    tagline: 'Already have a Groq or OpenRouter key?',
    priceCopy: 'CHF 0 / mo',
    bullets: [
      'No daily cap — you pay your provider directly',
      'Pick any model your provider exposes',
      'Free Groq keys at console.groq.com take a minute',
      'Keys encrypted at rest, scrubbed from logs, never echoed back',
    ],
    cta: { label: 'Add your key', href: ROUTES.SETTINGS_AI, variant: 'accent' },
    status: 'available',
    badge: 'Recommended',
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'Shape it with us',
    priceCopy: 'No price yet — waitlist first',
    bullets: [
      'What you pay for is still open: more Cat capacity, platform features, both',
      'OrangeCat is Bitcoin-aligned: payments will use Lightning or BTC, not card-on-file',
      'Until Pro ships, Free + BYOK cover most use — Cat works for everyone today',
      'Tell us what you would actually pay for; the waitlist drives the spec',
    ],
    cta: { label: 'Join the waitlist', href: '#waitlist', variant: 'outline' },
    status: 'coming-soon',
  },
];
