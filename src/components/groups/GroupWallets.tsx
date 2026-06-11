'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Wallet, Plus, Copy, ExternalLink, RefreshCw, Loader2, X } from 'lucide-react';
import type { GroupWalletSummary } from '@/services/groups/types';
import { toast } from 'sonner';
import { API_ROUTES } from '@/config/api-routes';
import { useDisplayCurrency } from '@/hooks/useDisplayCurrency';
import { BADGE_COLORS } from '@/config/badge-colors';

interface GroupWalletsProps {
  groupId: string;
  groupSlug: string;
  wallets: unknown[];
  onUpdate?: () => void;
}

const WALLET_PURPOSES = [
  { value: 'general', label: 'General' },
  { value: 'projects', label: 'Projects' },
  { value: 'investment', label: 'Investment' },
  { value: 'community', label: 'Community' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'savings', label: 'Savings' },
  { value: 'other', label: 'Other' },
] as const;

interface CreateWalletForm {
  name: string;
  description: string;
  purpose: string;
  bitcoin_address: string;
  lightning_address: string;
}

const EMPTY_FORM: CreateWalletForm = {
  name: '',
  description: '',
  purpose: 'general',
  bitcoin_address: '',
  lightning_address: '',
};

export function GroupWallets({
  groupId: _groupId,
  groupSlug,
  wallets,
  onUpdate,
}: GroupWalletsProps) {
  const { formatAmountBtc } = useDisplayCurrency();
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<CreateWalletForm>(EMPTY_FORM);
  const [refreshing, setRefreshing] = useState<string | null>(null);

  const handleRefreshBalance = async (walletId: string) => {
    try {
      setRefreshing(walletId);
      const response = await fetch(API_ROUTES.GROUPS.WALLET_REFRESH(groupSlug, walletId), {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to refresh balance');
      }

      const data = await response.json();
      toast.success(`Balance updated: ${formatAmountBtc(data.data?.balance || 0)}`);
      onUpdate?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to refresh balance');
    } finally {
      setRefreshing(null);
    }
  };

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast.success('Address copied to clipboard');
  };

  const handleCreateWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.bitcoin_address && !form.lightning_address) {
      toast.error('Provide at least one Bitcoin or Lightning address');
      return;
    }
    try {
      setSubmitting(true);
      const response = await fetch(API_ROUTES.GROUPS.WALLETS(groupSlug), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          description: form.description || undefined,
          purpose: form.purpose,
          bitcoin_address: form.bitcoin_address || undefined,
          lightning_address: form.lightning_address || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create wallet');
      }

      toast.success('Wallet created successfully');
      setForm(EMPTY_FORM);
      setCreating(false);
      onUpdate?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create wallet');
    } finally {
      setSubmitting(false);
    }
  };

  // Type guard for wallet summary
  const isWalletSummary = (w: unknown): w is GroupWalletSummary => {
    return typeof w === 'object' && w !== null && 'id' in w && 'name' in w;
  };

  const typedWallets = wallets.filter(isWalletSummary);

  return (
    <div className="space-y-4">
      {/* Create Wallet */}
      <Card>
        <CardContent className="pt-6">
          {creating ? (
            <form onSubmit={handleCreateWallet} className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-sm">New Wallet</h3>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setCreating(false);
                    setForm(EMPTY_FORM);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Operations Treasury"
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Purpose</label>
                <select
                  value={form.purpose}
                  onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {WALLET_PURPOSES.map(p => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <input
                  type="text"
                  maxLength={500}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Optional description"
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Bitcoin Address</label>
                <input
                  type="text"
                  value={form.bitcoin_address}
                  onChange={e => setForm(f => ({ ...f, bitcoin_address: e.target.value }))}
                  placeholder="bc1q… or xpub…"
                  className="w-full border border-input rounded-md px-3 py-2 text-sm font-mono bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Lightning Address</label>
                <input
                  type="text"
                  value={form.lightning_address}
                  onChange={e => setForm(f => ({ ...f, lightning_address: e.target.value }))}
                  placeholder="user@domain.com"
                  className="w-full border border-input rounded-md px-3 py-2 text-sm font-mono bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <p className="text-xs text-muted-foreground">At least one address is required.</p>

              <div className="flex gap-2">
                <Button type="submit" disabled={submitting || !form.name} className="flex-1">
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Wallet
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCreating(false);
                    setForm(EMPTY_FORM);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <Button onClick={() => setCreating(true)} className="w-full" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Create New Wallet
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Wallets List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Wallets ({typedWallets.length})
          </CardTitle>
          <CardDescription>Bitcoin wallets for this group</CardDescription>
        </CardHeader>
        <CardContent>
          {typedWallets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No wallets yet</div>
          ) : (
            <div className="space-y-4">
              {typedWallets.map(wallet => (
                <Card key={wallet.id} className="border">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{wallet.name}</CardTitle>
                      {wallet.is_active ? (
                        <Badge variant="default" className={BADGE_COLORS.success}>
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    {wallet.description && <CardDescription>{wallet.description}</CardDescription>}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {wallet.purpose && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Purpose: </span>
                        <span className="font-medium capitalize">{wallet.purpose}</span>
                      </div>
                    )}

                    {wallet.bitcoin_address && (
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">Bitcoin Address</div>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 font-mono text-xs break-all text-sm bg-muted p-2 rounded">
                            {wallet.bitcoin_address}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCopyAddress(wallet.bitcoin_address!)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              window.open(
                                `https://blockstream.info/address/${wallet.bitcoin_address}`,
                                '_blank'
                              )
                            }
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {wallet.lightning_address && (
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">Lightning Address</div>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 font-mono text-xs bg-muted p-2 rounded">
                            {wallet.lightning_address}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCopyAddress(wallet.lightning_address!)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="text-sm text-muted-foreground">Balance</div>
                            <div className="text-lg font-bold text-status-positive">
                              {formatAmountBtc(wallet.current_balance_btc)}
                            </div>
                          </div>
                          {wallet.bitcoin_address && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRefreshBalance(wallet.id)}
                              disabled={refreshing === wallet.id}
                              className="ml-auto"
                            >
                              {refreshing === wallet.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                      {wallet.required_signatures > 1 && (
                        <div className="text-sm text-muted-foreground">
                          Multi-sig: {wallet.required_signatures} signatures required
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
