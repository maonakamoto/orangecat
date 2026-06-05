import { toast } from 'sonner';
import { DATABASE_TABLES } from '@/config/database-tables';
import { API_ROUTES } from '@/config/api-routes';
import supabase from '@/lib/supabase/browser';
import type { Message } from '@/features/messaging/types';

export async function editMessageAction(
  messageId: string,
  newContent: string,
  handleNewMessage: (msg: Message) => void
): Promise<void> {
  try {
    const res = await fetch(API_ROUTES.MESSAGES.EDIT(messageId), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ content: newContent }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}) as Record<string, unknown>);
      const errMsg = (data.error as { message?: string } | undefined)?.message;
      toast.error(errMsg || 'Failed to edit message');
    } else {
      const { data: full } = await supabase
        .from(DATABASE_TABLES.MESSAGE_DETAILS)
        .select('*')
        .eq('id', messageId)
        .single();
      if (full) {
        handleNewMessage(full as Message);
      }
    }
  } catch {
    toast.error('Network error while editing');
  }
}

export async function deleteMessageAction(
  msg: Message | null,
  conversationId: string,
  removeMessage: (id: string) => void,
  closeMenu: () => void
): Promise<void> {
  if (!msg) {
    return;
  }
  try {
    const res = await fetch(API_ROUTES.MESSAGES.BULK_DELETE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ conversationId, ids: [msg.id] }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}) as Record<string, unknown>);
      const errMsg = (data.error as { message?: string } | undefined)?.message;
      toast.error(errMsg || 'Failed to delete message');
    } else {
      removeMessage(msg.id);
    }
  } catch {
    toast.error('Network error while deleting');
  } finally {
    closeMenu();
  }
}
