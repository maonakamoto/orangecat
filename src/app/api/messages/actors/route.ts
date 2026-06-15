/**
 * Messaging Actors API
 *
 * GET /api/messages/actors - Get actors the user can send messages as
 *
 * Returns:
 * - User's personal actor (always)
 * - Group actors (if user is admin/moderator of the group)
 */

import { withAuth, type AuthenticatedRequest } from '@/lib/api/withAuth';
import { createAdminClient } from '@/lib/supabase/admin';
import { apiSuccess, handleApiError } from '@/lib/api/standardResponse';
import { logger } from '@/utils/logger';
import { DATABASE_TABLES } from '@/config/database-tables';
// Single source of truth for the actor shape — shared with the client hook
// that consumes this endpoint (avoids the response/consumer types drifting).
import type { MessagingActor } from '@/features/messaging/hooks/useMessagingActors';

// Actor row shape from database (joined with profiles)
interface ActorRow {
  id: string;
  actor_type: string;
  user_id: string | null;
  profiles: { name: string | null; avatar_url: string | null } | null;
}

// Group membership row with nested group (no actor_id on groups — actors
// table has the inverse FK via actors.group_id).
interface GroupMembershipRow {
  group_id: string;
  role: string;
  groups: {
    id: string;
    name: string | null;
    avatar_url: string | null;
  } | null;
}

// Actor row joined back from the actors table by group_id.
interface GroupActorRow {
  id: string;
  group_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const { user } = req;
    const admin = createAdminClient();

    const actors: MessagingActor[] = [];

    // 1. Get user's personal actor (join profiles for name/avatar)
    const { data: personalActorData, error: personalError } = await admin
      .from(DATABASE_TABLES.ACTORS)
      .select('id, actor_type, user_id, profiles:user_id (name, avatar_url)')
      .eq('user_id', user.id)
      .eq('actor_type', 'user')
      .maybeSingle();

    if (personalError) {
      logger.error(
        'Error fetching personal actor',
        { error: personalError, userId: user.id },
        'MessagingActors'
      );
    }

    const personalActor = personalActorData as ActorRow | null;
    if (personalActor) {
      actors.push({
        actor_id: personalActor.id,
        actor_type: 'user',
        name: personalActor.profiles?.name || 'You',
        avatar_url: personalActor.profiles?.avatar_url || null,
        is_personal: true,
      });
    }

    // 2. Get group actors where user is a privileged member.
    //    Schema reality: actors.group_id points at groups (not the
    //    inverse). So we (a) find the groups the user runs, then (b)
    //    fetch actor rows whose group_id matches one of them.
    const { data: groupMemberships, error: groupError } = await admin
      .from(DATABASE_TABLES.GROUP_MEMBERS)
      .select(
        `
        group_id,
        role,
        groups:group_id (
          id,
          name,
          avatar_url
        )
      `
      )
      .eq('user_id', user.id)
      .in('role', ['founder', 'admin', 'moderator']);

    if (groupError) {
      logger.error(
        'Error fetching group memberships',
        { error: groupError, userId: user.id },
        'MessagingActors'
      );
    }

    const memberships = (groupMemberships || []) as GroupMembershipRow[];
    if (memberships.length > 0) {
      const groupIds = memberships.map(m => m.group_id).filter((id): id is string => !!id);

      if (groupIds.length > 0) {
        const { data: groupActorRows, error: groupActorError } = await admin
          .from(DATABASE_TABLES.ACTORS)
          .select('id, group_id, display_name, avatar_url')
          .eq('actor_type', 'group')
          .in('group_id', groupIds);

        if (groupActorError) {
          logger.error(
            'Error fetching group actors',
            { error: groupActorError, userId: user.id, groupIds },
            'MessagingActors'
          );
        }

        const groupActors = (groupActorRows || []) as GroupActorRow[];
        const groupById = new Map<string, GroupMembershipRow['groups']>();
        for (const m of memberships) {
          if (m.groups) {
            groupById.set(m.group_id, m.groups);
          }
        }

        for (const a of groupActors) {
          const linkedGroup = groupById.get(a.group_id);
          actors.push({
            actor_id: a.id,
            actor_type: 'group',
            name: a.display_name || linkedGroup?.name || 'Group',
            avatar_url: a.avatar_url || linkedGroup?.avatar_url || null,
            is_personal: false,
          });
        }
      }
    }

    return apiSuccess({ actors });
  } catch (error) {
    logger.error('Messaging actors API error', { error }, 'MessagingActors');
    return handleApiError(error);
  }
});
