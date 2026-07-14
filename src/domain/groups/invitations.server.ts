/**
 * Group invitation domain logic (server-only).
 *
 * The accept/decline/revoke business rules — membership checks, status
 * transitions, expiry, admin gating — live here so the API route stays a thin
 * validate → delegate → respond wrapper. Each function returns a discriminated
 * result the route maps to an HTTP response (no HTTP concerns in this layer).
 */

import { DATABASE_TABLES } from '@/config/database-tables';
import { STATUS } from '@/config/database-constants';
import { checkGroupAdmin } from '@/domain/groups/helpers.server';
import type { AnySupabaseClient } from '@/lib/supabase/types';

/** Outcome codes the route maps to apiForbidden / apiNotFound / apiValidationError. */
export type InvitationErrorCode = 'not_found' | 'forbidden' | 'invalid';

export type InvitationResult =
  | { ok: true; message: string; group_slug?: string }
  | { ok: false; code: InvitationErrorCode; message: string }
  | { ok: false; dbError: unknown };

type InvitationRow = {
  user_id: string | null;
  status: string;
  expires_at: string;
  group_id: string;
  role: string;
  invited_by: string;
  groups: { slug: string } | null;
};

async function acceptInvitation(
  supabase: AnySupabaseClient,
  inv: InvitationRow,
  invitationId: string,
  userId: string
): Promise<InvitationResult> {
  const { data: existingMember } = await supabase
    .from(DATABASE_TABLES.GROUP_MEMBERS)
    .select('id')
    .eq('group_id', inv.group_id)
    .eq('user_id', userId)
    .maybeSingle();

  const markAccepted = () =>
    supabase
      .from(DATABASE_TABLES.GROUP_INVITATIONS)
      .update({ status: STATUS.GROUP_INVITATIONS.ACCEPTED, responded_at: new Date().toISOString() })
      .eq('id', invitationId);

  if (existingMember) {
    await markAccepted();
    return {
      ok: true,
      message: 'You are already a member of this group',
      group_slug: inv.groups?.slug,
    };
  }

  const { error: memberError } = await supabase.from(DATABASE_TABLES.GROUP_MEMBERS).insert({
    group_id: inv.group_id,
    user_id: userId,
    role: inv.role,
    invited_by: inv.invited_by,
  });
  if (memberError) {
    return { ok: false, dbError: memberError };
  }

  await markAccepted();
  return { ok: true, message: 'Successfully joined the group', group_slug: inv.groups?.slug };
}

/** Accept or decline an invitation addressed to `userId`. */
export async function respondToInvitation(
  supabase: AnySupabaseClient,
  invitationId: string,
  userId: string,
  action: 'accept' | 'decline'
): Promise<InvitationResult> {
  const { data: inv, error } = await supabase
    .from(DATABASE_TABLES.GROUP_INVITATIONS)
    .select('*, groups(slug)')
    .eq('id', invitationId)
    .single();

  if (error || !inv) {
    return { ok: false, code: 'not_found', message: 'Invitation not found' };
  }
  if (inv.user_id && inv.user_id !== userId) {
    return { ok: false, code: 'forbidden', message: 'This invitation is for another user' };
  }
  if (inv.status !== STATUS.GROUP_INVITATIONS.PENDING) {
    return { ok: false, code: 'invalid', message: 'Invitation has already been responded to' };
  }
  if (new Date(inv.expires_at) < new Date()) {
    await supabase
      .from(DATABASE_TABLES.GROUP_INVITATIONS)
      .update({ status: STATUS.GROUP_INVITATIONS.EXPIRED })
      .eq('id', invitationId);
    return { ok: false, code: 'invalid', message: 'Invitation has expired' };
  }

  if (action === 'accept') {
    return acceptInvitation(supabase, inv as InvitationRow, invitationId, userId);
  }

  await supabase
    .from(DATABASE_TABLES.GROUP_INVITATIONS)
    .update({ status: STATUS.GROUP_INVITATIONS.DECLINED, responded_at: new Date().toISOString() })
    .eq('id', invitationId);
  return { ok: true, message: 'Invitation declined' };
}

/** Revoke a pending invitation (group admins only). */
export async function revokeInvitation(
  supabase: AnySupabaseClient,
  invitationId: string,
  userId: string
): Promise<InvitationResult> {
  const { data: invitation, error } = await supabase
    .from(DATABASE_TABLES.GROUP_INVITATIONS)
    .select('group_id, status')
    .eq('id', invitationId)
    .single();

  if (error || !invitation) {
    return { ok: false, code: 'not_found', message: 'Invitation not found' };
  }

  const adminRole = await checkGroupAdmin(supabase, invitation.group_id, userId);
  if (!adminRole) {
    return { ok: false, code: 'forbidden', message: 'Only admins can revoke invitations' };
  }
  if (invitation.status !== STATUS.GROUP_INVITATIONS.PENDING) {
    return { ok: false, code: 'invalid', message: 'Can only revoke pending invitations' };
  }

  const { error: updateError } = await supabase
    .from(DATABASE_TABLES.GROUP_INVITATIONS)
    .update({ status: STATUS.GROUP_INVITATIONS.REVOKED })
    .eq('id', invitationId);

  if (updateError) {
    return { ok: false, dbError: updateError };
  }
  return { ok: true, message: 'Invitation revoked' };
}
