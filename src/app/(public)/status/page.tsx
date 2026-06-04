import { CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { checkHealth } from '@/lib/health';
import { ROUTES } from '@/config/routes';
import type { ServiceStatus } from '@/lib/health';

export const metadata = {
  title: 'System Status',
  description: 'Current system status for OrangeCat platform services.',
};

// Revalidate every 30 seconds so stale data doesn't persist
export const revalidate = 30;

function StatusBadge({ status }: { status: ServiceStatus }) {
  if (status === 'operational') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-status-positive bg-status-positive-subtle">
        Operational
      </span>
    );
  }
  if (status === 'degraded') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-status-warning bg-status-warning-subtle">
        Degraded
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-status-negative bg-status-negative-subtle">
      Outage
    </span>
  );
}

function StatusIcon({ status, size = 'sm' }: { status: ServiceStatus; size?: 'sm' | 'lg' }) {
  const cls = size === 'lg' ? 'w-8 h-8' : 'w-5 h-5';
  if (status === 'operational') {
    return <CheckCircle className={`${cls} text-status-positive`} />;
  }
  if (status === 'degraded') {
    return <AlertTriangle className={`${cls} text-status-warning`} />;
  }
  return <XCircle className={`${cls} text-status-negative`} />;
}

function overallMessage(status: ServiceStatus) {
  if (status === 'operational') {
    return {
      title: 'All Systems Operational',
      body: 'All OrangeCat services are running normally.',
    };
  }
  if (status === 'degraded') {
    return {
      title: 'Partial Service Disruption',
      body: 'Some services are experiencing issues. We are working to restore full functionality.',
    };
  }
  return {
    title: 'Service Outage',
    body: 'We are experiencing a service outage and are working to resolve it as quickly as possible.',
  };
}

/**
 * /status — uses the semantic status tokens (status-positive / -warning /
 * -negative) for state colors; everything else monochrome. Migration 6/N.
 */
export default async function StatusPage() {
  const report = await checkHealth();
  const { title, body } = overallMessage(report.overall);
  const checkedAt = new Date(report.timestamp).toLocaleTimeString('en-CH', {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  return (
    <div className="min-h-screen bg-surface-page">
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-heading tracking-display text-4xl font-bold text-foreground mb-4">
            System Status
          </h1>
          <p className="text-xl text-muted-foreground">
            Current status of OrangeCat platform services
          </p>
          <p className="text-sm text-muted-dim mt-2">Last checked: {checkedAt}</p>
        </div>

        {/* Overall Status */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-8">
          <div className="flex items-center space-x-3">
            <StatusIcon status={report.overall} size="lg" />
            <div>
              <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
              <p className="text-muted-foreground">{body}</p>
            </div>
          </div>
        </div>

        {/* Per-service Status */}
        <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">Services</h3>
          </div>
          <div className="divide-y divide-border dark:divide-border">
            {report.services.map(service => (
              <div key={service.name} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <StatusIcon status={service.status} />
                  <span className="font-medium text-foreground">{service.name}</span>
                </div>
                <StatusBadge status={service.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Incident History */}
        <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">Recent Incidents</h3>
          </div>
          <div className="px-6 py-8 text-center">
            <Clock className="w-8 h-8 text-muted-dim dark:text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">No incidents reported in the last 30 days.</p>
          </div>
        </div>

        {/* Contact — neutral panel per migration 6/N */}
        <div className="bg-muted/40 border border-border-subtle rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-fg-secondary mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Experiencing Issues?</h3>
              <p className="text-muted-foreground mb-4">
                If you&apos;re experiencing problems, check our FAQ or reach out to support.
              </p>
              <div className="flex gap-4">
                <Link
                  href={ROUTES.FAQ}
                  className="text-foreground hover:text-muted-strong font-medium underline-offset-4 hover:underline"
                >
                  Visit FAQ →
                </Link>
                <a
                  href="mailto:support@orangecat.ch"
                  className="text-foreground hover:text-muted-strong font-medium underline-offset-4 hover:underline"
                >
                  Contact Support →
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
