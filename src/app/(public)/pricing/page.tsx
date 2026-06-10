import React from 'react';
import Link from 'next/link';
import { Check, Sparkles, Cat as CatIcon } from 'lucide-react';
import Button from '@/components/ui/Button';
import { CAT_PLANS, type CatPlan } from '@/config/cat-plans';
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
            Your AI, your bill, your choice
          </h1>
          <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
            Cat works any way you want. Free out of the box, or bring your own key from six wired
            providers — OpenAI, OpenRouter, Together, Groq, DeepSeek, xAI. OrangeCat doesn&apos;t
            mark up inference; we earn from the platform, not your AI bill.
          </p>
        </div>

        {/* Plan cards */}
        <div className="mb-16 grid gap-6 md:grid-cols-3">
          {CAT_PLANS.map(plan => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>

        {/* Why pay? — intentionally open-ended */}
        <section className="mb-16 rounded-lg border border-border bg-card p-8">
          <h2 className="mb-4 text-2xl font-semibold text-foreground">What Pro will be</h2>
          <div className="space-y-4 text-muted-strong">
            <p>
              We haven&apos;t decided. There are three plausible directions for what you&apos;d be
              paying for, and we&apos;d rather hear from you before we lock one in:
            </p>
            <ul className="space-y-3 pl-4">
              <li>
                <strong className="text-foreground">More Cat.</strong> Higher daily limits, better
                default models — you pay OrangeCat, we pay the provider.
              </li>
              <li>
                <strong className="text-foreground">Platform features.</strong> Unlimited entities,
                Cat autonomous actions, verified badge, priority discovery — none of which touch the
                AI bill.
              </li>
              <li>
                <strong className="text-foreground">No subscription at all.</strong> OrangeCat earns
                a small fee on transactions that happen on the platform (sales, funding, loans). AI
                stays free for everyone, forever. Bitcoin-aligned: we win when you win.
              </li>
            </ul>
            <p>
              Most likely some mix. Until then: Free + BYOK cover real use today. Cat works for
              everyone right now, no card on file, no commitment.
            </p>
          </div>
        </section>

        {/* Waitlist */}
        <section id="waitlist" className="mb-12 rounded-lg bg-surface-public p-8 text-fg-inverted">
          <div className="text-center">
            <Sparkles className="mx-auto mb-4 h-10 w-10" aria-hidden="true" />
            <h2 className="mb-3 font-heading text-2xl font-bold tracking-display">
              Shape what Pro becomes
            </h2>
            <p className="mx-auto mb-6 max-w-2xl text-fg-inverted/70">
              No commitment, no payment details. Tell us which of the three directions above (or
              something else) would make you actually pay. We read every reply.
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
            Whatever Pro becomes, payments will be Bitcoin/Lightning-native — no card-on-file
            required. The price isn&apos;t committed until you tell us what works.
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
