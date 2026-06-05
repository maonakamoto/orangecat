/**
 * Wallets Error State
 *
 * Error state component for wallet loading failures.
 *
 * Created: 2025-01-30
 * Last Modified: 2025-01-30
 */

'use client';

import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { ROUTES } from '@/config/routes';

interface WalletsErrorStateProps {
  error: string;
  onRetry: () => void;
}

export function WalletsErrorState({ error, onRetry }: WalletsErrorStateProps) {
  const router = useRouter();

  return (
    <div className="bg-surface-page min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <Card className="border-border-subtle bg-card">
          <div className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-status-negative flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-foreground mb-2">
                  Failed to Load Wallets
                </h2>
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
                <div className="flex gap-3">
                  <Button
                    onClick={() => {
                      onRetry();
                      window.location.reload();
                    }}
                    variant="outline"
                  >
                    Retry
                  </Button>
                  <Button onClick={() => router.push(ROUTES.DASHBOARD.HOME)} variant="outline">
                    Go to Dashboard
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
