'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Bitcoin, ArrowLeft, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GRADIENTS } from '@/config/gradients';
import { BitcoinBadge } from '@/components/ui/BitcoinBadge';
import { walletOptions } from './config';
import { ProgressSteps } from './ProgressSteps';
import { WalletCard } from './WalletCard';
import { WalletDetail } from './WalletDetail';
import { FAQSection } from './FAQSection';
import { GetStartedCTA } from './GetStartedCTA';

export default function BitcoinWalletGuidePage() {
  const [selectedWallet, setSelectedWallet] = useState<string>('brave');
  const [currentStep, setCurrentStep] = useState(0);

  const selectedWalletData = walletOptions.find(w => w.id === selectedWallet);

  return (
    <div className={cn(GRADIENTS.pageBgOrange, 'min-h-screen')}>
      {/* Header */}
      <div className="bg-card border-b border-orange-100 dark:border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link
              href="/"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to OrangeCat
            </Link>
            <BitcoinBadge variant="outline">Bitcoin Wallet Guide</BitcoinBadge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-3 p-4 rounded-lg mb-6 bg-bitcoinOrange/10 text-bitcoinOrange border-bitcoinOrange/20">
            <Bitcoin className="w-12 h-12" />
            <div className="text-left">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                Get Your Bitcoin Wallet
              </h1>
              <p className="text-lg text-muted-foreground mt-2">
                Start receiving Bitcoin funding on OrangeCat
              </p>
            </div>
          </div>

          <div className="bg-tiffany-50 border border-tiffany-200 rounded-lg p-4 max-w-3xl mx-auto">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-tiffany-600 mt-0.5 flex-shrink-0" />
              <div className="text-left">
                <h3 className="font-semibold text-tiffany-900 mb-1">New to Bitcoin?</h3>
                <p className="text-tiffany-800 text-sm">
                  A Bitcoin wallet is like a digital bank account that lets you receive, store, and
                  send Bitcoin. You control your wallet completely - no bank or company can freeze
                  your funds.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        <ProgressSteps currentStep={currentStep} onStepClick={setCurrentStep} />

        {/* Wallet picker + detail */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-semibold text-foreground mb-6">Choose Your Wallet</h2>
            <div className="space-y-4">
              {walletOptions.map(wallet => (
                <WalletCard
                  key={wallet.id}
                  wallet={wallet}
                  isSelected={selectedWallet === wallet.id}
                  onSelect={setSelectedWallet}
                />
              ))}
            </div>
          </div>

          <div className="lg:col-span-1">
            {selectedWalletData && <WalletDetail wallet={selectedWalletData} />}
          </div>
        </div>

        <FAQSection />
        <GetStartedCTA onGetWallet={() => setCurrentStep(1)} />
      </div>
    </div>
  );
}
