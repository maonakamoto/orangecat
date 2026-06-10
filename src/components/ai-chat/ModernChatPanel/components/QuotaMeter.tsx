/**
 * QuotaMeter
 *
 * Shows the user's daily Cat budget so they can see headroom before they
 * hit the cap, and a path forward when they're close to / past it.
 *
 * Three states:
 *   - BYOK    → small "Your key" badge (no quota tracked, just confirms it's wired)
 *   - free    → "N / limit today" status line, normal weight
 *   - warning → ≤2 remaining: same line plus inline "Use your free Groq key →"
 *   - capped  → 0 remaining: "Daily limit reached — try BYOK" CTA
 *
 * The CTA points at /settings/ai (BYOK setup) because that's the only
 * real escape today — pricing tiers will plug in here later.
 */

import Link from 'next/link';
import { KeyRound } from 'lucide-react';
import { ROUTES } from '@/config/routes';
import { cn } from '@/lib/utils';
import type { CatQuota } from '../hooks/useCatQuota';

interface QuotaMeterProps {
  quota: CatQuota | null;
  className?: string;
}

const NEAR_CAP_THRESHOLD = 2;

export function QuotaMeter({ quota, className }: QuotaMeterProps) {
  if (!quota) {
    return null;
  }

  if (quota.tier === 'byok') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-md border border-border-subtle bg-muted px-2 py-1 text-xs text-muted-foreground',
          className
        )}
        title={
          quota.hasGroqByok && quota.hasOpenRouterByok
            ? 'Using your Groq + OpenRouter keys'
            : quota.hasGroqByok
              ? 'Using your Groq key'
              : 'Using your OpenRouter key'
        }
      >
        <KeyRound className="h-3 w-3" aria-hidden="true" />
        Your key
      </span>
    );
  }

  const { dailyLimit, requestsRemaining } = quota;
  const isCapped = requestsRemaining <= 0;
  const isNearCap = !isCapped && requestsRemaining <= NEAR_CAP_THRESHOLD;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs',
        isCapped && 'border-status-negative/30 bg-status-negative-subtle text-status-negative',
        isNearCap && 'border-status-warning/30 bg-status-warning-subtle text-status-warning',
        !isCapped && !isNearCap && 'border-border-subtle bg-muted text-muted-foreground',
        className
      )}
    >
      <span className="whitespace-nowrap" aria-live="polite">
        {isCapped ? 'Daily limit' : `${requestsRemaining} / ${dailyLimit}`}
        <span className="sr-only"> Cat messages remaining today</span>
      </span>
      {(isCapped || isNearCap) && (
        <Link
          href={ROUTES.SETTINGS_AI}
          className="whitespace-nowrap font-medium underline decoration-dotted underline-offset-2 hover:no-underline"
        >
          Use your key →
        </Link>
      )}
    </span>
  );
}
