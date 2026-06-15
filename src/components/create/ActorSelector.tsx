'use client';

/**
 * ActorSelector — "Create this as: Personal / Group" dropdown.
 *
 * Renders nothing when the user has no group actors they're authorised to
 * act as (single-actor user shouldn't see a switcher at all). Mirrors the
 * data model used by MessageActorSelector but is purpose-built for entity
 * creation flows.
 *
 * Created: 2026-06-03
 * Last Modified: 2026-06-03
 * Last Modified Summary: Initial implementation — first surface where Marco can create entities "as FleetCrown".
 */

import { ChevronDown, User, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  useMessagingActors,
  type MessagingActor,
} from '@/features/messaging/hooks/useMessagingActors';

interface ActorSelectorProps {
  /** Selected actor_id, or `null` for the user's personal actor. */
  value: string | null;
  onChange: (actorId: string | null) => void;
  /** Hide the control even when group actors exist (e.g. in edit mode). */
  disabled?: boolean;
  className?: string;
}

function ActorBadge({ actor }: { actor: MessagingActor }) {
  const Icon = actor.actor_type === 'group' ? Users : User;
  return (
    <span className="flex items-center gap-2">
      <Avatar className="h-5 w-5">
        <AvatarImage src={actor.avatar_url || undefined} />
        <AvatarFallback className="text-[8px]">
          <Icon className="h-2.5 w-2.5" />
        </AvatarFallback>
      </Avatar>
      <span className="text-sm font-medium text-fg-primary">{actor.name}</span>
    </span>
  );
}

export function ActorSelector({ value, onChange, disabled, className }: ActorSelectorProps) {
  const { personalActor, groupActors, isLoading } = useMessagingActors();

  // Single-actor users (no groups they can post as) see no switcher.
  if (isLoading || groupActors.length === 0 || !personalActor) {
    return null;
  }

  const selected =
    (value && groupActors.find(a => a.actor_id === value)) ||
    (value === personalActor.actor_id ? personalActor : personalActor);

  return (
    <div className={cn('flex items-center gap-2 text-xs text-fg-secondary', className)}>
      <span>Create as</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              'flex items-center gap-1.5 rounded-md border border-subtle bg-surface-page px-2 py-1',
              'hover:bg-surface-raised/60 disabled:cursor-not-allowed disabled:opacity-60'
            )}
          >
            <ActorBadge actor={selected} />
            <ChevronDown className="h-3.5 w-3.5 text-fg-tertiary" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          <DropdownMenuLabel>Create this on behalf of</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => onChange(null)}
            className={cn('flex items-center gap-2', !value && 'bg-surface-raised')}
          >
            <ActorBadge actor={personalActor} />
            <span className="ml-auto text-xs text-fg-secondary">Personal</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-fg-secondary">Organizations</DropdownMenuLabel>
          {groupActors.map(actor => (
            <DropdownMenuItem
              key={actor.actor_id}
              onClick={() => onChange(actor.actor_id)}
              className={cn(
                'flex items-center gap-2',
                value === actor.actor_id && 'bg-surface-raised'
              )}
            >
              <ActorBadge actor={actor} />
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
