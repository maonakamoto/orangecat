'use client';

/**
 * Webhook endpoints panel — mint + list + revoke.
 *
 * Same UX as IntegrationKeysCard (sibling on /settings/integrations).
 * Endpoints receive signed POSTs from OrangeCat when entities the bound
 * actor owns get created — verified by the integration with
 * `verifyWebhookSignature` from @orangecat/sdk.
 */

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Plus, Trash2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import { logger } from '@/utils/logger';
import WebhookDeliveriesDrawer from '@/components/settings/WebhookDeliveriesDrawer';
import { PUBLIC_API_WEBHOOK_EVENTS } from '@/config/public-api';

interface WebhookEndpoint {
  id: string;
  actor_id: string;
  name: string;
  url: string;
  secret_prefix: string;
  event_types: string[] | null;
  created_at: string;
  last_delivery_at: string | null;
  revoked_at: string | null;
}

interface MintResponse {
  data: { endpoint: WebhookEndpoint; secret: string };
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

export default function WebhookEndpointsCard({ actors, defaultActorId }: Props) {
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [selectedActorId, setSelectedActorId] = useState<string | null>(defaultActorId);
  const [minting, setMinting] = useState(false);
  const [mintedSecret, setMintedSecret] = useState<string | null>(null);
  const [mintedPrefix, setMintedPrefix] = useState<string | null>(null);
  const [expandedEndpointId, setExpandedEndpointId] = useState<string | null>(null);
  // Empty set === "all events" (server stores null in event_types). When
  // the user ticks any boxes we send the allowlist explicitly.
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());

  function toggleEvent(eventName: string) {
    setSelectedEvents(prev => {
      const next = new Set(prev);
      if (next.has(eventName)) {
        next.delete(eventName);
      } else {
        next.add(eventName);
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
        const res = await fetch('/api/webhook-endpoints', { credentials: 'include' });
        if (!res.ok) {
          throw new Error(`Failed to load endpoints (${res.status})`);
        }
        const json = (await res.json()) as { data: { endpoints: WebhookEndpoint[] } };
        if (!cancelled) {
          setEndpoints(json.data?.endpoints ?? []);
          setLoading(false);
        }
      } catch (err) {
        logger.error('Failed to load webhook endpoints', { err });
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load endpoints');
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
    if (!selectedActorId || !name.trim() || !url.trim()) {
      return;
    }
    setMinting(true);
    setError(null);
    try {
      const body: {
        name: string;
        url: string;
        actor_id: string;
        event_types?: string[];
      } = {
        name: name.trim(),
        url: url.trim(),
        actor_id: selectedActorId,
      };
      if (selectedEvents.size > 0) {
        body.event_types = Array.from(selectedEvents);
      }
      const res = await fetch('/api/webhook-endpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errBody = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errBody?.error || `Failed to create endpoint (${res.status})`);
      }
      const json = (await res.json()) as MintResponse;
      setMintedSecret(json.data.secret);
      setMintedPrefix(json.data.endpoint.secret_prefix);
      setEndpoints(prev => [json.data.endpoint, ...prev]);
      setName('');
      setUrl('');
      setSelectedEvents(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create endpoint');
    } finally {
      setMinting(false);
    }
  }

  async function handleRevoke(endpoint: WebhookEndpoint) {
    if (!confirm(`Revoke "${endpoint.name}"? Deliveries to this URL will stop immediately.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/webhook-endpoints/${endpoint.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error(`Failed to revoke (${res.status})`);
      }
      setEndpoints(prev =>
        prev.map(e => (e.id === endpoint.id ? { ...e, revoked_at: new Date().toISOString() } : e))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke endpoint');
    }
  }

  async function copySecret() {
    if (!mintedSecret) {
      return;
    }
    try {
      await navigator.clipboard.writeText(mintedSecret);
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
        <h3 className="text-sm font-medium text-foreground">Create a new endpoint</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-muted-foreground sm:col-span-1">
            Name
            <input
              type="text"
              required
              maxLength={120}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder='e.g. "FleetCrown subscriptions"'
              className="mt-1 w-full rounded-md border border-border-subtle bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring/50 focus:outline-none"
            />
          </label>
          <label className="text-xs text-muted-foreground sm:col-span-1">
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
          <label className="text-xs text-muted-foreground sm:col-span-2">
            Target URL (https in production)
            <input
              type="url"
              required
              maxLength={2048}
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://fleetcrown.app/webhooks/orangecat"
              className="mt-1 w-full rounded-md border border-border-subtle bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring/50 focus:outline-none"
            />
          </label>
        </div>
        <fieldset className="space-y-2 rounded-md border border-border-subtle bg-background/40 p-3">
          <legend className="px-1 text-xs text-muted-foreground">Events</legend>
          <p className="text-[11px] text-muted-foreground">
            {selectedEvents.size === 0
              ? 'Receive every event for this actor. Tick boxes to restrict.'
              : `Receive only the ${selectedEvents.size} ticked event${selectedEvents.size === 1 ? '' : 's'}.`}
          </p>
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {PUBLIC_API_WEBHOOK_EVENTS.map(eventName => (
              <label
                key={eventName}
                className="flex items-center gap-1.5 text-[11px] text-foreground"
              >
                <input
                  type="checkbox"
                  checked={selectedEvents.has(eventName)}
                  onChange={() => toggleEvent(eventName)}
                />
                <code className="rounded bg-muted px-1 text-[10px]">{eventName}</code>
              </label>
            ))}
          </div>
        </fieldset>
        <Button type="submit" disabled={minting || !selectedActorId || !name.trim() || !url.trim()}>
          <Plus className="mr-1 h-4 w-4" />
          {minting ? 'Creating…' : 'Create endpoint'}
        </Button>
      </form>

      {mintedSecret && (
        <div className="rounded-lg border border-ring/50 bg-muted/40 p-4">
          <p className="text-sm font-medium text-foreground">
            Copy this signing secret now — you won&apos;t see it again
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Prefix <code className="rounded bg-muted px-1">{mintedPrefix}</code> is all you&apos;ll
            see after closing this card. Use this secret with{' '}
            <code className="rounded bg-muted px-1">verifyWebhookSignature</code> from{' '}
            <code className="rounded bg-muted px-1">@orangecat/sdk</code>.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <code className="flex-1 truncate rounded-md border border-border-subtle bg-background px-3 py-2 font-mono text-xs text-foreground">
              {mintedSecret}
            </code>
            <button
              type="button"
              onClick={copySecret}
              className="inline-flex items-center gap-1 rounded-md border border-border-subtle px-2.5 py-1.5 text-xs text-foreground hover:bg-muted/60"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy
            </button>
            <button
              type="button"
              onClick={() => {
                setMintedSecret(null);
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
          <h3 className="text-sm font-medium text-foreground">Your endpoints</h3>
          <span className="text-xs text-muted-foreground">
            {endpoints.length} {endpoints.length === 1 ? 'endpoint' : 'endpoints'}
          </span>
        </div>
        {loading ? (
          <div className="p-4 text-sm text-muted-foreground">Loading…</div>
        ) : endpoints.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No endpoints yet. Create one above to receive signed events.
          </div>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {endpoints.map(endpoint => {
              const isRevoked = !!endpoint.revoked_at;
              const isExpanded = expandedEndpointId === endpoint.id;
              const actorLabel =
                actors.find(a => a.actor_id === endpoint.actor_id)?.label ?? endpoint.actor_id;
              return (
                <li key={endpoint.id} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{endpoint.name}</span>
                        {isRevoked && (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                            Revoked
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        <span className="truncate max-w-full sm:max-w-xs">
                          <code className="rounded bg-muted px-1">{endpoint.url}</code>
                        </span>
                        <span>Acts as {actorLabel}</span>
                        <span>
                          Events:{' '}
                          <code className="rounded bg-muted px-1">
                            {endpoint.event_types && endpoint.event_types.length > 0
                              ? endpoint.event_types.join(', ')
                              : 'all'}
                          </code>
                        </span>
                        <span>Created {formatTimestamp(endpoint.created_at)}</span>
                        <span>Last delivery {formatTimestamp(endpoint.last_delivery_at)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedEndpointId(prev => (prev === endpoint.id ? null : endpoint.id))
                        }
                        className="inline-flex items-center gap-1 rounded-md border border-border-subtle px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" />
                        )}
                        Deliveries
                      </button>
                      {!isRevoked && (
                        <button
                          type="button"
                          onClick={() => handleRevoke(endpoint)}
                          className="inline-flex items-center gap-1 rounded-md border border-border-subtle px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted/60 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Revoke
                        </button>
                      )}
                    </div>
                  </div>
                  {isExpanded && <WebhookDeliveriesDrawer endpointId={endpoint.id} />}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
