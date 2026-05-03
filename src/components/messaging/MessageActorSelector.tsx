'use client';

import React from 'react';
import { ChevronDown, User, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MessagingActor } from '@/features/messaging/hooks/useMessagingActors';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

interface MessageActorSelectorProps {
  selectedActor: MessagingActor;
  selectedActorId: string | null;
  personalActor: MessagingActor | null;
  groupActors: MessagingActor[];
  onSelectActor: (id: string | null) => void;
}

export function MessageActorSelector({
  selectedActor,
  selectedActorId,
  personalActor,
  groupActors,
  onSelectActor,
}: MessageActorSelectorProps) {
  return (
    <div className="mb-2 flex items-center gap-2 text-xs text-gray-500">
      <span>Sending as:</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <Avatar className="h-4 w-4">
              <AvatarImage src={selectedActor.avatar_url || undefined} />
              <AvatarFallback className="text-[8px]">
                {selectedActor.actor_type === 'group' ? (
                  <Users className="h-2.5 w-2.5" />
                ) : (
                  <User className="h-2.5 w-2.5" />
                )}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium text-gray-700">{selectedActor.name}</span>
            <ChevronDown className="h-3 w-3 text-gray-400" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Send message as</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {personalActor && (
            <DropdownMenuItem
              onClick={() => onSelectActor(null)}
              className={cn(
                'flex items-center gap-2 cursor-pointer',
                (!selectedActorId || selectedActorId === personalActor.actor_id) && 'bg-gray-100'
              )}
            >
              <Avatar className="h-6 w-6">
                <AvatarImage src={personalActor.avatar_url || undefined} />
                <AvatarFallback>
                  <User className="h-3 w-3" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium">{personalActor.name}</p>
                <p className="text-xs text-gray-500">Personal account</p>
              </div>
            </DropdownMenuItem>
          )}
          {groupActors.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-gray-500">Organizations</DropdownMenuLabel>
              {groupActors.map(actor => (
                <DropdownMenuItem
                  key={actor.actor_id}
                  onClick={() => onSelectActor(actor.actor_id)}
                  className={cn(
                    'flex items-center gap-2 cursor-pointer',
                    selectedActorId === actor.actor_id && 'bg-gray-100'
                  )}
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={actor.avatar_url || undefined} />
                    <AvatarFallback>
                      <Users className="h-3 w-3" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{actor.name}</p>
                    <p className="text-xs text-gray-500">Organization</p>
                  </div>
                </DropdownMenuItem>
              ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
