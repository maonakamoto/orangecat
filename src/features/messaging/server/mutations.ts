import { callRpc, fromTable } from '@/lib/supabase/untyped';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/utils/logger';
import type { Json } from '@/types/database';
import { DATABASE_TABLES } from '@/config/database-tables';
import {
  createConvRecord,
  ensureMessagingFunctions,
  getServerUser,
  type ConversationParticipantsInsert,
  type ConversationParticipantsUpdate,
  type ConversationsUpdate,
  type MessagesInsert,
  type ProfilesInsert,
} from './shared';

export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string,
  type: string = 'text',
  metadata: Record<string, unknown> | null = null,
  senderActorId?: string | null
): Promise<string> {
  const { user } = await getServerUser();
  if (!user) {
    throw Object.assign(new Error('Unauthorized'), { status: 401 });
  }

  // Verify sender matches authenticated user
  if (user.id !== senderId) {
    throw Object.assign(new Error('Sender ID does not match authenticated user'), { status: 403 });
  }

  try {
    // Use admin client to bypass RLS for participant check
    const admin = createAdminClient();

    // If senderActorId provided, verify user has permission to send as that actor
    if (senderActorId) {
      const { data: actor, error: actorError } = await fromTable(admin, DATABASE_TABLES.ACTORS)
        .select('id, actor_type, user_id, group_id')
        .eq('id', senderActorId)
        .single();

      if (actorError || !actor) {
        throw Object.assign(new Error('Invalid sender actor'), { status: 400 });
      }

      // Personal actor: must belong to user
      if (actor.actor_type === 'user' && actor.user_id !== user.id) {
        throw Object.assign(new Error('Cannot send as this actor'), { status: 403 });
      }

      // Group actor: user must be admin/moderator of the group
      if (actor.actor_type === 'group' && actor.group_id) {
        const { data: membership, error: memberError } = await fromTable(
          admin,
          DATABASE_TABLES.GROUP_MEMBERS
        )
          .select('role')
          .eq('group_id', actor.group_id)
          .eq('user_id', user.id)
          .in('role', ['founder', 'admin', 'moderator'])
          .maybeSingle();

        if (memberError || !membership) {
          throw Object.assign(new Error('Not authorized to send as this group'), { status: 403 });
        }
      }
    }

    // First verify the sender is a participant
    const { data: participant, error: partError } = await admin
      .from(DATABASE_TABLES.CONVERSATION_PARTICIPANTS)
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (partError || !participant) {
      throw Object.assign(new Error('User is not a participant in this conversation'), {
        status: 403,
      });
    }

    // Insert the message directly using admin client to bypass RLS
    const messageData: MessagesInsert = {
      conversation_id: conversationId,
      sender_id: user.id,
      content: content,
      message_type: type,
      metadata: (metadata || {}) as Json,
    };

    // Add sender_actor_id if provided (column added by migration)
    if (senderActorId) {
      (messageData as MessagesInsert & { sender_actor_id?: string }).sender_actor_id =
        senderActorId;
    }

    const { data: message, error: insertError } = await fromTable(admin, DATABASE_TABLES.MESSAGES)
      .insert(messageData)
      .select('id')
      .single();

    if (insertError || !message) {
      logger.error('Error inserting message:', insertError);
      throw Object.assign(new Error('Failed to send message'), { status: 500 });
    }

    // Update conversation metadata using admin client
    const conversationUpdate: ConversationsUpdate = {
      last_message_at: new Date().toISOString(),
      last_message_preview: content.substring(0, 100),
      last_message_sender_id: senderId,
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await fromTable(admin, DATABASE_TABLES.CONVERSATIONS)
      .update(conversationUpdate)
      .eq('id', conversationId);

    if (updateError) {
      logger.warn('Failed to update conversation metadata:', updateError);
      // Don't fail the message send for this
    }

    // Update participant's last_read_at for sender using admin client to avoid RLS recursion
    const participantUpdate: ConversationParticipantsUpdate = {
      last_read_at: new Date().toISOString(),
    };

    const updateQuery = fromTable(admin, DATABASE_TABLES.CONVERSATION_PARTICIPANTS)
      .update(participantUpdate)
      .eq('conversation_id', conversationId)
      .eq('user_id', senderId);
    const { error: readError } = await updateQuery;

    if (readError) {
      logger.warn('Failed to update sender read time:', readError);
      // Don't fail the message send for this
    }

    logger.info('Message sent successfully:', message.id);
    return message.id;
  } catch (error) {
    logger.error('Error sending message:', error);
    throw error;
  }
}

export async function markConversationRead(conversationId: string) {
  const { user } = await getServerUser();
  if (!user) {
    throw Object.assign(new Error('Unauthorized'), { status: 401 });
  }

  // Use admin client to bypass RLS issues
  const admin = createAdminClient();
  const participantUpdate: ConversationParticipantsUpdate = {
    last_read_at: new Date().toISOString(),
  };

  await fromTable(admin, DATABASE_TABLES.CONVERSATION_PARTICIPANTS)
    .update(participantUpdate)
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id);
}

// Conversation creation helpers (self/direct/group)
export async function openConversation(
  participantIds: string[],
  title?: string | null
): Promise<string> {
  const { supabase, user } = await getServerUser();
  if (!user) {
    throw Object.assign(new Error('Unauthorized'), { status: 401 });
  }

  // Ensure messaging functions exist
  await ensureMessagingFunctions();

  // Ensure profile exists for FK constraints (admin fallback)
  const admin = createAdminClient();
  const ensureProfile = async (id: string) => {
    const { data: existing, error: checkError } = await admin
      .from(DATABASE_TABLES.PROFILES)
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (checkError) {
      throw checkError;
    }

    if (!existing) {
      const profileData: ProfilesInsert = {
        id,
        username: `user_${id.slice(0, 8)}`,
        name: 'User',
      };

      const insertQuery = fromTable(admin, DATABASE_TABLES.PROFILES).insert(profileData);
      const { error: insertError } = await insertQuery;
      if (insertError) {
        throw insertError;
      }
    }
  };

  // Self conversation (Notes to Self)
  if (!participantIds || participantIds.length === 0) {
    await ensureProfile(user.id);
    const convId = await createConvRecord(admin, { created_by: user.id, is_group: false });
    const participantData: ConversationParticipantsInsert = {
      conversation_id: convId,
      user_id: user.id,
      role: 'member',
      is_active: true,
    };

    const { error: partErr } = await fromTable(
      admin,
      DATABASE_TABLES.CONVERSATION_PARTICIPANTS
    ).insert(participantData);
    if (partErr) {
      await fromTable(admin, DATABASE_TABLES.CONVERSATIONS).delete().eq('id', convId);
      throw Object.assign(new Error('Failed to add participant'), { status: 500 });
    }
    return convId;
  }

  // Direct message with one other user
  if (participantIds.length === 1) {
    const otherId = participantIds[0];
    await ensureProfile(user.id);
    await ensureProfile(otherId);

    const newId = await createConvRecord(admin, { created_by: user.id, is_group: false });
    const participantsData: ConversationParticipantsInsert[] = [
      { conversation_id: newId, user_id: user.id, role: 'member', is_active: true },
      { conversation_id: newId, user_id: otherId, role: 'member', is_active: true },
    ];

    const { error: pErr } = await fromTable(
      admin,
      DATABASE_TABLES.CONVERSATION_PARTICIPANTS
    ).insert(participantsData);
    if (pErr) {
      throw Object.assign(new Error('Failed to add participants'), { status: 500 });
    }
    return newId;
  }

  // Group conversation

  const { data: groupId, error: groupErr } = await callRpc(supabase, 'create_group_conversation', {
    p_created_by: user.id,
    p_participant_ids: participantIds,
    p_title: title || null,
  });
  if (!groupErr && groupId) {
    return groupId as unknown as string;
  }

  // Fallback: admin create
  await ensureProfile(user.id);
  for (const id of participantIds) {
    await ensureProfile(id);
  }
  const gid = await createConvRecord(admin, {
    created_by: user.id,
    is_group: true,
    title: title || null,
  });
  const rows: ConversationParticipantsInsert[] = [user.id, ...participantIds].map(pid => ({
    conversation_id: gid,
    user_id: pid,
    role: pid === user.id ? 'admin' : 'member',
    is_active: true,
  }));

  const { error: pErr } = await fromTable(admin, DATABASE_TABLES.CONVERSATION_PARTICIPANTS).insert(
    rows
  );
  if (pErr) {
    throw Object.assign(new Error('Failed to add participants'), { status: 500 });
  }
  return gid;
}
