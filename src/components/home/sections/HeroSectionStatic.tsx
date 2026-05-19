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
    <section className="relative overflow-hidden bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Left Column - Content */}
          <div>
            {/* Trust Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border mb-6">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-sm font-medium text-foreground">Create anything</span>
              </div>
              <span className="text-muted-dim">•</span>
              <span className="text-sm font-medium text-foreground">Any identity</span>
              <span className="text-muted-dim">•</span>
              <span className="text-sm font-medium text-foreground">Zero fees</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-foreground leading-tight mb-4 sm:mb-6">
              Everyone Can <span className="text-foreground">Make Things.</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl lg:text-2xl text-muted-foreground leading-relaxed mb-3 sm:mb-4">
              Create products, services, projects, causes, events, loans — with your own AI, under
              any identity, in any currency.
            </p>

            {/* Supporting text */}
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-6 sm:mb-8">
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
                <div key={benefit.text} className="flex items-center gap-2 text-muted-foreground">
                  <benefit.icon className="w-4 h-4 text-foreground flex-shrink-0" />
                  <span className="text-sm font-medium">{benefit.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column - Visual Demo */}
          <div className="relative">
            {/* Demo Card */}
            <div className="relative bg-card rounded-lg border border-border shadow-sm">
              {/* Card Header */}
              <div className="p-4 sm:p-6 border-b border-border">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full ${GRADIENTS.brandTiffanyBr} flex items-center justify-center text-xl sm:text-2xl flex-shrink-0`}
                  >
                    🐱
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm sm:text-base">Cat</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Your AI economic agent
                    </p>
                  </div>
                  <div className="hidden sm:flex items-center rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground">
                    0% fees
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
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-foreground" />
                      </div>
                      {feature}
                    </div>
                  ))}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-1 sm:pt-2">
                  <div>
                    <div className="text-xl sm:text-2xl font-bold text-foreground">0%</div>
                    <div className="text-xs text-muted-foreground">Platform Fees</div>
                  </div>
                  <div>
                    <div className="text-xl sm:text-2xl font-bold text-foreground">100%</div>
                    <div className="text-xs text-muted-foreground">To Creator</div>
                  </div>
                </div>

                {/* CTA Button in Demo */}
                <Link
                  href={ROUTES.DISCOVER}
                  className="block w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-foreground text-background text-sm sm:text-base font-semibold rounded-lg hover:bg-muted-strong transition-colors duration-150 flex items-center justify-center gap-2"
                >
                  <Cat className="w-4 h-4 sm:w-5 sm:h-5" />
                  Explore Platform
                </Link>

                <div className="flex flex-wrap gap-2 text-xs font-medium">
                  <span className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-foreground">
                    AI-powered
                  </span>
                  <span className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-foreground">
                    Non-custodial
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
