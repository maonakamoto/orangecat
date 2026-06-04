'use client';

/**
 * Mint-form sub-component lifted out of WebhookEndpointsCard 2026-06-04
 * to keep the parent under the 300-line component cap. Pure
 * presentation — all state lives in the parent and is passed in via
 * props. onSubmit also lives in the parent so post-mint side effects
 * (secret reveal, list prepend, reset) stay collocated.
 *
 * UX surfaces:
 *   - Name + actor + target URL
 *   - Events fieldset (empty = receive all; ticked = allowlist)
 *   - Submit button
 *
 * Mirrors the structure of IntegrationKeyMintForm so operators learn
 * one mint pattern across the settings page.
 */

import Button from '@/components/ui/Button';
import { Plus } from 'lucide-react';
import { PUBLIC_API_WEBHOOK_EVENTS } from '@/config/public-api';

interface ActorOption {
  actor_id: string;
  label: string;
}

interface Props {
  actors: ActorOption[];
  name: string;
  onNameChange: (value: string) => void;
  url: string;
  onUrlChange: (value: string) => void;
  selectedActorId: string | null;
  onActorChange: (value: string | null) => void;
  selectedEvents: Set<string>;
  onToggleEvent: (eventName: string) => void;
  minting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export default function WebhookEndpointMintForm({
  actors,
  name,
  onNameChange,
  url,
  onUrlChange,
  selectedActorId,
  onActorChange,
  selectedEvents,
  onToggleEvent,
  minting,
  onSubmit,
}: Props) {
  return (
    <form
      onSubmit={onSubmit}
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
            onChange={e => onNameChange(e.target.value)}
            placeholder='e.g. "FleetCrown subscriptions"'
            className="mt-1 w-full rounded-md border border-border-subtle bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring/50 focus:outline-none"
          />
        </label>
        <label className="text-xs text-muted-foreground sm:col-span-1">
          Acts as
          <select
            value={selectedActorId ?? ''}
            onChange={e => onActorChange(e.target.value || null)}
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
            onChange={e => onUrlChange(e.target.value)}
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
                onChange={() => onToggleEvent(eventName)}
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
  );
}
