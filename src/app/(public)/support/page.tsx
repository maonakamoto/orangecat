import Link from 'next/link';
import { ArrowRight, Bitcoin, KeyRound, Sparkles, Check } from 'lucide-react';
import Button from '@/components/ui/Button';
import { ROUTES } from '@/config/routes';
import { CAT_FRONTIER_MODELS_LIST, CAT_FRONTIER_MODELS_OR } from '@/config/cat-plans';
import { FoundingSupporterDonation } from '@/components/support/FoundingSupporterDonation';

export const metadata = {
  title: 'Become a founding supporter',
  description:
    'OrangeCat is building toward fully managed, permissionless AI and economic participation. Back it in Bitcoin as a founding supporter — and use Cat with your own key today.',
};

/**
 * /support — founding-supporter page. Honest framing: OrangeCat has no fiat
 * rails yet, so the "pay us" path is a Bitcoin donation (not redeemable
 * inference). BYOK is the real way to get frontier models today. Premium,
 * x.ai-aligned, on the semantic design tier (monochrome + warm accent +
 * Bitcoin Orange for the BTC-specific surface only).
 */
export default function SupportPage() {
  return (
    <div className="min-h-screen bg-surface-page">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        {/* Hero */}
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-default bg-surface-base px-4 py-1.5 text-xs font-medium uppercase tracking-caps text-fg-secondary">
            <Sparkles className="h-3.5 w-3.5 text-bitcoinOrange" />
            Founding supporters
          </span>
          <h1 className="mt-6 font-heading text-4xl font-bold tracking-display text-fg-primary sm:text-5xl lg:text-6xl">
            Back the permissionless economy
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-fg-secondary sm:text-xl">
            OrangeCat is building toward a world where anyone — any person, pseudonym, or AI — can
            earn, fund, lend, and govern without gatekeepers, in any currency. We&apos;re early, and
            we&apos;d rather be honest about it than polished about it.
          </p>
        </div>

        {/* Honest narrative */}
        <section className="mx-auto mt-16 max-w-2xl space-y-4 text-fg-primary">
          <h2 className="font-heading text-2xl font-bold tracking-display">Why Bitcoin, why now</h2>
          <p>
            The destination is <strong>Pro</strong>: frontier models — {CAT_FRONTIER_MODELS_LIST} —
            managed entirely by OrangeCat, no keys, no setup. The effortless AI a serious company
            runs on.
          </p>
          <p>
            We&apos;re not there yet, and we won&apos;t pretend otherwise.{' '}
            <strong>OrangeCat has no fiat payment rails</strong> — we can&apos;t bill your francs,
            and we can&apos;t pay the inference providers in fiat. So a franc subscription
            isn&apos;t something we can honestly take your money for today.
          </p>
          <p>
            What we <em>can</em> do is build in the open and let the people who believe in it help
            fund the road there. If that&apos;s you, back OrangeCat in Bitcoin. It&apos;s a donation
            — not a subscription, not redeemable inference — and it directly funds the path to
            managed AI and a censorship-resistant economy.
          </p>
        </section>

        {/* Donation */}
        <section className="mx-auto mt-12 max-w-2xl">
          <div className="rounded-lg border border-bitcoinOrange/30 bg-surface-base p-6 sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-md bg-surface-raised p-2">
                <Bitcoin className="h-5 w-5 text-bitcoinOrange" />
              </div>
              <div>
                <h2 className="font-heading text-xl font-bold tracking-display text-fg-primary">
                  Support in Bitcoin
                </h2>
                <p className="text-sm text-fg-secondary">
                  Any amount. Lightning is instant and near-free; on-chain suits larger gifts.
                </p>
              </div>
            </div>
            <FoundingSupporterDonation />
          </div>

          {/* What founding supporters get */}
          <ul className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              'Recognition as a founding supporter',
              'First access the day Pro goes live',
              'You fund a permissionless economy',
            ].map(perk => (
              <li
                key={perk}
                className="flex items-start gap-2 rounded-lg border border-default bg-surface-base p-4 text-sm text-fg-primary"
              >
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-status-positive" />
                <span>{perk}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* BYOK — the works-today path */}
        <section className="mx-auto mt-16 max-w-2xl rounded-lg border border-accent-warm/30 bg-accent-warm/5 p-8 text-fg-primary">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <KeyRound
                className="mt-1 h-6 w-6 flex-shrink-0 text-accent-warm"
                aria-hidden="true"
              />
              <div>
                <h2 className="font-heading text-xl font-bold tracking-display">
                  Want frontier models right now?
                </h2>
                <p className="mt-1 max-w-md text-fg-secondary">
                  Bring your own key. Cat runs {CAT_FRONTIER_MODELS_OR} for you today — your key,
                  your bill, zero markup. No waiting on us.
                </p>
              </div>
            </div>
            <Link href={ROUTES.SETTINGS_AI} className="flex-shrink-0">
              <Button variant="accent" size="lg" className="gap-2">
                Add your key
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>

        {/* Footer note */}
        <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-fg-secondary">
          Founding support is a voluntary Bitcoin donation to OrangeCat — non-refundable, and not a
          purchase of services. When fiat billing and managed Pro go live, founding supporters come
          first.
        </p>
      </div>
    </div>
  );
}
