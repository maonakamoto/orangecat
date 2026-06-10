import React from 'react';
import Link from 'next/link';
import { Check, Sparkles, Cat as CatIcon } from 'lucide-react';
import Button from '@/components/ui/Button';
import { CAT_PLANS, CAT_FREE_DAILY_LIMIT, type CatPlan } from '@/config/cat-plans';
import { cn } from '@/lib/utils';

export const metadata = {
  title: 'Cat plans',
  description:
    'OrangeCat Cat is free for everyone. Bring your own key, or join the Pro waitlist to help fund the platform AI budget.',
};

/**
 * /pricing — honest tier card layout. Free + BYOK are real and shipped;
 * Pro is a waitlist with no declared price (intentional: we want signal
 * before we price). One warm-accent CTA on the recommended (BYOK) tier;
 * everything else is monochrome surfaces per the FleetCrown-aligned
 * design tier.
 */
export default function PricingPage() {
  return (
    <div className="min-h-screen bg-surface-page">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Hero */}
        <div className="mb-12 text-center">
          <div className="mb-4 flex justify-center">
            <CatIcon className="h-16 w-16 text-fg-secondary" />
          </div>
          <h1 className="mb-4 font-heading text-4xl font-bold tracking-display text-foreground">
            Cat plans
          </h1>
          <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
            Cat is free for everyone — {CAT_FREE_DAILY_LIMIT} messages a day on open-source models.
            Bring your own key for unlimited use, or help us fund a hosted Pro tier.
          </p>
        </div>

        {/* Plan cards */}
        <div className="mb-16 grid gap-6 md:grid-cols-3">
          {CAT_PLANS.map(plan => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>

        {/* Why pay? */}
        <section className="mb-16 rounded-lg border border-border bg-card p-8">
          <h2 className="mb-4 text-2xl font-semibold text-foreground">Why pay if Free works?</h2>
          <div className="space-y-4 text-muted-strong">
            <p>
              The Free tier runs on Groq and OpenRouter free pools. Those pools have hard daily caps
              and shared rate limits — we can&apos;t lift them no matter how much we want to. The
              honest path past those caps is one of two things:
            </p>
            <p>
              <strong className="text-foreground">Bring your own key.</strong> Groq and OpenRouter
              both give free keys with much higher per-account limits. Add yours and Cat routes
              every request through it. You pay your provider — we never see your bill.
            </p>
            <p>
              <strong className="text-foreground">Pay us directly.</strong> We&apos;d run a hosted
              Pro tier where we top up the platform budget so you can keep chatting without juggling
              keys. We haven&apos;t priced it yet — that&apos;s what the waitlist is for.
            </p>
          </div>
        </section>

        {/* Waitlist */}
        <section id="waitlist" className="mb-12 rounded-lg bg-surface-public p-8 text-fg-inverted">
          <div className="text-center">
            <Sparkles className="mx-auto mb-4 h-10 w-10" aria-hidden="true" />
            <h2 className="mb-3 font-heading text-2xl font-bold tracking-display">
              Help us price Pro
            </h2>
            <p className="mx-auto mb-6 max-w-2xl text-fg-inverted/70">
              No commitment, no payment details. Just tell us what you&apos;d pay for higher daily
              limits and which features matter most. We read every reply.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <a href="mailto:hello@orangecat.ch?subject=Cat%20Pro%20waitlist">
                <Button variant="accent" size="lg">
                  Email the waitlist
                </Button>
              </a>
              <Link href="/dashboard/cat">
                <Button variant="outline" size="lg">
                  Try Cat free
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Footer note */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            BTC and Lightning are the planned default for Pro payments; CHF + EUR + USD via Stripe
            come next. No prices are committed until you tell us what works.
          </p>
        </div>
      </div>
    </div>
  );
}

function PlanCard({ plan }: { plan: CatPlan }) {
  const isComingSoon = plan.status === 'coming-soon';
  const hasBadge = !!plan.badge;

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-lg border bg-card p-6 shadow-sm',
        hasBadge ? 'border-accent-warm' : 'border-border'
      )}
    >
      {hasBadge && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent-warm px-3 py-1 text-xs font-medium uppercase tracking-caps text-fg-inverted">
          {plan.badge}
        </span>
      )}

      <div className="mb-4">
        <h3 className="font-heading text-2xl font-bold tracking-display text-foreground">
          {plan.name}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>
      </div>

      <div className="mb-6">
        <p
          className={cn(
            'text-lg font-semibold',
            isComingSoon ? 'text-muted-strong' : 'text-foreground'
          )}
        >
          {plan.priceCopy}
        </p>
      </div>

      <ul className="mb-8 flex-1 space-y-3">
        {plan.bullets.map(bullet => (
          <li key={bullet} className="flex items-start gap-2 text-sm text-muted-strong">
            <Check
              className={cn(
                'mt-0.5 h-4 w-4 flex-shrink-0',
                isComingSoon ? 'text-muted-foreground' : 'text-status-positive'
              )}
              aria-hidden="true"
            />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>

      <Link href={plan.cta.href} className="block">
        <Button variant={plan.cta.variant} size="md" className="w-full">
          {plan.cta.label}
        </Button>
      </Link>
    </div>
  );
}
