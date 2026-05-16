/**
 * WALLET CARD COMPONENT
 * Displays a single wallet with balance, actions, and address
 */

import { Pencil, Trash2, Star, RefreshCw, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { WALLET_CATEGORIES } from '@/types/wallet';
import { WalletForm } from './WalletForm';
import type { WalletCardProps } from '../types';
import { truncateAddress } from '@/utils/string';

export function WalletCard({
  wallet,
  isOwner,
  isEditing,
  onEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
  onRefresh,
  onFieldFocus,
}: WalletCardProps) {
  if (isEditing && isOwner) {
    return (
      <WalletForm
        initialData={{
          label: wallet.label,
          description: wallet.description || '',
          address_or_xpub: wallet.address_or_xpub,
          category: wallet.category,
          category_icon: wallet.category_icon,
          behavior_type: wallet.behavior_type || 'general',
          goal_amount: wallet.goal_amount || undefined,
          goal_currency: wallet.goal_currency || undefined,
          is_primary: wallet.is_primary,
        }}
        onFieldFocus={onFieldFocus}
        onSubmit={onUpdate}
        onCancel={onCancelEdit}
        submitLabel="Save Changes"
      />
    );
  }

  const categoryInfo = WALLET_CATEGORIES[wallet.category];
  const progressPercent = wallet.goal_amount ? (wallet.balance_btc / wallet.goal_amount) * 100 : 0;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(wallet.address_or_xpub);
      toast.success('Copied to clipboard!');
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleSetPrimary = async () => {
    try {
      await onUpdate({ is_primary: true });
      toast.success(`${wallet.label} is now your primary wallet`);
    } catch {
      toast.error('Failed to set primary wallet');
    }
  };

  return (
    <div className="border rounded-lg p-4 sm:p-6 hover:border-orange-300 hover:shadow-md transition-all bg-card dark:border-border">
      {/* Header with icon, title, and action buttons */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="text-3xl sm:text-4xl flex-shrink-0">
            {wallet.category_icon || categoryInfo.icon}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold text-base sm:text-lg truncate">{wallet.label}</h4>
              {wallet.is_primary && (
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0">
                  <Star className="w-3 h-3 fill-orange-700" />
                  Primary
                </span>
              )}
            </div>
            {wallet.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {wallet.description}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">{categoryInfo.label}</p>
          </div>
        </div>

        {/* Action buttons - icon only on mobile, with tooltips */}
        {isOwner && (
          <div className="flex gap-1 sm:gap-2 flex-shrink-0">
            {!wallet.is_primary && (
              <button
                onClick={handleSetPrimary}
                className="p-2 rounded-lg hover:bg-orange-50 text-orange-600 hover:text-orange-700 transition-colors min-h-11 min-w-11 flex items-center justify-center"
                title="Set as primary wallet"
                aria-label="Set as primary wallet"
              >
                <Star className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}
            <button
              onClick={onEdit}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-muted text-muted-foreground hover:text-gray-900 dark:hover:text-foreground transition-colors min-h-11 min-w-11 flex items-center justify-center"
              title="Edit wallet"
              aria-label="Edit wallet"
            >
              <Pencil className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={onDelete}
              className="p-2 rounded-lg hover:bg-red-50 text-red-600 hover:text-red-700 transition-colors min-h-11 min-w-11 flex items-center justify-center"
              title="Delete wallet"
              aria-label="Delete wallet"
            >
              <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Balance */}
      <div className="bg-muted rounded-lg p-3 sm:p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">Current Balance</span>
          {isOwner && wallet.balance_updated_at && (
            <button
              onClick={onRefresh}
              className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-muted/50 text-muted-foreground hover:text-gray-900 dark:hover:text-foreground transition-colors min-h-11 min-w-11 flex items-center justify-center"
              title="Refresh balance"
              aria-label="Refresh balance"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="text-2xl sm:text-3xl font-bold text-orange-600">
          {wallet.balance_btc.toFixed(8)} BTC
        </div>
        {wallet.balance_updated_at && (
          <div className="text-xs text-muted-foreground mt-2">
            Updated {new Date(wallet.balance_updated_at).toLocaleString()}
          </div>
        )}
      </div>

      {/* Goal progress */}
      {wallet.goal_amount && (
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground font-medium">Goal</span>
            <span className="font-semibold text-foreground">
              {wallet.balance_btc.toFixed(4)} / {wallet.goal_amount} {wallet.goal_currency}
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2.5 mb-1">
            <div
              className="bg-orange-500 h-2.5 rounded-full transition-all"
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground">{progressPercent.toFixed(1)}% funded</div>
        </div>
      )}

      {/* Address (truncated) */}
      <div className="pt-4 border-t border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">
            {wallet.wallet_type === 'xpub' ? 'Extended Public Key' : 'Bitcoin Address'}
          </span>
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-muted text-muted-foreground hover:text-orange-600 transition-colors flex items-center gap-1 min-h-11"
            title="Copy address"
            aria-label="Copy address"
          >
            <Copy className="w-4 h-4" />
            <span className="text-xs hidden sm:inline">Copy</span>
          </button>
        </div>
        <code className="text-xs text-foreground block font-mono break-all bg-muted p-2 rounded border dark:border-border">
          {truncateAddress(wallet.address_or_xpub, 20, 10)}
        </code>
      </div>
    </div>
  );
}
