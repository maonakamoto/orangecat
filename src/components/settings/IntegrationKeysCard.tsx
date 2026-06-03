'use client';

/**
 * Integration keys panel — mint + list + revoke.
 *
 * Lifted from /settings/integrations/page.tsx 2026-06-03 so the page
 * could grow a sibling webhook-endpoints panel without exceeding the
 * 300-line component cap.
 */

import { useEffect, useState } from 'react';
import { Copy, Plus, RotateCcw, Trash2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import { logger } from '@/utils/logger';
import { PUBLIC_API_ENTITY_TYPES, PUBLIC_API_SCOPE_TOKENS } from '@/config/public-api';

export interface IntegrationKey {
  id: string;
  actor_id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  is_test: boolean;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
}

interface MintResponse {
  data: { key: IntegrationKey; plaintext: string };
}

interface ActorOption {
  actor_id: string;
  label: string;
}

interface Props {
  actors: ActorOption[];
  defaultActorId: string | null;
}

function formatTimestamp(value: string | null): string {
  if (!value) {
    return '—';
  }
  return new Date(value).toLocaleString();
}

export default function IntegrationKeysCard({ actors, defaultActorId }: Props) {
  const [keys, setKeys] = useState<IntegrationKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [selectedActorId, setSelectedActorId] = useState<string | null>(defaultActorId);
  // Default to wildcard (current behaviour). When restrictPermissions is
  // true the user opts into picking a per-entity allowlist instead.
  const [restrictPermissions, setRestrictPermissions] = useState(false);
  const [selectedScopes, setSelectedScopes] = useState<Set<string>>(new Set());
  const [isTest, setIsTest] = useState(false);
  const [minting, setMinting] = useState(false);
  const [mintedPlaintext, setMintedPlaintext] = useState<string | null>(null);
  const [mintedPrefix, setMintedPrefix] = useState<string | null>(null);

  function toggleScope(token: string) {
    setSelectedScopes(prev => {
      const next = new Set(prev);
      if (next.has(token)) {
        next.delete(token);
      } else {
        next.add(token);
      }
      return next;
    });
  }

  useEffect(() => {
    if (!selectedActorId && defaultActorId) {
      setSelectedActorId(defaultActorId);
    }
  }, [defaultActorId, selectedActorId]);

  useEffect(() => {
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
  }, []);

  async function handleMint(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedActorId || !name.trim()) {
      return;
    }
    if (restrictPermissions && selectedScopes.size === 0) {
      setError('Pick at least one scope, or switch back to full access.');
      return;
    }
    setMinting(true);
    setError(null);
    try {
      const body: {
        name: string;
        actor_id: string;
        scopes?: string[];
        is_test?: boolean;
      } = {
        name: name.trim(),
        actor_id: selectedActorId,
      };
      if (restrictPermissions) {
        body.scopes = Array.from(selectedScopes);
      }
      if (isTest) {
        body.is_test = true;
      }
      const res = await fetch('/api/integration-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errBody = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errBody?.error || `Failed to mint key (${res.status})`);
      }
      const json = (await res.json()) as MintResponse;
      setMintedPlaintext(json.data.plaintext);
      setMintedPrefix(json.data.key.key_prefix);
      setKeys(prev => [json.data.key, ...prev]);
      setName('');
      setSelectedScopes(new Set());
      setRestrictPermissions(false);
      setIsTest(false);
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

  async function handleRotate(key: IntegrationKey) {
    if (
      !confirm(
        `Rotate "${key.name}"? You'll get a fresh secret; the current one stops working immediately. There is no grace period — swap your env var at the same time.`
      )
    ) {
      return;
    }
    setError(null);
    try {
      const res = await fetch(`/api/integration-keys/${key.id}/rotate`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || `Failed to rotate (${res.status})`);
      }
      const json = (await res.json()) as MintResponse;
      setMintedPlaintext(json.data.plaintext);
      setMintedPrefix(json.data.key.key_prefix);
      // The old row is now revoked; the new row should appear at the top.
      setKeys(prev => [
        json.data.key,
        ...prev.map(k => (k.id === key.id ? { ...k, revoked_at: new Date().toISOString() } : k)),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rotate key');
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

  return (
    <section className="space-y-4">
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <form
        onSubmit={handleMint}
        className="space-y-3 rounded-lg border border-border-subtle bg-muted/20 p-4"
      >
        <h3 className="text-sm font-medium text-foreground">Create a new key</h3>
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
              {actors.map(actor => (
                <option key={actor.actor_id} value={actor.actor_id}>
                  {actor.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <fieldset className="space-y-2 rounded-md border border-border-subtle bg-background/40 p-3">
          <legend className="px-1 text-xs text-muted-foreground">Environment</legend>
          <label className="flex items-center gap-2 text-xs text-foreground">
            <input type="checkbox" checked={isTest} onChange={e => setIsTest(e.target.checked)} />
            Sandbox key (prefix <code className="rounded bg-muted px-1">ock_test_</code>) — only
            reads and writes test entities. Use for integration testing without touching production
            data.
          </label>
        </fieldset>
        <fieldset className="space-y-2 rounded-md border border-border-subtle bg-background/40 p-3">
          <legend className="px-1 text-xs text-muted-foreground">Permissions</legend>
          <label className="flex items-center gap-2 text-xs text-foreground">
            <input
              type="radio"
              name="permissions"
              checked={!restrictPermissions}
              onChange={() => {
                setRestrictPermissions(false);
                setSelectedScopes(new Set());
              }}
            />
            Full access (wildcard) — the key can call every public endpoint on its actor.
          </label>
          <label className="flex items-center gap-2 text-xs text-foreground">
            <input
              type="radio"
              name="permissions"
              checked={restrictPermissions}
              onChange={() => setRestrictPermissions(true)}
            />
            Restrict to specific scopes (least privilege).
          </label>
          {restrictPermissions && (
            <div className="mt-2 rounded-md border border-border-subtle bg-muted/20 p-3">
              <div className="grid grid-cols-[auto,1fr,1fr] items-center gap-x-3 gap-y-1.5 text-xs">
                <span className="text-muted-foreground" />
                <span className="text-muted-foreground">Read</span>
                <span className="text-muted-foreground">Write</span>
                {PUBLIC_API_ENTITY_TYPES.map(entity => {
                  const readToken = `${entity}.read`;
                  const writeToken = `${entity}.write`;
                  return (
                    <ScopeRow
                      key={entity}
                      label={entity}
                      readToken={readToken}
                      writeToken={writeToken}
                      selectedScopes={selectedScopes}
                      onToggle={toggleScope}
                    />
                  );
                })}
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">
                {selectedScopes.size === 0
                  ? 'No scopes picked — the key will be unable to do anything.'
                  : `Selected: ${selectedScopes.size} of ${PUBLIC_API_SCOPE_TOKENS.length}.`}
              </p>
            </div>
          )}
        </fieldset>
        <Button type="submit" disabled={minting || !selectedActorId || !name.trim()}>
          <Plus className="mr-1 h-4 w-4" />
          {minting ? 'Creating…' : 'Create key'}
        </Button>
      </form>

      {mintedPlaintext && (
        <div className="rounded-lg border border-ring/50 bg-muted/40 p-4">
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

      <div className="rounded-lg border border-border-subtle">
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          <h3 className="text-sm font-medium text-foreground">Your keys</h3>
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
                actors.find(a => a.actor_id === key.actor_id)?.label ?? key.actor_id;
              return (
                <li key={key.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{key.name}</span>
                      {key.is_test && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800">
                          Sandbox
                        </span>
                      )}
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
                      <span>
                        Scopes:{' '}
                        <code className="rounded bg-muted px-1">
                          {(key.scopes ?? ['*']).join(', ')}
                        </code>
                      </span>
                      <span>Created {formatTimestamp(key.created_at)}</span>
                      <span>Last used {formatTimestamp(key.last_used_at)}</span>
                    </div>
                  </div>
                  {!isRevoked && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleRotate(key)}
                        className="inline-flex items-center gap-1 rounded-md border border-border-subtle px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Rotate
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRevoke(key)}
                        className="inline-flex items-center gap-1 rounded-md border border-border-subtle px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted/60 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Revoke
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

interface ScopeRowProps {
  label: string;
  readToken: string;
  writeToken: string;
  selectedScopes: Set<string>;
  onToggle: (token: string) => void;
}

function ScopeRow({ label, readToken, writeToken, selectedScopes, onToggle }: ScopeRowProps) {
  return (
    <>
      <span className="capitalize text-foreground">{label}</span>
      <label className="flex items-center gap-1.5 text-foreground">
        <input
          type="checkbox"
          checked={selectedScopes.has(readToken)}
          onChange={() => onToggle(readToken)}
        />
        <code className="rounded bg-muted px-1 text-[10px]">{readToken}</code>
      </label>
      <label className="flex items-center gap-1.5 text-foreground">
        <input
          type="checkbox"
          checked={selectedScopes.has(writeToken)}
          onChange={() => onToggle(writeToken)}
        />
        <code className="rounded bg-muted px-1 text-[10px]">{writeToken}</code>
      </label>
    </>
  );
}
