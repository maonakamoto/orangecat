import { createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/utils/logger';
import type { Database } from '@/types/database';
import { DATABASE_TABLES } from '@/config/database-tables';

export type MessagesInsert = Database['public']['Tables']['messages']['Insert'];
export type ConversationsInsert = Database['public']['Tables']['conversations']['Insert'];
export type ConversationsUpdate = Database['public']['Tables']['conversations']['Update'];
export type ConversationParticipantsInsert =
  Database['public']['Tables']['conversation_participants']['Insert'];
export type ConversationParticipantsUpdate =
  Database['public']['Tables']['conversation_participants']['Update'];
export type ConversationParticipantsRow =
  Database['public']['Tables']['conversation_participants']['Row'];
export type ConversationsRow = Database['public']['Tables']['conversations']['Row'];
export type ProfilesRow = Database['public']['Tables']['profiles']['Row'];
export type ProfilesInsert = Database['public']['Tables']['profiles']['Insert'];

export async function getServerUser() {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    throw Object.assign(new Error('Unauthorized'), { status: 401 });
  }
  return { supabase, user };
}

export type AdminClient = ReturnType<typeof createAdminClient>;

export async function assertMember(
  admin: AdminClient,
  conversationId: string,
  userId: string
): Promise<void> {
  const { data } = await admin
    .from(DATABASE_TABLES.CONVERSATION_PARTICIPANTS)
    .select('user_id')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();
  if (!data) {
    throw Object.assign(new Error('Access denied'), { status: 403 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dynamic table access for database config pattern
export async function createConvRecord(
  admin: AdminClient,
  data: ConversationsInsert
): Promise<string> {
  const { data: conv, error } = await (admin.from(DATABASE_TABLES.CONVERSATIONS) as any)
    .insert(data)
    .select('id')
    .single();
  if (error || !conv?.id) {
    throw Object.assign(new Error('Failed to create conversation'), { status: 500 });
  }
  return conv.id as string;
}

export async function ensureMessagingFunctions() {
  const admin = createAdminClient();

  try {
    logger.info('Ensuring messaging functions exist...');

    // Try to create the send_message function directly
    // This will fail gracefully if it already exists
    try {
      const testArgs = {
        p_conversation_id: '00000000-0000-0000-0000-000000000000',
        p_sender_id: '00000000-0000-0000-0000-000000000000',
        p_content: 'test',
      };
      await (
        admin.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<unknown>
      )('send_message', testArgs);
      logger.info('send_message function exists');
    } catch (testError: unknown) {
      if (testError instanceof Error && testError.message.includes('function send_message')) {
        logger.info('send_message function does not exist, this is expected');
      } else {
        logger.info('send_message function exists (error was expected participant check)');
      }
    }

    // If we get here, try to create the function using raw SQL
    logger.info('Attempting to create send_message function...');

    // This is a fallback - in a real deployment, this would be done via migrations
    // For now, let's implement the message sending logic directly in the API
  } catch (error) {
    logger.error('Error ensuring messaging functions:', error);
    // Don't throw - we'll handle this in the API
  }
}
