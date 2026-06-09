'use client';

import Link from 'next/link';
import { Home, Search, ArrowLeft } from 'lucide-react';
import { ROUTES } from '@/config/routes';
import { useAuth } from '@/hooks/useAuth';

export default function NotFound() {
  // Same pattern as RouteError — the primary CTA needs to be reachable
  // by the visitor. Anonymous users clicking "Go to Dashboard" get
  // bounced through /auth?from=/dashboard, which is friction for someone
  // who just typed a wrong URL. Surface Dashboard only when the user
  // can actually use it; everyone else gets Home as the primary.
  const { user, hydrated } = useAuth();
  const showDashboardPrimary = hydrated && !!user;

  const primary = showDashboardPrimary
    ? { href: ROUTES.DASHBOARD.HOME, label: 'Go to Dashboard', Icon: Home }
    : { href: ROUTES.HOME, label: 'Go to Homepage', Icon: Home };

  return (
    <div className="oc-page flex items-center justify-center px-4">
      <div className="oc-surface max-w-lg w-full space-y-8 p-6">
        {/* Icon */}
        <div className="text-center">
          <div className="oc-icon-tile mx-auto h-16 w-16">
            <Search className="h-8 w-8" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-foreground">Page Not Found</h2>
          <p className="mt-3 text-base text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          <Link
            href={primary.href}
            className="group relative flex w-full items-center justify-center gap-2 rounded-md bg-foreground px-4 py-3 text-sm font-medium text-background transition-colors hover:bg-muted-strong focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
          >
            <primary.Icon className="h-4 w-4" />
            {primary.label}
          </Link>

          <Link
            href={ROUTES.DISCOVER}
            className="group relative flex w-full items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
          >
            <Search className="h-4 w-4" />
            Discover Projects
          </Link>

          {/* Render a tertiary nav option only when it's different from
              the primary — avoids two buttons that go to the same place. */}
          {showDashboardPrimary && (
            <Link
              href={ROUTES.HOME}
              className="group relative flex w-full items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
            >
              <ArrowLeft className="h-4 w-4" />
              Go to Homepage
            </Link>
          )}
        </div>

        {/* Help text */}
        <div className="text-center pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Looking for something specific?{' '}
            <Link
              href={ROUTES.FAQ}
              className="font-medium text-foreground hover:text-foreground dark:text-foreground"
            >
              Visit our FAQ
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
