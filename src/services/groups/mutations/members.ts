/**
 * Groups Member Mutation Functions
 *
 * Handles member management operations (join, leave, update).
 * Uses only the new groups tables.
 *
 * Created: 2025-01-30
 * Last Modified: 2025-12-29
 * Last Modified Summary: Simplified to use only new groups tables
 */

import supabase from '@/lib/supabase/browser';
import { logger } from '@/utils/logger';
import type { GroupMember, AddMemberInput, UpdateMemberInput } from '@/types/group';
import type { GroupMemberResponse } from '../types';
import { STATUS } from '@/config/database-constants';
import { DATABASE_TABLES } from '@/config/database-tables';
import { getCurrentUserId, isGroupMember, getUserRole } from '../utils/helpers';
import { logGroupActivity } from '../utils/activity';
import { canPerformAction } from '../permissions/resolver';
import type { AnySupabaseClient } from '@/lib/supabase/types';
import type { ServiceResult } from '@/types/common';
import { fromTable } from '../db-helpers';

/**
 * Join a group
 */
export async function joinGroup(
  groupId: string,
  client?: AnySupabaseClient
): Promise<ServiceResult> {
  try {
    const sb = client || supabase;
    const userId = await getCurrentUserId(sb);
    if (!userId) {
      return { success: false, error: 'Authentication required' };
    }

    // Get group to check join policy
    // Cast to any to bypass Supabase type generation for tables not in generated types

    const { data: group, error: groupError } = (await fromTable(sb, DATABASE_TABLES.GROUPS)
      .select('is_public, visibility')
      .eq('id', groupId)

      .single()) as {
      data: { is_public: boolean; visibility: string } | null;
      error: Error | null;
    };

    if (groupError || !group) {
      return { success: false, error: 'Group not found' };
    }

    // Check if group allows joining
    if (!group.is_public && group.visibility === 'private') {
      return { success: false, error: 'This group is private and requires an invitation' };
    }

    // Check if already a member
    const alreadyMember = await isGroupMember(groupId, userId, sb);
    if (alreadyMember) {
      return { success: false, error: 'Already a member of this group' };
    }

    // Create membership

    const { error: insertError } = await fromTable(sb, DATABASE_TABLES.GROUP_MEMBERS).insert({
      group_id: groupId,
      user_id: userId,
      role: 'member',
      invited_by: null,
    });

    if (insertError) {
      logger.error('Failed to join group', insertError, 'Groups');
      return { success: false, error: insertError.message };
    }

    // Log activity
    await logGroupActivity(groupId, userId, 'joined_group', 'Joined the group', undefined, sb);

    return { success: true };
  } catch (error) {
    logger.error('Exception joining group', error, 'Groups');
    return { success: false, error: 'Failed to join group' };
  }
}

/**
 * Leave a group
 */
export async function leaveGroup(
  groupId: string,
  client?: AnySupabaseClient
): Promise<ServiceResult> {
  try {
    const sb = client || supabase;
    const userId = await getCurrentUserId(sb);
    if (!userId) {
      return { success: false, error: 'Authentication required' };
    }

    // Check if user is founder (founders can't leave)
    const role = await getUserRole(groupId, userId, sb);

    if (role === STATUS.GROUP_MEMBERS.FOUNDER) {
      return {
        success: false,
        error: 'Group founders cannot leave. Transfer ownership or delete the group.',
      };
    }

    if (!role) {
      return { success: false, error: 'Not a member of this group' };
    }

    // Remove membership
    const { error } = await sb
      .from(DATABASE_TABLES.GROUP_MEMBERS)
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId);

    if (error) {
      logger.error('Failed to leave group', error, 'Groups');
      return { success: false, error: error.message };
    }

    // Log activity
    await logGroupActivity(groupId, userId, 'left_group', 'Left the group', undefined, sb);

    return { success: true };
  } catch (error) {
    logger.error('Exception leaving group', error, 'Groups');
    return { success: false, error: 'Failed to leave group' };
  }
}

/**
 * Add a member to a group (invite)
 */
export async function addMember(
  groupId: string,
  input: AddMemberInput,
  client?: AnySupabaseClient
): Promise<GroupMemberResponse> {
  try {
    const sb = client || supabase;
    const userId = await getCurrentUserId(sb);
    if (!userId) {
      return { success: false, error: 'Authentication required' };
    }

    // Check permissions
    const permResult = await canPerformAction(userId, groupId, 'invite_members', sb);
    if (!permResult.allowed) {
      return { success: false, error: permResult.reason || 'Insufficient permissions' };
    }

    // Check if target user is already a member
    const alreadyMember = await isGroupMember(groupId, input.user_id, sb);
    if (alreadyMember) {
      return { success: false, error: 'User is already a member' };
    }

    // Add member

    const { data, error } = await fromTable(sb, DATABASE_TABLES.GROUP_MEMBERS)
      .insert({
        group_id: groupId,
        user_id: input.user_id,
        role: input.role || 'member',
        invited_by: userId,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to add member', error, 'Groups');
      return { success: false, error: error.message };
    }

    // Log activity
    await logGroupActivity(groupId, userId, 'member_added', `Invited a new member`, undefined, sb);

    return { success: true, member: data as GroupMember };
  } catch (error) {
    logger.error('Exception adding member', error, 'Groups');
    return { success: false, error: 'Failed to add member' };
  }
}

/**
 * Update member role/permissions
 */
export async function updateMember(
  groupId: string,
  memberId: string,
  input: UpdateMemberInput,
  client?: AnySupabaseClient
): Promise<GroupMemberResponse> {
  try {
    const sb = client || supabase;
    const userId = await getCurrentUserId(sb);
    if (!userId) {
      return { success: false, error: 'Authentication required' };
    }

    // Check permissions
    const permResult = await canPerformAction(userId, groupId, 'manage_members', sb);
    if (!permResult.allowed) {
      return { success: false, error: permResult.reason || 'Insufficient permissions' };
    }

    // Build update payload
    const payload: Record<string, unknown> = {};

    if (input.role !== undefined) {
      payload.role = input.role;
    }
    if (input.permission_overrides !== undefined) {
      payload.permission_overrides = input.permission_overrides;
    }

    const { data, error } = await fromTable(sb, DATABASE_TABLES.GROUP_MEMBERS)
      .update(payload)
      .eq('group_id', groupId)
      .eq('user_id', memberId)
      .select()
      .single();

    if (error) {
      logger.error('Failed to update member', error, 'Groups');
      return { success: false, error: error.message };
    }

    return { success: true, member: data as GroupMember };
  } catch (error) {
    logger.error('Exception updating member', error, 'Groups');
    return { success: false, error: 'Failed to update member' };
  }
}

/**
 * Remove a member from a group
 */
export async function removeMember(
  groupId: string,
  memberId: string,
  client?: AnySupabaseClient
): Promise<ServiceResult> {
  try {
    const sb = client || supabase;
    const userId = await getCurrentUserId(sb);
    if (!userId) {
      return { success: false, error: 'Authentication required' };
    }

    // Check permissions
    const permResult = await canPerformAction(userId, groupId, 'remove_members', sb);
    if (!permResult.allowed) {
      return { success: false, error: permResult.reason || 'Insufficient permissions' };
    }

    // Can't remove founder
    const memberRole = await getUserRole(groupId, memberId, sb);
    if (memberRole === STATUS.GROUP_MEMBERS.FOUNDER) {
      return { success: false, error: 'Cannot remove the group founder' };
    }

    const { error } = await sb
      .from(DATABASE_TABLES.GROUP_MEMBERS)
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', memberId);

    if (error) {
      logger.error('Failed to remove member', error, 'Groups');
      return { success: false, error: error.message };
    }

    // Log activity
    await logGroupActivity(groupId, userId, 'member_removed', 'Removed a member', undefined, sb);

    return { success: true };
  } catch (error) {
    logger.error('Exception removing member', error, 'Groups');
    return { success: false, error: 'Failed to remove member' };
  }
}
