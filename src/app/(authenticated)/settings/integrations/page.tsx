'use client';

/**
 * Integration keys settings page.
 *
 * Surfaces the outbound platform API keys a user has minted, plus a
 * minimal mint flow. The plaintext key is shown ONCE on mint and never
 * again — users copy it before closing the reveal dialog.
 *
 * Companion to:
 * - service: src/services/auth/integrationKeys.ts
 * - api:     src/app/api/integration-keys/*
 *
 * Created: 2026-06-03
 * Last Modified: 2026-06-03
 * Last Modified Summary: Initial implementation — FleetCrown integration UX now end-to-end without SQL.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Copy, KeyRound, LogIn, Plus, Trash2 } from 'lucide-react';
import { useRequireAuth } from '@/hooks/useAuth';
import { useMessagingActors } from '@/features/messaging/hooks/useMessagingActors';
import { ROUTES } from '@/config/routes';
import Loading from '@/components/Loading';
import Button from '@/components/ui/Button';
import { logger } from '@/utils/logger';

/**
 * Hydration ceiling — if the auth store hasn't resolved after this long
 * we treat it as a stuck client and show the sign-in CTA instead of a
 * forever spinner. Real auth resolves in <300ms; anything past 2-3s is
 * a sign of a broken hydration path (cookie domain mismatch, blocked
 * storage, third-party script blocking the supabase client init, …).
 */
const HYDRATION_TIMEOUT_MS = 4_000;

interface IntegrationKey {
  id: string;
  actor_id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
}

interface MintResponse {
  data: { key: IntegrationKey; plaintext: string };
}

function formatTimestamp(value: string | null): string {
  if (!value) {
    return '—';
  }
  return new Date(value).toLocaleString();
}

export default function IntegrationKeysPage() {
  const { user, hydrated, isLoading: authLoading } = useRequireAuth();
  const { personalActor, groupActors } = useMessagingActors();
  // Forces past a stuck auth-store hydration so the page renders a real
  // sign-in CTA after a few seconds instead of pinning the user on the
  // loading spinner.
  const [hydrationTimedOut, setHydrationTimedOut] = useState(false);

  useEffect(() => {
    if (hydrated && !authLoading) {
      return;
    }
    const timer = setTimeout(() => setHydrationTimedOut(true), HYDRATION_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [hydrated, authLoading]);

  const [keys, setKeys] = useState<IntegrationKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [selectedActorId, setSelectedActorId] = useState<string | null>(null);
  const [minting, setMinting] = useState(false);
  const [mintedPlaintext, setMintedPlaintext] = useState<string | null>(null);
  const [mintedPrefix, setMintedPrefix] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/integration-keys', { credentials: 'include' });
        if (!res.ok) {
          throw new Error(`Failed to load keys (${res.status})`);
        }
        const json = (await res.json()) as { data: { keys: IntegrationKey[] } };
        if (!cancelled) {
          setKeys(json.data?.keys ?? []);
          setLoading(false);
        }
      } catch (err) {
        logger.error('Failed to load integration keys', { err });
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load keys');
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const allActors = [
    ...(personalActor ? [{ ...personalActor, label: `${personalActor.name} (Personal)` }] : []),
    ...groupActors.map(a => ({ ...a, label: a.name })),
  ];

  // Default the actor pick to the personal actor once it loads.
  useEffect(() => {
    if (!selectedActorId && personalActor) {
      setSelectedActorId(personalActor.actor_id);
    }
  }, [personalActor, selectedActorId]);

  async function handleMint(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedActorId || !name.trim()) {
      return;
    }
    setMinting(true);
    setError(null);
    try {
      const res = await fetch('/api/integration-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: name.trim(), actor_id: selectedActorId }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || `Failed to mint key (${res.status})`);
      }
      const json = (await res.json()) as MintResponse;
      setMintedPlaintext(json.data.plaintext);
      setMintedPrefix(json.data.key.key_prefix);
      setKeys(prev => [json.data.key, ...prev]);
      setName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mint key');
    } finally {
      setMinting(false);
    }
  }

  async function handleRevoke(key: IntegrationKey) {
    if (!confirm(`Revoke "${key.name}"? Existing integrations will stop working immediately.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/integration-keys/${key.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error(`Failed to revoke (${res.status})`);
      }
      setKeys(prev =>
        prev.map(k => (k.id === key.id ? { ...k, revoked_at: new Date().toISOString() } : k))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke key');
    }
  }

  async function copyPlaintext() {
    if (!mintedPlaintext) {
      return;
    }
    try {
      await navigator.clipboard.writeText(mintedPlaintext);
    } catch (err) {
      logger.warn('Clipboard write failed', { err });
    }
  }

  // Still hydrating, AND we haven't given up waiting yet. Once timed out,
  // fall through to the !user branch which renders a real sign-in CTA.
  if ((!hydrated || authLoading) && !hydrationTimedOut) {
    return <Loading fullScreen message="Loading integrations..." />;
  }

  // No user (either definitively unauth'd or the auth store is stuck).
  // Render an actionable sign-in surface instead of a perpetual spinner
  // or `return null` blank flash. The `from` param brings them back here
  // after login.
  if (!user) {
    const returnTo = `${ROUTES.AUTH}?mode=login&from=${encodeURIComponent(ROUTES.SETTINGS_INTEGRATIONS)}`;
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center p-6 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-border-subtle bg-muted/30">
          <KeyRound className="h-5 w-5 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">Sign in to manage integrations</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Integration keys let external services authenticate to OrangeCat as a specific actor. Sign
          in to mint, view, or revoke them.
        </p>
        <Link href={returnTo} className="mt-6 inline-block">
          <Button>
            <LogIn className="mr-1.5 h-4 w-4" />
            Sign in
          </Button>
        </Link>
        <Link
          href={ROUTES.HOME}
          className="mt-3 text-xs text-muted-foreground hover:text-foreground"
        >
          ← Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <Link
          href={ROUTES.SETTINGS}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Settings
        </Link>
        <h1 className="mt-3 flex items-center gap-2 text-2xl font-semibold text-foreground">
          <KeyRound className="h-5 w-5" />
          Integration keys
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Let external services (FleetCrown, hirn.li, your own scripts) authenticate to OrangeCat as
          a specific actor. Each key acts as one actor and can be revoked individually.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          API contract:{' '}
          <a
            href="/api/v1/openapi.json"
            className="underline hover:text-foreground"
            target="_blank"
            rel="noreferrer"
          >
            openapi.json
          </a>{' '}
          ·{' '}
          <a
            href="/api/v1"
            className="underline hover:text-foreground"
            target="_blank"
            rel="noreferrer"
          >
            discovery
          </a>
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Mint form */}
      <form
        onSubmit={handleMint}
        className="mb-6 space-y-3 rounded-lg border border-border-subtle bg-muted/20 p-4"
      >
        <h2 className="text-sm font-medium text-foreground">Create a new key</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-muted-foreground">
            Name
            <input
              type="text"
              required
              maxLength={120}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder='e.g. "FleetCrown production"'
              className="mt-1 w-full rounded-md border border-border-subtle bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring/50 focus:outline-none"
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Acts as
            <select
              value={selectedActorId ?? ''}
              onChange={e => setSelectedActorId(e.target.value || null)}
              className="mt-1 w-full rounded-md border border-border-subtle bg-background px-3 py-2 text-sm text-foreground focus:border-ring/50 focus:outline-none"
            >
              {allActors.map(actor => (
                <option key={actor.actor_id} value={actor.actor_id}>
                  {actor.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <Button type="submit" disabled={minting || !selectedActorId || !name.trim()}>
          <Plus className="mr-1 h-4 w-4" />
          {minting ? 'Creating…' : 'Create key'}
        </Button>
      </form>

      {/* Reveal — plaintext shown ONCE */}
      {mintedPlaintext && (
        <div className="mb-6 rounded-lg border border-ring/50 bg-muted/40 p-4">
          <p className="text-sm font-medium text-foreground">
            Copy this key now — you won&apos;t see it again
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Prefix <code className="rounded bg-muted px-1">{mintedPrefix}</code> is all you&apos;ll
            see after closing this card.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <code className="flex-1 truncate rounded-md border border-border-subtle bg-background px-3 py-2 font-mono text-xs text-foreground">
              {mintedPlaintext}
            </code>
            <button
              type="button"
              onClick={copyPlaintext}
              className="inline-flex items-center gap-1 rounded-md border border-border-subtle px-2.5 py-1.5 text-xs text-foreground hover:bg-muted/60"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy
            </button>
            <button
              type="button"
              onClick={() => {
                setMintedPlaintext(null);
                setMintedPrefix(null);
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="rounded-lg border border-border-subtle">
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          <h2 className="text-sm font-medium text-foreground">Your keys</h2>
          <span className="text-xs text-muted-foreground">
            {keys.length} {keys.length === 1 ? 'key' : 'keys'}
          </span>
        </div>
        {loading ? (
          <div className="p-4 text-sm text-muted-foreground">Loading…</div>
        ) : keys.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No keys yet. Create one above to integrate an external service.
          </div>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {keys.map(key => {
              const isRevoked = !!key.revoked_at;
              const actorLabel =
                allActors.find(a => a.actor_id === key.actor_id)?.label ?? key.actor_id;
              return (
                <li key={key.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{key.name}</span>
                      {isRevoked && (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                          Revoked
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span>
                        <code className="rounded bg-muted px-1">{key.key_prefix}…</code>
                      </span>
                      <span>Acts as {actorLabel}</span>
                      <span>Created {formatTimestamp(key.created_at)}</span>
                      <span>Last used {formatTimestamp(key.last_used_at)}</span>
                    </div>
                  </div>
                  {!isRevoked && (
                    <button
                      type="button"
                      onClick={() => handleRevoke(key)}
                      className="inline-flex items-center gap-1 rounded-md border border-border-subtle px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted/60 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Revoke
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
