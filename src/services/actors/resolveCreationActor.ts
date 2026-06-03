/**
 * Resolve the actor that will own a newly-created entity.
 *
 * Defaults to the user's personal actor. If the caller requests a different
 * actor (e.g. the actor of a group the user belongs to), verify they have
 * authority — founder / admin / moderator role in the linked group. Anything
 * else throws ActorNotPermittedError, which API handlers convert to 403.
 *
 * Created: 2026-06-03
 * Last Modified: 2026-06-03
 * Last Modified Summary: Initial implementation — unlocks the "create as group" actor switcher in entity wizards.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/utils/logger';
import { DATABASE_TABLES } from '@/config/database-tables';
import { getOrCreateUserActor } from './getOrCreateUserActor';

export class ActorNotPermittedError extends Error {
  constructor(public actorId: string) {
    super(`User is not permitted to create entities as actor ${actorId}`);
    this.name = 'ActorNotPermittedError';
  }
}

const PRIVILEGED_ROLES = ['founder', 'admin', 'moderator'] as const;

/**
 * @param userId - The authenticated user.
 * @param requestedActorId - Optional actor the user is asking to create as.
 *        `null`/`undefined` means "use personal actor".
 * @throws ActorNotPermittedError when the user lacks rights to act as the requested actor.
 */
export async function resolveCreationActor(
  userId: string,
  requestedActorId?: string | null
): Promise<{ id: string }> {
  if (!requestedActorId) {
    return getOrCreateUserActor(userId);
  }

  const admin = createAdminClient();

  // Personal actor of the requesting user → trivially allowed.
  const { data: actorRow } = await admin
    .from(DATABASE_TABLES.ACTORS)
    .select('id, actor_type, user_id')
    .eq('id', requestedActorId)
    .maybeSingle();

  if (
    actorRow &&
    (actorRow as { actor_type: string; user_id: string | null }).actor_type === 'user' &&
    (actorRow as { actor_type: string; user_id: string | null }).user_id === userId
  ) {
    return { id: requestedActorId };
  }

  // Group actor → user must be a privileged member of the linked group.
  const { data: groupRow } = await admin
    .from(DATABASE_TABLES.GROUPS)
    .select('id, actor_id')
    .eq('actor_id', requestedActorId)
    .maybeSingle();

  const groupId = (groupRow as { id: string; actor_id: string } | null)?.id;
  if (!groupId) {
    logger.warn('resolveCreationActor: actor is not the actor of any group', {
      requestedActorId,
      userId,
    });
    throw new ActorNotPermittedError(requestedActorId);
  }

  const { data: membership } = await admin
    .from(DATABASE_TABLES.GROUP_MEMBERS)
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .in('role', PRIVILEGED_ROLES as unknown as string[])
    .maybeSingle();

  if (!membership) {
    logger.warn('resolveCreationActor: user lacks privileged role in group', {
      requestedActorId,
      groupId,
      userId,
    });
    throw new ActorNotPermittedError(requestedActorId);
  }

  return { id: requestedActorId };
}
