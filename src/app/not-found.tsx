import Link from 'next/link';
export const dynamic = 'force-dynamic';
import { Home, Search, ArrowLeft } from 'lucide-react';
import { ROUTES } from '@/config/routes';

export default function NotFound() {
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
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          <Link
            href={ROUTES.DASHBOARD.HOME}
            className="group relative flex w-full items-center justify-center gap-2 rounded-md bg-foreground px-4 py-3 text-sm font-medium text-background transition-colors hover:bg-muted-strong focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
          >
            <Home className="h-4 w-4" />
            Go to Dashboard
          </Link>

          <Link
            href={ROUTES.DISCOVER}
            className="group relative flex w-full items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
          >
            <Search className="h-4 w-4" />
            Discover Projects
          </Link>

          <Link
            href={ROUTES.HOME}
            className="group relative flex w-full items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
          >
            <ArrowLeft className="h-4 w-4" />
            Go to Homepage
          </Link>
        </div>

        {/* Help text */}
        <div className="text-center pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Looking for something specific?{' '}
            <Link
              href={ROUTES.FAQ}
              className="font-medium text-tiffany-600 hover:text-tiffany-700 dark:text-tiffany-400"
            >
              Visit our FAQ
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
