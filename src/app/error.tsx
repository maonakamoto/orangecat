'use client';

import { logger } from '@/utils/logger';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, Home, RefreshCw, ArrowLeft } from 'lucide-react';
import { ROUTES } from '@/config/routes';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Log the error to console for debugging
    logger.error('Application error:', error);
  }, [error]);

  // Check if it's an authentication error
  const isAuthError =
    error.message?.toLowerCase().includes('auth') ||
    error.message?.toLowerCase().includes('login') ||
    error.message?.toLowerCase().includes('unauthorized');

  return (
    <div className="oc-page flex items-center justify-center px-4">
      <div className="oc-surface max-w-lg w-full space-y-8 p-6">
        {/* Icon */}
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-md border border-destructive/20 bg-destructive/10 text-destructive">
            <AlertTriangle className="h-8 w-8" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-foreground">Oops! Something went wrong</h2>
          {isAuthError ? (
            <p className="mt-3 text-base text-muted-foreground">
              It looks like you need to be logged in to access this page.
            </p>
          ) : (
            <p className="mt-3 text-base text-muted-foreground">
              We encountered an unexpected error. Don't worry, your data is safe.
            </p>
          )}
        </div>

        {/* Error details (only in development) */}
        {process.env.NODE_ENV === 'development' && error.message && (
          <div className="oc-error-surface">
            <p className="text-sm font-mono break-words">{error.message}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-3">
          {isAuthError ? (
            <Link
              href={ROUTES.AUTH}
              className="group relative flex w-full items-center justify-center gap-2 rounded-md bg-foreground px-4 py-3 text-sm font-medium text-background transition-colors hover:bg-muted-strong focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
            >
              Sign In
            </Link>
          ) : (
            <button
              onClick={reset}
              className="group relative flex w-full items-center justify-center gap-2 rounded-md bg-foreground px-4 py-3 text-sm font-medium text-background transition-colors hover:bg-muted-strong focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
          )}

          <button
            onClick={() => router.back()}
            className="group relative flex w-full items-center justify-center gap-2 rounded-md border border-border-strong bg-card px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>

          <Link
            href={ROUTES.HOME}
            className="group relative flex w-full items-center justify-center gap-2 rounded-md border border-border-strong bg-card px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
          >
            <Home className="h-4 w-4" />
            Go to Homepage
          </Link>
        </div>

        {/* Help text */}
        <div className="text-center pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Still having issues?{' '}
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
