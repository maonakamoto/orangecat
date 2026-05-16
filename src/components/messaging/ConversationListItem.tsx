'use client';

import Link from 'next/link';
import { formatRelativeTime } from '@/utils/dates';
import { Users, MessageSquare, Trash2 } from 'lucide-react';
import AvatarLink from '@/components/ui/AvatarLink';
import { cn } from '@/lib/utils';
import { GRADIENTS } from '@/config/gradients';
import type { Conversation } from '@/features/messaging/types';

function buildProfileHref(participant?: Conversation['participants'][number]): string | null {
  if (!participant) {
    return null;
  }
  if (
    participant.username &&
    typeof participant.username === 'string' &&
    participant.username.trim()
  ) {
    return `/profiles/${encodeURIComponent(participant.username.trim())}`;
  }
  if (
    participant.user_id &&
    typeof participant.user_id === 'string' &&
    participant.user_id.trim()
  ) {
    return `/profiles/${encodeURIComponent(participant.user_id.trim())}`;
  }
  return null;
}

function getOtherParticipants(
  conversation: Conversation,
  currentUserId: string | undefined
): Conversation['participants'] {
  return (conversation.participants || []).filter(
    p => p && p.is_active && p.user_id !== currentUserId
  );
}

function getConversationDisplayName(
  conversation: Conversation,
  currentUserId: string | undefined
): string {
  if (conversation.title) {
    return conversation.title;
  }
  const others = getOtherParticipants(conversation, currentUserId);
  if (others.length === 1) {
    return others[0].name || others[0].username || 'Unknown User';
  }
  if (others.length === 0) {
    return 'Notes to Self';
  }
  return (
    others
      .slice(0, 3)
      .map(p => p.name || p.username || 'Unknown')
      .filter(Boolean)
      .join(', ') + (others.length > 3 ? ` +${others.length - 3}` : '')
  );
}

function getConversationProfileHref(
  conversation: Conversation,
  currentUserId: string | undefined
): string | null {
  if (conversation.is_group) {
    return null;
  }
  const primary = getOtherParticipants(conversation, currentUserId)[0];
  return buildProfileHref(primary);
}

function getConversationAvatar(
  conversation: Conversation,
  currentUserId: string | undefined
): React.ReactNode {
  const others = getOtherParticipants(conversation, currentUserId);

  if (conversation.is_group) {
    return (
      <div
        className={cn(
          GRADIENTS.brandTiffanyBr,
          'w-10 h-10 rounded-full flex items-center justify-center text-white'
        )}
      >
        <Users className="w-5 h-5" />
      </div>
    );
  }

  if (others.length >= 1) {
    const p = others[0];
    return (
      <AvatarLink
        username={p?.username && typeof p.username === 'string' ? p.username : null}
        userId={p?.user_id && typeof p.user_id === 'string' ? p.user_id : null}
        avatarUrl={p?.avatar_url && typeof p.avatar_url === 'string' ? p.avatar_url : null}
        name={p?.name && typeof p.name === 'string' ? p.name : null}
        size={40}
        className="flex-shrink-0"
      />
    );
  }

  return (
    <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-muted flex items-center justify-center">
      <MessageSquare className="w-5 h-5 text-muted-foreground" />
    </div>
  );
}

export interface ConversationListItemProps {
  conversation: Conversation;
  isSelected: boolean;
  isActiveConversation: boolean;
  selectionMode: boolean;
  currentUserId: string | undefined;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerEnter: () => void;
  onPointerUp: () => void;
  onClick: () => void;
  onToggleSelect: () => void;
  onDeleteRequest: () => void;
}

export function ConversationListItem({
  conversation,
  isSelected,
  isActiveConversation,
  selectionMode,
  currentUserId,
  onPointerDown,
  onPointerEnter,
  onPointerUp,
  onClick,
  onToggleSelect,
  onDeleteRequest,
}: ConversationListItemProps) {
  const displayName = getConversationDisplayName(conversation, currentUserId);
  const profileHref = getConversationProfileHref(conversation, currentUserId);

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerEnter={onPointerEnter}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={onClick}
      className={cn(
        'p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-muted/50 cursor-pointer transition-all duration-150 flex items-start gap-3 group',
        isActiveConversation && 'bg-card shadow-sm border-l-4 border-tiffany-500',
        selectionMode && 'pr-3'
      )}
    >
      {selectionMode && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={e => {
            e.stopPropagation();
            onToggleSelect();
          }}
          className="mt-2"
        />
      )}
      {getConversationAvatar(conversation, currentUserId)}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-foreground truncate">
                {profileHref ? (
                  <Link href={profileHref} className="hover:underline">
                    {displayName}
                  </Link>
                ) : (
                  displayName
                )}
              </h3>
              {conversation.unread_count > 0 && (
                <span className="bg-tiffany-500 text-white text-[11px] leading-4 rounded-full px-2 py-0.5">
                  {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {conversation.last_message_preview || 'No messages yet'}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>
                {conversation.last_message_at
                  ? formatRelativeTime(conversation.last_message_at)
                  : 'No messages'}
              </span>
              <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-muted-foreground/40" />
              <span>
                {conversation.is_group
                  ? `${conversation.participants.length} members`
                  : 'Direct message'}
              </span>
            </div>
          </div>
          {!selectionMode && (
            <button
              type="button"
              aria-label="Delete conversation"
              className="p-1 rounded-md text-gray-400 dark:text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 self-start"
              onClick={e => {
                e.stopPropagation();
                onDeleteRequest();
              }}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
