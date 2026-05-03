'use client';

import { Bitcoin, Heart, Copy, ShieldCheck, Zap } from 'lucide-react';
import BitcoinPaymentButton from '@/components/bitcoin/BitcoinPaymentButton';
import LightningPayment from '@/components/lightning/LightningPayment';
import Button from '@/components/ui/Button';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { WishlistDonationTiers } from '@/components/wishlist/WishlistDonationTiers';
import { convert, formatCurrency } from '@/services/currency';
import { ENTITY_REGISTRY } from '@/config/entity-registry';
import { useProjectDonation } from './useProjectDonation';

interface ProjectDonationSectionProps {
  projectId: string;
  ownerId?: string;
  bitcoinAddress: string | null;
  lightningAddress: string | null;
  projectTitle?: string;
  isOwner?: boolean;
}

const SUGGESTED_AMOUNTS_SATS = [
  { sats: 100_000, label: 'Small' },
  { sats: 500_000, label: 'Medium' },
  { sats: 1_000_000, label: 'Large' },
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
                  ? 'bg-red-500 hover:bg-red-600 text-white border-red-500'
                  : 'border-gray-300 hover:border-red-300 hover:text-red-600'
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
              href="/auth?from=favorite"
              variant="outline"
              className="flex-1 flex items-center justify-center gap-2 border-gray-300 hover:border-red-300 hover:text-red-600"
              aria-label="Sign in to favorite this project"
            >
              <Heart className="w-4 h-4" aria-hidden="true" />
              <span>Sign in to Favorite</span>
            </Button>
          )}

          {(bitcoinAddress || lightningAddress) && (
            <div className="flex-1">
              <div className="hidden sm:block">
                <BitcoinPaymentButton
                  projectId={projectId}
                  projectTitle={projectTitle}
                  suggestedAmount={10000}
                  recipientAddress={bitcoinAddress || undefined}
                />
              </div>
              <div className="sm:hidden">
                <Button
                  onClick={() => {
                    const supportSection = document.getElementById('bitcoin-donation-section');
                    if (supportSection) {
                      supportSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                  aria-label="Scroll to Bitcoin funding section"
                >
                  <Bitcoin className="w-4 h-4 mr-2" aria-hidden="true" />
                  Fund with Bitcoin
                </Button>
              </div>
            </div>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-3">
          {user
            ? isFavorited
              ? 'You can find this project in your Favorites to support later.'
              : 'Save this project to your favorites to support later, or fund now.'
            : 'Sign in to save this project to your favorites and support later.'}
        </p>
      </section>

      {bitcoinAddress && (
        <section
          id="bitcoin-donation-section"
          className="border-t pt-6"
          aria-labelledby="bitcoin-heading"
        >
          <h3 id="bitcoin-heading" className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Bitcoin className="w-5 h-5 text-bitcoinOrange" aria-hidden="true" />
            Fund with Bitcoin
          </h3>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex flex-col items-center justify-center bg-white p-6 rounded-lg border border-gray-200">
              <div className="bg-white p-3 rounded-lg shadow-sm">
                <QRCodeSVG
                  value={`bitcoin:${bitcoinAddress}`}
                  size={180}
                  level="H"
                  includeMargin={true}
                  className="w-full h-auto"
                />
              </div>
              <p className="text-xs text-center text-gray-500 mt-3">
                Scan with your Bitcoin wallet
              </p>
            </div>

            <div className="flex flex-col justify-center">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <label className="text-xs font-medium text-gray-600 mb-2 block uppercase tracking-wide">
                  Bitcoin Address
                </label>
                <div className="flex items-start gap-2">
                  <code className="text-sm font-mono text-gray-900 break-all flex-1 leading-relaxed">
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
              <div className="flex items-center gap-2 mt-3 text-sm text-gray-600">
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
                recipientAddress={bitcoinAddress || lightningAddress || undefined}
              />
            </div>
          )}

          <div className="mt-6 border-t pt-6">
            <p className="text-sm font-medium text-gray-700 mb-3">
              {ownerId && !isOwner ? 'Other amounts:' : 'Suggested support amounts:'}
            </p>
            <div className="grid grid-cols-3 gap-3">
              {SUGGESTED_AMOUNTS_SATS.map(({ sats, label }) => {
                const displayAmount = convert(sats, 'SATS', userCurrency);
                const formattedAmount = formatCurrency(displayAmount, userCurrency, {
                  compact: true,
                });
                const satsDisplay = formatCurrency(sats, 'SATS', { compact: true });

                return (
                  <button
                    key={sats}
                    onClick={() => {
                      copyToClipboard(bitcoinAddress, 'Bitcoin address');
                      toast.success(`Address copied! Send ${satsDisplay}`, {
                        description: `Suggested ${label.toLowerCase()} support (≈ ${formattedAmount})`,
                      });
                    }}
                    className="px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-all text-center group"
                  >
                    <div className="font-semibold text-gray-900 group-hover:text-orange-700">
                      {formattedAmount}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">≈ {satsDisplay}</div>
                    <div className="text-xs text-gray-500 mt-1">{label}</div>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-3 text-center">
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
          <div className="mt-3 bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div className="flex items-center justify-between gap-4">
              <code
                className="text-xs font-mono text-gray-600 break-all"
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
