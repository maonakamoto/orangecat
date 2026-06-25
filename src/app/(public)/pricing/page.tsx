import React from 'react';
import Link from 'next/link';
import { Check, Sparkles, Cat as CatIcon } from 'lucide-react';
import Button from '@/components/ui/Button';
import { CAT_PLANS, type CatPlan } from '@/config/cat-plans';
import { ROUTES } from '@/config/routes';
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
          <h1 className="mb-4 font-heading text-4xl font-bold tracking-display text-fg-primary">
            Your AI, your bill, your choice
          </h1>
          <p className="mx-auto max-w-2xl text-xl text-fg-secondary">
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

        {/* Where this is going — honest about the fiat gap */}
        <section className="mb-16 rounded-lg border border-default bg-surface-base p-8">
          <h2 className="mb-4 font-heading text-2xl font-bold tracking-display text-fg-primary">
            Where this is going
          </h2>
          <div className="space-y-4 text-fg-primary">
            <p>
              The destination is <strong>Pro</strong>: frontier models — Claude, GPT-4o, Grok —
              fully managed by OrangeCat, no keys, no setup. The kind of effortless AI a serious
              company runs on.
            </p>
            <p>
              We&apos;re not there yet, and we won&apos;t pretend otherwise. OrangeCat doesn&apos;t
              have fiat payment rails — we can&apos;t bill your francs, and we can&apos;t pay the
              inference providers in fiat. So until those rails exist, there are two honest ways to
              get more:
            </p>
            <ul className="space-y-3 pl-4">
              <li>
                <strong className="text-fg-primary">Bring your own key</strong> — the real path to
                frontier models <em>today</em>. Your key, your bill, zero markup. Cat runs Claude or
                GPT-4o for you right now.
              </li>
              <li>
                <strong className="text-fg-primary">Back us in Bitcoin</strong> — believe in where
                this is heading? Become a founding supporter. It&apos;s a donation, not a
                subscription — and supporters get first access the day Pro ships.
              </li>
            </ul>
          </div>
        </section>

        {/* Founding supporter CTA band */}
        <section id="founding" className="mb-12 rounded-lg bg-surface-public p-8 text-fg-inverted">
          <div className="text-center">
            <Sparkles className="mx-auto mb-4 h-10 w-10" aria-hidden="true" />
            <h2 className="mb-3 font-heading text-2xl font-bold tracking-display">
              Found the permissionless economy
            </h2>
            <p className="mx-auto mb-6 max-w-2xl text-fg-inverted/70">
              We&apos;re building toward a world where anyone can earn, fund, and govern without
              gatekeepers. Fiat billing is coming — until then, back OrangeCat in Bitcoin and get
              first access to Pro the day it&apos;s live.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Link href={ROUTES.SUPPORT}>
                <Button variant="accent" size="lg">
                  Become a founding supporter
                </Button>
              </Link>
              <Link href={ROUTES.DASHBOARD.CAT}>
                <Button variant="outline" size="lg">
                  Try Cat free
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Footer note */}
        <div className="text-center text-sm text-fg-secondary">
          <p>
            Payments are Bitcoin/Lightning-native — no card-on-file, ever. When fiat billing lands,
            Pro will price honestly and founding supporters come first.
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
        'relative flex flex-col rounded-lg border bg-surface-base p-6 shadow-sm',
        hasBadge ? 'border-accent-warm' : 'border-default'
      )}
    >
      {hasBadge && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent-warm px-3 py-1 text-xs font-medium uppercase tracking-caps text-fg-inverted">
          {plan.badge}
        </span>
      )}

      <div className="mb-4">
        <h3 className="font-heading text-2xl font-bold tracking-display text-fg-primary">
          {plan.name}
        </h3>
        <p className="mt-1 text-sm text-fg-secondary">{plan.tagline}</p>
      </div>

      <div className="mb-6">
        <p
          className={cn(
            'text-lg font-semibold',
            isComingSoon ? 'text-fg-primary' : 'text-fg-primary'
          )}
        >
          {plan.priceCopy}
        </p>
      </div>

      <ul className="mb-8 flex-1 space-y-3">
        {plan.bullets.map(bullet => (
          <li key={bullet} className="flex items-start gap-2 text-sm text-fg-primary">
            <Check
              className={cn(
                'mt-0.5 h-4 w-4 flex-shrink-0',
                isComingSoon ? 'text-fg-secondary' : 'text-status-positive'
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
