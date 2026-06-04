import { Metadata } from 'next';
import Link from 'next/link';
import { Bitcoin, Shield, Zap, Lock, Globe, Code, Server, CheckCircle } from 'lucide-react';
import { ROUTES } from '@/config/routes';

export const metadata: Metadata = {
  title: 'Technology',
  description:
    'Learn about the technology powering OrangeCat - Bitcoin-native economic infrastructure with transparency, security, and zero platform fees.',
  openGraph: {
    title: 'Our Technology',
    description: 'Bitcoin-native economic infrastructure built on modern web technology',
    type: 'website',
  },
};

/**
 * /technology — monochrome surfaces, single Bitcoin Orange accent for
 * actual Bitcoin elements (the chip icon + the Bitcoin tech-stack card).
 * Every other icon flows through fg-secondary; check marks through
 * status-positive. Migration 6/N.
 */
export default function TechnologyPage() {
  return (
    <div className="min-h-screen bg-surface-page">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-background border-b border-border">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground mb-6">
              <Bitcoin className="h-4 w-4 text-bitcoinOrange" />
              Bitcoin-native
            </div>
            <h1 className="font-heading tracking-display text-4xl font-bold sm:text-5xl lg:text-6xl text-foreground">
              Built on Bitcoin
            </h1>
            <p className="mt-6 max-w-3xl mx-auto text-xl text-muted-foreground">
              Direct, transparent, and unstoppable economic participation powered by the
              world&apos;s most secure network
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Core Principles */}
        <div className="mb-20">
          <h2 className="text-2xl font-semibold text-foreground mb-8 text-center">
            Core Principles
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-card p-6 rounded-lg shadow-sm border border-border-subtle">
              <Bitcoin className="h-12 w-12 text-bitcoinOrange mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Bitcoin-Native</h3>
              <p className="text-muted-foreground">
                True peer-to-peer payments with no intermediaries. Your Bitcoin, your control.
              </p>
            </div>

            <div className="bg-card p-6 rounded-lg shadow-sm border border-border-subtle">
              <Shield className="h-12 w-12 text-fg-secondary mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Transparent</h3>
              <p className="text-muted-foreground">
                All transactions are publicly verifiable on the Bitcoin blockchain. No hidden fees.
              </p>
            </div>

            <div className="bg-card p-6 rounded-lg shadow-sm border border-border-subtle">
              <Zap className="h-12 w-12 text-fg-secondary mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Zero Platform Fees</h3>
              <p className="text-muted-foreground">
                We don&apos;t take a cut. Payments go directly between parties — 100% reaches the
                recipient.
              </p>
            </div>
          </div>
        </div>

        {/* Tech Stack */}
        <div className="mb-20">
          <h2 className="text-2xl font-semibold text-foreground mb-8 text-center">
            Technology Stack
          </h2>
          <div className="bg-card rounded-lg shadow-sm p-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Frontend */}
              <div>
                <div className="flex items-center mb-4">
                  <Globe className="h-6 w-6 text-fg-secondary mr-2" />
                  <h3 className="text-lg font-semibold text-foreground">Frontend</h3>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-status-positive mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium">Next.js 15</span>
                      <p className="text-sm text-muted-foreground">
                        Modern React framework with App Router
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-status-positive mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium">TypeScript</span>
                      <p className="text-sm text-muted-foreground">Type-safe development</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-status-positive mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium">Tailwind CSS</span>
                      <p className="text-sm text-muted-foreground">
                        Responsive, mobile-first design
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Backend */}
              <div>
                <div className="flex items-center mb-4">
                  <Server className="h-6 w-6 text-fg-secondary mr-2" />
                  <h3 className="text-lg font-semibold text-foreground">Backend</h3>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-status-positive mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium">Supabase</span>
                      <p className="text-sm text-muted-foreground">
                        PostgreSQL database with real-time capabilities
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-status-positive mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium">Row Level Security</span>
                      <p className="text-sm text-muted-foreground">Database-level authorization</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-status-positive mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium">Edge Functions</span>
                      <p className="text-sm text-muted-foreground">Serverless API endpoints</p>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Bitcoin */}
              <div>
                <div className="flex items-center mb-4">
                  <Bitcoin className="h-6 w-6 text-bitcoinOrange mr-2" />
                  <h3 className="text-lg font-semibold text-foreground">Bitcoin Integration</h3>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-status-positive mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium">Native Bitcoin Addresses</span>
                      <p className="text-sm text-muted-foreground">
                        Direct wallet-to-wallet transfers
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-status-positive mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium">Lightning Network Ready</span>
                      <p className="text-sm text-muted-foreground">Fast, low-cost micropayments</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-status-positive mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium">Non-Custodial</span>
                      <p className="text-sm text-muted-foreground">You control your private keys</p>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Security */}
              <div>
                <div className="flex items-center mb-4">
                  <Lock className="h-6 w-6 text-fg-secondary mr-2" />
                  <h3 className="text-lg font-semibold text-foreground">Security</h3>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-status-positive mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium">Transport Encryption (TLS 1.3)</span>
                      <p className="text-sm text-muted-foreground">
                        Secure data transmission; E2E messaging planned
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-status-positive mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium">OAuth 2.0</span>
                      <p className="text-sm text-muted-foreground">Secure authentication</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-status-positive mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium">HTTPS Only</span>
                      <p className="text-sm text-muted-foreground">Encrypted connections</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Open Source */}
        <div className="bg-muted/40 rounded-lg p-6 text-center">
          <Code className="h-16 w-16 text-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-foreground mb-4">Open Source Philosophy</h2>
          <p className="text-lg text-muted-strong mb-6 max-w-3xl mx-auto">
            We believe in transparency and community-driven development. Our code is open for
            review, contributions, and audits by the Bitcoin community.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href={ROUTES.DISCOVER}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-background bg-foreground hover:bg-muted-strong"
            >
              Discover Projects
            </Link>
            <Link
              href={ROUTES.FAQ}
              className="inline-flex items-center px-6 py-3 border border-border-strong text-base font-medium rounded-md text-foreground bg-card hover:bg-muted"
            >
              Learn More
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
