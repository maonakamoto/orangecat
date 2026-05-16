'use client';

import Link from 'next/link';
import Button from '@/components/ui/Button';
import WalletRecommendationCards from '@/components/wallets/WalletRecommendationCards';
import { ROUTES } from '@/config/routes';

/**
 * Wallets Page
 *
 * Public page helping users find and get a Bitcoin wallet.
 * Features the new WalletRecommendationCards component with filtering.
 */
export default function WalletsPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-foreground">
          Get a Bitcoin Wallet
        </h1>
        <p className="text-gray-600 dark:text-muted-foreground mt-2">
          No wallet yet? Start here. Pick a beginner-friendly option and you'll be ready in minutes.
        </p>
      </div>

      {/* Wallet Recommendation Cards with Filtering */}
      <WalletRecommendationCards />

      {/* Educational Section */}
      <div className="mt-10 p-6 rounded-lg bg-orange-50 border border-orange-200">
        <h4 className="font-semibold text-gray-900 dark:text-foreground mb-2">What is a wallet?</h4>
        <p className="text-sm text-gray-700 dark:text-muted-foreground mb-3">
          A Bitcoin wallet lets you receive payments. It gives you a Bitcoin address (looks like
          bc1...) and often a Lightning address (looks like email). You control it. We don't keep
          your funds.
        </p>
        <div className="text-sm text-gray-700 dark:text-muted-foreground">
          <div className="mb-1">
            • On-chain address: starts with bc1, slower, best for larger amounts.
          </div>
          <div className="mb-1">
            • Lightning address: looks like email, instant and low-fee, great for smaller amounts.
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-6 text-center">
        <Link href={ROUTES.CREATE}>
          <Button>Get started</Button>
        </Link>
      </div>
    </div>
  );
}
