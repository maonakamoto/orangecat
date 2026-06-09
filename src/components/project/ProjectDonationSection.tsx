'use client';

import { Bitcoin, Heart, Copy, ShieldCheck, Zap } from 'lucide-react';
import dynamic from 'next/dynamic';
import BitcoinPaymentButton from '@/components/bitcoin/BitcoinPaymentButton';

// SSR-skipped: LightningPayment renders form inputs whose React id pool desyncs
// between server and client renders.
const LightningPayment = dynamic(() => import('@/components/lightning/LightningPayment'), {
  ssr: false,
});
import Button from '@/components/ui/Button';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { WishlistDonationTiers } from '@/components/wishlist/WishlistDonationTiers';
import { convert, formatCurrency, displayBTC } from '@/services/currency';
import { ENTITY_REGISTRY } from '@/config/entity-registry';
import { useProjectDonation } from './useProjectDonation';
import { ROUTES } from '@/config/routes';

interface ProjectDonationSectionProps {
  projectId: string;
  ownerId?: string;
  bitcoinAddress: string | null;
  lightningAddress: string | null;
  projectTitle?: string;
  isOwner?: boolean;
}

const SUGGESTED_AMOUNTS_BTC = [
  { btc: 0.001, label: 'Small' },
  { btc: 0.005, label: 'Medium' },
  { btc: 0.01, label: 'Large' },
];

export function ProjectDonationSection({
  projectId,
  ownerId,
  bitcoinAddress,
  lightningAddress,
  projectTitle = ENTITY_REGISTRY.project.name,
  isOwner = false,
}: ProjectDonationSectionProps) {
  const {
    user,
    userCurrency,
    isFavorited,
    isTogglingFavorite,
    handleToggleFavorite,
    copyToClipboard,
  } = useProjectDonation(projectId);

  return (
    <>
      <section className="border-t pt-6" aria-labelledby="support-heading">
        <h3 id="support-heading" className="text-lg font-semibold mb-4">
          Support this Project
        </h3>
        <div className="flex flex-col sm:flex-row gap-3">
          {user ? (
            <Button
              onClick={handleToggleFavorite}
              disabled={isTogglingFavorite}
              variant={isFavorited ? 'primary' : 'outline'}
              className={`flex-1 flex items-center justify-center gap-2 ${
                isFavorited
                  ? 'bg-red-500 hover:bg-red-600 text-white border-destructive'
                  : 'border-border-strong hover:border-red-300 hover:text-destructive'
              }`}
              aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
            >
              {isTogglingFavorite ? (
                <>
                  <div
                    className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
                    aria-hidden="true"
                  />
                  <span>{isFavorited ? 'Removing...' : 'Adding...'}</span>
                </>
              ) : (
                <>
                  <Heart
                    className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`}
                    aria-hidden="true"
                  />
                  <span>{isFavorited ? 'Favorited' : 'Add to Favorites'}</span>
                </>
              )}
            </Button>
          ) : (
            <Button
              href={`${ROUTES.AUTH}?from=favorite`}
              variant="outline"
              className="flex-1 flex items-center justify-center gap-2 border-border-strong hover:border-red-300 hover:text-destructive"
              aria-label="Sign in to favorite this project"
            >
              <Heart className="w-4 h-4" aria-hidden="true" />
              <span>Sign in to Favorite</span>
            </Button>
          )}

          {(bitcoinAddress || lightningAddress) && (
            <div className="flex-1">
              <div className="hidden sm:block">
                <BitcoinPaymentButton projectId={projectId} projectTitle={projectTitle} />
              </div>
              <div className="sm:hidden">
                <Button
                  onClick={() => {
                    const supportSection = document.getElementById('bitcoin-support-section');
                    if (supportSection) {
                      supportSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                  className="w-full bg-bitcoinOrange hover:bg-bitcoinOrange/90 text-white"
                  aria-label="Scroll to Bitcoin funding section"
                >
                  <Bitcoin className="w-4 h-4 mr-2" aria-hidden="true" />
                  Fund with Bitcoin
                </Button>
              </div>
            </div>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          {user
            ? isFavorited
              ? 'You can find this project in your Favorites to support later.'
              : 'Save this project to your favorites to support later, or fund now.'
            : 'Sign in to save this project to your favorites and support later.'}
        </p>
      </section>

      {bitcoinAddress && (
        <section
          id="bitcoin-support-section"
          className="border-t pt-6"
          aria-labelledby="bitcoin-heading"
        >
          <h3 id="bitcoin-heading" className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Bitcoin className="w-5 h-5 text-bitcoinOrange" aria-hidden="true" />
            Fund with Bitcoin
          </h3>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex flex-col items-center justify-center bg-card p-6 rounded-lg border border-border">
              <div className="bg-card p-3 rounded-lg shadow-sm">
                <QRCodeSVG
                  value={`bitcoin:${bitcoinAddress}`}
                  size={180}
                  level="H"
                  includeMargin={true}
                  className="w-full h-auto"
                />
              </div>
              <p className="text-xs text-center text-muted-foreground mt-3">
                Scan with your Bitcoin wallet
              </p>
            </div>

            <div className="flex flex-col justify-center">
              <div className="bg-muted rounded-lg p-4 border border-border">
                <label className="text-xs font-medium text-muted-foreground mb-2 block uppercase tracking-wide">
                  Bitcoin Address
                </label>
                <div className="flex items-start gap-2">
                  <code className="text-sm font-mono text-foreground break-all flex-1 leading-relaxed">
                    {bitcoinAddress}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(bitcoinAddress, 'Bitcoin address')}
                    className="flex-shrink-0"
                    aria-label="Copy Bitcoin address to clipboard"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                <ShieldCheck className="w-4 h-4 text-green-600" aria-hidden="true" />
                <span>Address verified and monitored</span>
              </div>
            </div>
          </div>

          {ownerId && !isOwner && (
            <div className="mt-6 border-t pt-6">
              <WishlistDonationTiers
                userId={ownerId}
                projectId={projectId}
                projectTitle={projectTitle}
              />
            </div>
          )}

          <div className="mt-6 border-t pt-6">
            <p className="text-sm font-medium text-foreground mb-3">
              {ownerId && !isOwner ? 'Other amounts:' : 'Suggested support amounts:'}
            </p>
            <div className="grid grid-cols-3 gap-3">
              {SUGGESTED_AMOUNTS_BTC.map(({ btc, label }) => {
                const displayAmount = convert(btc, 'BTC', userCurrency);
                const formattedAmount = formatCurrency(displayAmount, userCurrency, {
                  compact: true,
                });
                const btcDisplay = displayBTC(btc);

                return (
                  <button
                    key={btc}
                    onClick={() => {
                      copyToClipboard(bitcoinAddress, 'Bitcoin address');
                      toast.success(`Address copied! Send ${btcDisplay}`, {
                        description: `Suggested ${label.toLowerCase()} support (≈ ${formattedAmount})`,
                      });
                    }}
                    className="px-4 py-3 border-2 border-border-strong rounded-lg hover:border-bitcoinOrange hover:bg-bitcoinOrange/5 transition-all text-center group"
                  >
                    <div className="font-semibold text-foreground group-hover:text-bitcoinOrange">
                      {formattedAmount}
                    </div>
                    <div className="text-xs text-muted-dim mt-0.5">≈ {btcDisplay}</div>
                    <div className="text-xs text-muted-foreground mt-1">{label}</div>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Click to copy address with suggested amount reminder
            </p>
          </div>
        </section>
      )}

      {lightningAddress && (
        <section className="mt-6" aria-labelledby="lightning-heading">
          <h3 id="lightning-heading" className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Zap className="w-5 h-5 text-bitcoin-orange" aria-hidden="true" />
            Lightning Payment
          </h3>
          <LightningPayment
            recipientAddress={lightningAddress}
            projectTitle={projectTitle}
            projectId={projectId}
          />
          <div className="mt-3 bg-muted rounded-lg p-3 border border-border">
            <div className="flex items-center justify-between gap-4">
              <code
                className="text-xs font-mono text-muted-foreground break-all"
                aria-label={`Lightning address: ${lightningAddress}`}
              >
                {lightningAddress}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(lightningAddress, 'Lightning address')}
                aria-label="Copy Lightning address to clipboard"
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
