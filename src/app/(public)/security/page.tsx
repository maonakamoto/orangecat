import React from 'react';
import Link from 'next/link';
import { Shield, Lock, Eye, Server, Key, AlertTriangle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { ROUTES } from '@/config/routes';

export const metadata = {
  title: 'Security',
  description:
    "Learn about OrangeCat's security practices, data protection, and commitment to user privacy",
};

/**
 * /security — monochrome surfaces, neutral feature cards, single
 * warm-accent CTA on 'Report Security Issue'. Migration 6/N.
 */
export default function SecurityPage() {
  const securityFeatures = [
    {
      icon: Lock,
      title: 'Transport Encryption',
      description:
        'All data transmission is encrypted using industry-standard TLS 1.3 protocols. E2E messaging encryption is planned.',
    },
    {
      icon: Key,
      title: 'Self-Custody Bitcoin',
      description:
        'We never hold your Bitcoin. You maintain full control over your private keys and funds.',
    },
    {
      icon: Shield,
      title: 'Row Level Security',
      description: 'Database-level authorization ensures users can only access their own data.',
    },
    {
      icon: Server,
      title: 'Secure Infrastructure',
      description: 'Hosted on enterprise-grade cloud infrastructure with 99.9% uptime SLA.',
    },
    {
      icon: Eye,
      title: 'Transparency',
      description: 'Open source codebase allows for public security audits and community review.',
    },
    {
      icon: AlertTriangle,
      title: 'Security Monitoring',
      description: '24/7 monitoring and automated alerts for suspicious activity.',
    },
  ];

  const securityPractices = [
    {
      title: 'Authentication & Authorization',
      items: [
        'Multi-factor authentication support',
        'Secure password hashing with bcrypt',
        'Session management with automatic expiration',
        'OAuth 2.0 integration for social login',
      ],
    },
    {
      title: 'Data Protection',
      items: [
        'Personal data encryption at rest',
        'Regular security audits and penetration testing',
        'GDPR compliance for EU users',
        'Data minimization principles',
      ],
    },
    {
      title: 'Bitcoin Security',
      items: [
        'No custody of user funds',
        'Support for hardware wallet integration',
        'Lightning Network payment security',
        'Transaction transparency on blockchain',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-surface-page">
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <Shield className="w-16 h-16 text-fg-secondary" />
          </div>
          <h1 className="font-heading tracking-display text-4xl font-bold text-foreground mb-4">
            Security &amp; Privacy
          </h1>
          <p className="text-xl text-muted-foreground">
            Your security and privacy are our top priorities at OrangeCat
          </p>
        </div>

        {/* Security Overview */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-8">
          <h2 className="text-2xl font-semibold text-foreground mb-4">Our Security Philosophy</h2>
          <p className="text-muted-strong mb-6">
            OrangeCat is built on Bitcoin-first principles, which means we prioritize
            decentralization, self-custody, and transparency. We never hold your funds, and we
            design our systems to minimize the data we collect while maximizing security.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-muted/40 border border-border-subtle p-6 rounded-lg">
              <h3 className="font-semibold text-foreground mb-2">Bitcoin Security</h3>
              <p className="text-muted-foreground text-sm">
                Your Bitcoin remains under your control. We facilitate payments but never custody
                funds.
              </p>
            </div>
            <div className="bg-muted/40 border border-border-subtle p-6 rounded-lg">
              <h3 className="font-semibold text-foreground mb-2">Data Minimization</h3>
              <p className="text-muted-foreground text-sm">
                We collect only the minimum data necessary to provide our services.
              </p>
            </div>
          </div>
        </div>

        {/* Security Features Grid */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-8 text-center">
            Security Features
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {securityFeatures.map((feature, index) => (
              <div key={index} className="bg-card rounded-lg shadow-sm border border-border p-6">
                <div className="flex items-center mb-4">
                  <feature.icon className="w-8 h-8 text-fg-secondary mr-3" />
                  <h3 className="font-semibold text-foreground">{feature.title}</h3>
                </div>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Security Practices */}
        <div className="space-y-8">
          {securityPractices.map((practice, index) => (
            <div key={index} className="bg-card rounded-lg shadow-sm border border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-6">{practice.title}</h3>
              <ul className="space-y-3">
                {practice.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="flex items-start">
                    <div className="w-2 h-2 bg-foreground rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <span className="text-muted-strong">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contact Section — public-surface band per FleetCrown pattern */}
        <div className="mt-12 bg-surface-public text-fg-inverted rounded-lg p-6">
          <div className="text-center">
            <h3 className="font-heading tracking-display text-2xl font-bold mb-4">
              Security Concerns?
            </h3>
            <p className="mb-6 text-fg-inverted/70">
              If you have security concerns or believe you&apos;ve discovered a vulnerability,
              please contact us immediately.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="mailto:security@orangecat.ch">
                <Button variant="accent" size="lg">
                  Report Security Issue
                </Button>
              </a>
              <Link href={ROUTES.DOCS}>
                <Button variant="outline" size="lg">
                  View Documentation
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Last Updated */}
        <div className="mt-8 text-center text-muted-foreground">
          <p className="text-sm">
            This security page was last updated on {new Date().toLocaleDateString()}. Our security
            practices are continuously reviewed and updated.
          </p>
        </div>
      </div>
    </div>
  );
}
