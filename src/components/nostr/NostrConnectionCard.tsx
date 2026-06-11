'use client';

import { Zap, Key, Unplug, ExternalLink, Copy, Check, AlertCircle, Wallet } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { CurrencyDisplay } from '@/components/ui/CurrencyDisplay';
import { shortenNpub } from '@/lib/nostr';
import { useNostrConnectionCard } from './useNostrConnectionCard';

export function NostrConnectionCard() {
  const {
    connected,
    npub,
    profile,
    nwcConnected,
    loading,
    error,
    hasExtension,
    connectWithExtension,
    disconnect,
    removeNWC,
    showNpubInput,
    setShowNpubInput,
    npubInput,
    setNpubInput,
    showNwcInput,
    setShowNwcInput,
    nwcInput,
    setNwcInput,
    nwcError,
    copied,
    balanceSats,
    balanceLoading,
    handleNpubConnect,
    handleNwcConnect,
    handleCancelNwc,
    handleCancelNpub,
    handleCopyNpub,
  } = useNostrConnectionCard();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5 text-foreground" />
          Nostr
        </CardTitle>
        <CardDescription>
          Connect your Nostr identity for portable profiles and Lightning payments via NWC.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {connected && npub ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border-subtle">
              <div className="flex items-center gap-3 min-w-0">
                {profile?.picture ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.picture}
                    alt={profile.display_name || profile.name || 'Nostr profile picture'}
                    className="h-8 w-8 rounded-full"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                    <Key className="h-4 w-4 text-foreground" />
                  </div>
                )}
                <div className="min-w-0">
                  {profile?.display_name || profile?.name ? (
                    <div className="text-sm font-medium truncate">
                      {profile.display_name || profile.name}
                    </div>
                  ) : null}
                  <div className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                    {shortenNpub(npub)}
                    <button
                      onClick={handleCopyNpub}
                      className="p-0.5 hover:text-foreground transition-colors"
                      title="Copy npub"
                    >
                      {copied ? (
                        <Check className="h-3 w-3 text-status-positive" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={disconnect}
                className="text-muted-foreground"
              >
                <Unplug className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-bitcoin-orange" />
                  Wallet Connect (NWC)
                </span>
                {nwcConnected ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-status-positive font-medium">Connected</span>
                    <Button variant="ghost" size="sm" onClick={removeNWC}>
                      <Unplug className="h-3 w-3" />
                    </Button>
                  </div>
                ) : null}
              </div>

              {nwcConnected ? (
                <div className="space-y-2">
                  {balanceSats !== null && (
                    <div className="flex items-center gap-2 p-2 rounded-md bg-status-positive-subtle border border-status-positive/20">
                      <Wallet className="h-4 w-4 text-status-positive" />
                      <span className="text-sm font-medium text-status-positive">Balance:</span>
                      <CurrencyDisplay
                        amount={balanceSats}
                        currency="SATS"
                        className="text-sm font-semibold text-status-positive"
                      />
                    </div>
                  )}
                  {balanceLoading && (
                    <p className="text-xs text-muted-foreground">Loading balance...</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Your wallet is connected via NWC. You can send and receive Lightning payments.
                  </p>
                </div>
              ) : showNwcInput ? (
                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder="nostr+walletconnect://..."
                    value={nwcInput}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNwcInput(e.target.value)
                    }
                    className="font-mono text-xs"
                  />
                  {nwcError && <p className="text-xs text-destructive">{nwcError}</p>}
                  <p className="text-xs text-muted-foreground">
                    Get this from your Lightning wallet (Alby, Mutiny, etc.)
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleNwcConnect}>
                      Connect Wallet
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleCancelNwc}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNwcInput(true)}
                  className="w-full"
                >
                  <Zap className="h-4 w-4 mr-1.5" />
                  Connect Lightning Wallet
                </Button>
              )}
            </div>

            {profile?.nip05 && (
              <div className="text-xs text-muted-foreground">NIP-05: {profile.nip05}</div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {hasExtension ? (
              <Button
                onClick={connectWithExtension}
                disabled={loading}
                className="w-full bg-foreground hover:bg-foreground"
              >
                <Key className="h-4 w-4 mr-2" />
                {loading ? 'Connecting...' : 'Connect with Extension'}
              </Button>
            ) : (
              <div className="space-y-2">
                <Button disabled className="w-full" variant="outline">
                  <Key className="h-4 w-4 mr-2" />
                  No Nostr Extension Found
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Install{' '}
                  <a
                    href="https://getalby.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground hover:underline inline-flex items-center gap-0.5"
                  >
                    Alby <ExternalLink className="h-3 w-3" />
                  </a>{' '}
                  or{' '}
                  <a
                    href="https://github.com/niccokunzmann/nos2x"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground hover:underline inline-flex items-center gap-0.5"
                  >
                    nos2x <ExternalLink className="h-3 w-3" />
                  </a>{' '}
                  for the best experience.
                </p>
              </div>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or</span>
              </div>
            </div>

            {showNpubInput ? (
              <div className="space-y-2">
                <Input
                  placeholder="npub1..."
                  value={npubInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNpubInput(e.target.value)
                  }
                  className="font-mono text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleNpubConnect}
                    disabled={!npubInput.trim() || loading}
                  >
                    {loading ? 'Connecting...' : 'Link npub'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleCancelNpub}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNpubInput(true)}
                className="w-full text-muted-foreground"
              >
                Enter npub manually
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
