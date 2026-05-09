import { CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { checkHealth } from '@/lib/health';
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
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-green-700 bg-green-100">
        Operational
      </span>
    );
  }
  if (status === 'degraded') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-yellow-700 bg-yellow-100">
        Degraded
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-red-700 bg-red-100">
      Outage
    </span>
  );
}

function StatusIcon({ status, size = 'sm' }: { status: ServiceStatus; size?: 'sm' | 'lg' }) {
  const cls = size === 'lg' ? 'w-8 h-8' : 'w-5 h-5';
  if (status === 'operational') {
    return <CheckCircle className={`${cls} text-green-500`} />;
  }
  if (status === 'degraded') {
    return <AlertTriangle className={`${cls} text-yellow-500`} />;
  }
  return <XCircle className={`${cls} text-red-500`} />;
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

export default async function StatusPage() {
  const report = await checkHealth();
  const { title, body } = overallMessage(report.overall);
  const checkedAt = new Date(report.timestamp).toLocaleTimeString('en-CH', {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">System Status</h1>
          <p className="text-xl text-gray-600">Current status of OrangeCat platform services</p>
          <p className="text-sm text-gray-400 mt-2">Last checked: {checkedAt}</p>
        </div>

        {/* Overall Status */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center space-x-3">
            <StatusIcon status={report.overall} size="lg" />
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
              <p className="text-gray-600">{body}</p>
            </div>
          </div>
        </div>

        {/* Per-service Status */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Services</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {report.services.map(service => (
              <div key={service.name} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <StatusIcon status={service.status} />
                  <span className="font-medium text-gray-900">{service.name}</span>
                </div>
                <StatusBadge status={service.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Incident History */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Incidents</h3>
          </div>
          <div className="px-6 py-8 text-center">
            <Clock className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No incidents reported in the last 30 days.</p>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-tiffany-50 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-tiffany-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-tiffany-900 mb-1">Experiencing Issues?</h3>
              <p className="text-tiffany-700 mb-4">
                If you&apos;re experiencing problems, check our FAQ or reach out to support.
              </p>
              <div className="flex gap-4">
                <Link href="/faq" className="text-tiffany-600 hover:text-tiffany-800 font-medium">
                  Visit FAQ →
                </Link>
                <a
                  href="mailto:support@orangecat.ch"
                  className="text-tiffany-600 hover:text-tiffany-800 font-medium"
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
