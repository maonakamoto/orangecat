/**
 * Messaging API Helpers
 *
 * Database operations shared by the conversation-messages route.
 * Extracted to keep the route thin (HTTP layer only).
 */

import { fromTable } from '@/lib/supabase/untyped';
import { createAdminClient } from '@/lib/supabase/admin';
import { DATABASE_TABLES } from '@/config/database-tables';
import type { Database } from '@/types/database';
import {
  fetchMessages as svcFetchMessages,
  sendMessage as svcSendMessage,
} from '@/features/messaging/service.server';
import type { Message, Pagination } from './types';

type AdminClient = ReturnType<typeof createAdminClient>;

type ParticipantRow = {
  user_id: string;
  role: string;
  joined_at: string;
  last_read_at: string | null;
  is_active: boolean;
  profiles: { username: string | null; name: string | null; avatar_url: string | null } | null;
};

export interface ConversationContext {
  conversation: Record<string, unknown>;
  formattedParticipants: Array<{
    user_id: string;
    username: string;
    name: string;
    avatar_url: string;
    role: string;
    joined_at: string;
    last_read_at: string | null;
    is_active: boolean;
  }>;
  unreadCount: number;
}

/**
 * Fetch conversation + participants + unread count for the GET response.
 * Returns null if the conversation doesn't exist.
 */
export async function fetchConversationContext(
  admin: AdminClient,
  conversationId: string,
  userId: string
): Promise<ConversationContext | null> {
  const [convResult, participantsResult] = await Promise.all([
    fromTable(admin, DATABASE_TABLES.CONVERSATIONS).select('*').eq('id', conversationId).single(),
    admin
      .from(DATABASE_TABLES.CONVERSATION_PARTICIPANTS)
      .select(
        'user_id, role, joined_at, last_read_at, is_active, profiles:user_id (id, username, name, avatar_url)'
      )
      .eq('conversation_id', conversationId),
  ]);

  if (convResult.error || !convResult.data) {
    return null;
  }

  const formattedParticipants = ((participantsResult.data || []) as ParticipantRow[]).map(p => ({
    user_id: p.user_id,
    username: p.profiles?.username || '',
    name: p.profiles?.name || '',
    avatar_url: p.profiles?.avatar_url || '',
    role: p.role,
    joined_at: p.joined_at,
    last_read_at: p.last_read_at,
    is_active: p.is_active,
  }));

  const userParticipant = formattedParticipants.find(p => p.user_id === userId);
  let unreadCount = 0;
  if (userParticipant?.last_read_at) {
    const { count } = await admin
      .from(DATABASE_TABLES.MESSAGES)
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .gt('created_at', userParticipant.last_read_at)
      .eq('is_deleted', false);
    unreadCount = count || 0;
  }

  return {
    conversation: convResult.data as Record<string, unknown>,
    formattedParticipants,
    unreadCount,
  };
}

/**
 * Verify the user is a participant and reactivate if soft-deleted.
 * Returns 'not_found' | 'ok'.
 */
export async function verifyParticipantAndReactivate(
  admin: AdminClient,
  conversationId: string,
  userId: string
): Promise<'not_found' | 'ok'> {
  const { data, error } = await admin
    .from(DATABASE_TABLES.CONVERSATION_PARTICIPANTS)
    .select('user_id, is_active')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    return 'not_found';
  }

  const participant = data as { is_active?: boolean };
  if (participant.is_active === false) {
    const updateData: Database['public']['Tables']['conversation_participants']['Update'] = {
      is_active: true,
      last_read_at: new Date().toISOString(),
    };

    await fromTable(admin, DATABASE_TABLES.CONVERSATION_PARTICIPANTS)
      .update(updateData)
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);
  }

  return 'ok';
}

/** Success payload for the GET messages response. */
export interface ConversationMessagesPayload {
  conversation: Record<string, unknown>;
  messages: Message[];
  pagination: Pagination;
}

/**
 * Load a conversation's messages for the GET handler.
 *
 * Verifies participant access (distinguishing forbidden vs. not-found the same
 * way the route did), then fetches messages + conversation context in parallel.
 * Returns a discriminated result the route maps to an HTTP response.
 */
export async function loadConversationMessages(
  conversationId: string,
  userId: string,
  cursor: string | undefined,
  limit: number
): Promise<
  { ok: true; data: ConversationMessagesPayload } | { ok: false; code: 'forbidden' | 'not_found' }
> {
  const admin = createAdminClient();

  // Verify participant access
  const { data: participant, error: partError } = await admin
    .from(DATABASE_TABLES.CONVERSATION_PARTICIPANTS)
    .select('user_id, last_read_at, is_active')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (partError || !participant) {
    const { data: convExists } = await admin
      .from(DATABASE_TABLES.CONVERSATIONS)
      .select('id')
      .eq('id', conversationId)
      .maybeSingle();
    return { ok: false, code: convExists ? 'forbidden' : 'not_found' };
  }

  const [{ messages, pagination }, ctx] = await Promise.all([
    svcFetchMessages(conversationId, userId, cursor, limit),
    fetchConversationContext(admin, conversationId, userId),
  ]);

  if (!ctx) {
    return { ok: false, code: 'not_found' };
  }

  return {
    ok: true,
    data: {
      conversation: {
        ...ctx.conversation,
        participants: ctx.formattedParticipants,
        unread_count: ctx.unreadCount,
      },
      messages,
      pagination,
    },
  };
}

/** Validated input for sending a message. */
export interface SendMessageInput {
  content: string;
  messageType: string;
  metadata?: Record<string, unknown>;
  senderActorId?: string;
}

/**
 * Send a message on behalf of `userId` for the POST handler.
 *
 * Verifies (and reactivates) participation, then delegates the insert to the
 * messaging service. Returns a discriminated result the route maps to an HTTP
 * response ('forbidden' → not a participant).
 */
export async function postConversationMessage(
  conversationId: string,
  userId: string,
  input: SendMessageInput
): Promise<{ ok: true; id: string } | { ok: false; code: 'forbidden' }> {
  const admin = createAdminClient();

  const membership = await verifyParticipantAndReactivate(admin, conversationId, userId);
  if (membership === 'not_found') {
    return { ok: false, code: 'forbidden' };
  }

  const id = await svcSendMessage(
    conversationId,
    userId,
    input.content,
    input.messageType,
    input.metadata || null,
    input.senderActorId || null
  );
  return { ok: true, id };
}
