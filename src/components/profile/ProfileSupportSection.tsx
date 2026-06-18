'use client';

/**
 * ProfileSupportSection
 *
 * The "send this person BTC" surface on a public profile. Previously this was a
 * stub: a Donate/Subscribe toggle that only revealed the raw address to copy,
 * shipped with developer notes-to-self ("real engine integrates the full
 * PublicEntityPaymentSection…", "Full engine would create subscription row…")
 * that were visible to real visitors. It made the platform's single most
 * important action look fake. Replaced with the real BitcoinDonationCard — an
 * always-visible QR, click-to-copy address, and one-tap "Send with Wallet"
 * (bitcoin: URI), for both on-chain and Lightning.
 *
 * Renders nothing when the profile has no payment address (the owner is prompted
 * to add one on the Wallets tab, which knows it's their own profile).
 */

import BitcoinDonationCard from '@/components/bitcoin/BitcoinDonationCard';

interface ProfileSupportSectionProps {
  profile: {
    bitcoin_address: string | null;
    lightning_address: string | null;
  };
}

export function ProfileSupportSection({ profile }: ProfileSupportSectionProps) {
  if (!profile.bitcoin_address && !profile.lightning_address) {
    return null;
  }

  return (
    <BitcoinDonationCard
      bitcoinAddress={profile.bitcoin_address || undefined}
      lightningAddress={profile.lightning_address || undefined}
    />
  );
}
