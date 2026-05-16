'use client';

import Link from 'next/link';
import { ArrowRight, Globe, Zap, Cat, Plus } from 'lucide-react';
import Button from '@/components/ui/Button';
import { GRADIENTS } from '@/config/gradients';
import { ROUTES } from '@/config/routes';

/**
 * Static Hero Section - Renders immediately without animations
 * This provides instant content while the animated version loads
 */
export default function HeroSectionStatic() {
  return (
    <section className={`relative overflow-hidden ${GRADIENTS.heroSection}`}>
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-t from-white/20 via-transparent to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Left Column - Content */}
          <div>
            {/* Trust Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 dark:bg-card/60 backdrop-blur-sm border border-orange-200/50 dark:border-border/50 mb-6">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-sm font-medium text-gray-700 dark:text-foreground">
                  Create anything
                </span>
              </div>
              <span className="text-gray-400 dark:text-muted-foreground">•</span>
              <span className="text-sm font-medium text-gray-700 dark:text-foreground">
                Any identity
              </span>
              <span className="text-gray-400 dark:text-muted-foreground">•</span>
              <span className="text-sm font-medium text-gray-700 dark:text-foreground">
                Zero fees
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-foreground leading-tight mb-4 sm:mb-6">
              Everyone Can{' '}
              <span className="bg-gradient-to-r from-tiffany-500 to-tiffany-700 bg-clip-text text-transparent">
                Make Things.
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl lg:text-2xl text-gray-600 dark:text-muted-foreground leading-relaxed mb-3 sm:mb-4">
              Create products, services, projects, causes, events, loans — with your own AI, under
              any identity, in any currency.
            </p>

            {/* Supporting text */}
            <p className="text-base sm:text-lg text-gray-600 dark:text-muted-foreground leading-relaxed mb-6 sm:mb-8">
              OrangeCat gives every person and organization an AI agent to create and participate in
              the full economic spectrum. No gatekeepers. No fees. Bitcoin-native, but not
              Bitcoin-only.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8">
              <Link href={ROUTES.AUTH} className="w-full sm:w-auto">
                <Button variant="gradient" size="lg" className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  Start Creating
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </Link>
              <Link href={ROUTES.DISCOVER} className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  <Globe className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  Discover
                </Button>
              </Link>
            </div>

            {/* Key Benefits */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: Plus, text: 'Create anything' },
                { icon: Globe, text: 'Any currency' },
                { icon: Zap, text: 'Zero fees' },
              ].map(benefit => (
                <div
                  key={benefit.text}
                  className="flex items-center gap-2 text-gray-600 dark:text-muted-foreground"
                >
                  <benefit.icon className="w-4 h-4 text-tiffany-600 flex-shrink-0" />
                  <span className="text-sm font-medium">{benefit.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column - Visual Demo */}
          <div className="relative">
            {/* Demo Card */}
            <div className="relative bg-white dark:bg-card rounded-xl sm:rounded-2xl shadow-2xl border border-gray-200 dark:border-border overflow-hidden">
              {/* Card Header */}
              <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-border">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full ${GRADIENTS.brandTiffanyBr} flex items-center justify-center text-xl sm:text-2xl flex-shrink-0`}
                  >
                    🐱
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-foreground text-sm sm:text-base">
                      My Cat
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-muted-foreground">
                      Your AI economic agent
                    </p>
                  </div>
                </div>
              </div>

              {/* Card Content */}
              <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                {/* Platform capabilities */}
                <div className="space-y-2">
                  {[
                    'Create products, projects, causes',
                    'Any currency accepted',
                    'AI-powered by your Cat',
                  ].map(feature => (
                    <div
                      key={feature}
                      className="flex items-center gap-2 text-sm text-gray-600 dark:text-muted-foreground"
                    >
                      <div className="w-4 h-4 rounded-full bg-tiffany-100 flex items-center justify-center flex-shrink-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-tiffany-500" />
                      </div>
                      {feature}
                    </div>
                  ))}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-1 sm:pt-2">
                  <div>
                    <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-foreground">
                      0%
                    </div>
                    <div className="text-xs text-gray-600 dark:text-muted-foreground">
                      Platform Fees
                    </div>
                  </div>
                  <div>
                    <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-foreground">
                      100%
                    </div>
                    <div className="text-xs text-gray-600 dark:text-muted-foreground">
                      To Creator
                    </div>
                  </div>
                </div>

                {/* CTA Button in Demo */}
                <Link
                  href={ROUTES.DISCOVER}
                  className={`block w-full px-3 sm:px-4 py-2.5 sm:py-3 ${GRADIENTS.brandTiffany} text-white text-sm sm:text-base font-semibold rounded-lg hover:from-tiffany-600 hover:to-tiffany-700 transition-all duration-200 flex items-center justify-center gap-2`}
                >
                  <Cat className="w-4 h-4 sm:w-5 sm:h-5" />
                  Explore Platform
                </Link>
              </div>

              {/* Floating badges */}
              <div className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3 px-2 py-1 sm:px-3 sm:py-1.5 bg-green-500 text-white text-2xs sm:text-xs font-semibold rounded-full shadow-lg">
                ✓ 0% Fees
              </div>

              <div className="absolute -bottom-2 -left-2 sm:-bottom-3 sm:-left-3 px-2 py-1 sm:px-3 sm:py-1.5 bg-tiffany-500 text-white text-2xs sm:text-xs font-semibold rounded-full shadow-lg">
                🐱 AI-powered
              </div>
            </div>

            {/* Background decoration dots */}
            <div className="absolute -z-10 -top-4 -right-4 w-24 h-24 bg-tiffany-400/20 rounded-full blur-2xl" />
            <div className="absolute -z-10 -bottom-4 -left-4 w-32 h-32 bg-tiffany-400/20 rounded-full blur-2xl" />
          </div>
        </div>
      </div>
    </section>
  );
}
