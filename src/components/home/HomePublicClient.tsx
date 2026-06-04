'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import HeroSectionStatic from '@/components/home/sections/HeroSectionStatic';

// Lazy load non-critical sections
// Hero loads immediately for good FCP, rest loads as user scrolls
const WhatCanYouDoSection = dynamic(
  () => import('@/components/home/sections/WhatCanYouDoSection'),
  {
    loading: () => <div className="h-96 bg-surface-raised animate-pulse" />,
  }
);

const ProofSection = dynamic(() => import('@/components/home/sections/ProofSection'), {
  loading: () => <div className="h-96 bg-surface-raised animate-pulse" />,
});

const HowItWorksSection = dynamic(() => import('@/components/home/sections/HowItWorksSection'), {
  loading: () => <div className="h-96 bg-surface-raised animate-pulse" />,
});

const TransparencySection = dynamic(
  () => import('@/components/home/sections/TransparencySection'),
  {
    loading: () => <div className="h-96 bg-surface-raised animate-pulse" />,
  }
);

const TrustSection = dynamic(() => import('@/components/home/sections/TrustSection'), {
  loading: () => <div className="h-96 bg-surface-raised animate-pulse" />,
});

/**
 * Home Public Client - Progressive Loading Strategy
 *
 * Performance Optimization:
 * - Hero section loads immediately (critical for FCP)
 * - Below-fold sections lazy load (saves ~60KB initial bundle)
 * - Skeleton loaders provide visual feedback
 * - Sections load as user scrolls down
 *
 * Expected improvement: -1.5s FCP, -60KB bundle
 */
export default function HomePublicClient() {
  return (
    <div className="min-h-screen">
      {/* Hero Section - Above the fold, loads immediately */}
      <HeroSectionStatic />

      {/* Below-fold sections - lazy loaded; uniform monochrome skeleton per migration 6/N */}
      <Suspense fallback={<div className="h-96 bg-surface-raised animate-pulse" />}>
        <WhatCanYouDoSection />
      </Suspense>

      <Suspense fallback={<div className="h-96 bg-surface-raised animate-pulse" />}>
        <ProofSection />
      </Suspense>

      <Suspense fallback={<div className="h-96 bg-surface-raised animate-pulse" />}>
        <HowItWorksSection />
      </Suspense>

      <Suspense fallback={<div className="h-96 bg-surface-raised animate-pulse" />}>
        <TransparencySection />
      </Suspense>

      <Suspense fallback={<div className="h-96 bg-surface-raised animate-pulse" />}>
        <TrustSection />
      </Suspense>
    </div>
  );
}
