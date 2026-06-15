'use client';

import { useState, useMemo } from 'react';
import Button from '@/components/ui/Button';
import { RecommendedWalletCard } from './RecommendedWalletCard';
import { WalletRecommendationFilterBar } from './WalletRecommendationFilterBar';
import type { RecommendedWallet } from './RecommendedWalletCard';
import type { RecommendationFilters } from './WalletRecommendationFilterBar';

const WALLETS: RecommendedWallet[] = [
  {
    name: 'BlueWallet',
    description: 'Best all-around mobile wallet with easy Lightning and on-chain support',
    platform: 'mobile',
    level: 'beginner',
    lightning: true,
    custodial: false,
    downloadLinks: {
      ios: 'https://apps.apple.com/app/bluewallet-bitcoin-wallet/id1376878040',
      android: 'https://play.google.com/store/apps/details?id=io.bluewallet.bluewallet',
    },
    website: 'https://bluewallet.io',
    recommended: true,
  },
  {
    name: 'Phoenix Wallet',
    description: 'Simple mobile Lightning wallet with automatic channel management',
    platform: 'mobile',
    level: 'beginner',
    lightning: true,
    custodial: false,
    downloadLinks: {
      ios: 'https://apps.apple.com/app/phoenix-wallet/id6449854979',
      android: 'https://phoenix.acinq.co',
    },
    website: 'https://phoenix.acinq.co',
    recommended: true,
  },
  {
    name: 'Breez',
    description: 'Non-custodial Lightning wallet with creator tools and instant payments',
    platform: 'mobile',
    level: 'beginner',
    lightning: true,
    custodial: false,
    downloadLinks: {
      ios: 'https://apps.apple.com/app/breez-lightning-client-pos/id1473040547',
      android: 'https://play.google.com/store/apps/details?id=com.breez.client',
    },
    website: 'https://breez.technology',
    recommended: false,
  },
  {
    name: 'Electrum',
    description: 'Powerful, lightweight desktop wallet with advanced features',
    platform: 'desktop',
    level: 'advanced',
    lightning: false,
    custodial: false,
    website: 'https://electrum.org',
    downloadLinks: {},
    recommended: false,
  },
  {
    name: 'Sparrow Wallet',
    description: 'Privacy-focused desktop wallet with CoinJoin and full control',
    platform: 'desktop',
    level: 'advanced',
    lightning: false,
    custodial: false,
    website: 'https://sparrowwallet.com',
    downloadLinks: {},
    recommended: false,
  },
];

export default function WalletRecommendationCards() {
  const [filters, setFilters] = useState<RecommendationFilters>({
    platform: [],
    level: [],
    lightning: false,
  });

  const togglePlatform = (platform: 'mobile' | 'desktop') => {
    setFilters(prev => ({
      ...prev,
      platform: prev.platform.includes(platform)
        ? prev.platform.filter(p => p !== platform)
        : [...prev.platform, platform],
    }));
  };

  const toggleLevel = (level: 'beginner' | 'advanced') => {
    setFilters(prev => ({
      ...prev,
      level: prev.level.includes(level)
        ? prev.level.filter(l => l !== level)
        : [...prev.level, level],
    }));
  };

  const toggleLightning = () => {
    setFilters(prev => ({ ...prev, lightning: !prev.lightning }));
  };

  const resetFilters = () => {
    setFilters({ platform: [], level: [], lightning: false });
  };

  const hasActiveFilters =
    filters.platform.length > 0 || filters.level.length > 0 || filters.lightning;

  const filteredWallets = useMemo(() => {
    const result = WALLETS.filter(wallet => {
      if (filters.platform.length > 0 && !filters.platform.includes(wallet.platform)) {
        return false;
      }
      if (filters.level.length > 0 && !filters.level.includes(wallet.level)) {
        return false;
      }
      if (filters.lightning && !wallet.lightning) {
        return false;
      }
      return true;
    });

    result.sort((a, b) => {
      if (!hasActiveFilters && a.recommended !== b.recommended) {
        return a.recommended ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [filters, hasActiveFilters]);

  return (
    <div className="w-full">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-fg-primary mb-2">
          Find the perfect Bitcoin wallet for receiving funding
        </h2>
        <p className="text-fg-secondary">
          All recommendations are non-custodial — you control your keys. We connect directly for
          transparent autoposting.
        </p>
      </div>

      <WalletRecommendationFilterBar
        filters={filters}
        hasActiveFilters={hasActiveFilters}
        onTogglePlatform={togglePlatform}
        onToggleLevel={toggleLevel}
        onToggleLightning={toggleLightning}
        onReset={resetFilters}
      />

      {filteredWallets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWallets.map(wallet => (
            <RecommendedWalletCard key={wallet.name} wallet={wallet} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-fg-secondary mb-4">No wallets match your filters.</p>
          <Button onClick={resetFilters} variant="outline" size="sm">
            Reset filters
          </Button>
        </div>
      )}
    </div>
  );
}
