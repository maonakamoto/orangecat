/**
 * WALLET EMPTY STATE COMPONENT
 * Shown when no wallets exist
 */

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Wallet as WalletIcon, ExternalLink } from 'lucide-react';
import { ROUTES } from '@/config/routes';

interface WalletEmptyStateProps {
  isOwner: boolean;
  onAddClick: () => void;
}

export function WalletEmptyState({ isOwner, onAddClick }: WalletEmptyStateProps) {
  return (
    <>
      <div className="text-center py-12 border-2 border-dashed border-border-strong rounded-lg bg-muted/40/50 dark:bg-muted/50">
        <WalletIcon className="w-16 h-16 text-muted-dim mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No wallets yet</h3>
        <p className="text-muted-foreground mb-4 max-w-md mx-auto">
          Add your first Bitcoin wallet to start receiving support.
        </p>
        {isOwner && (
          <Button onClick={onAddClick} variant="outline">
            Add Your First Wallet
          </Button>
        )}
      </div>
      {isOwner && (
        <div className="text-center">
          <Link
            href={ROUTES.WALLETS}
            className="text-sm text-muted-foreground hover:text-orange-600 dark:hover:text-foreground transition-colors inline-flex items-center gap-1"
          >
            I don't have a wallet yet
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      )}
    </>
  );
}
