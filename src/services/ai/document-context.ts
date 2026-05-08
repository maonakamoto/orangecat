/**
 * Comprehensive Context Service for My Cat AI
 *
 * Orchestrates fetching all relevant context for personalized AI responses.
 * Sub-modules handle specific concerns:
 *   - document-context-types.ts — shared interfaces
 *   - entity-context-fetcher.ts — entity data (products, services, projects, …)
 *   - social-context-fetcher.ts — conversations, inbound activity, group memberships
 *   - context-string-builder.ts — format context as a prompt string
 */

import type { AnySupabaseClient } from '@/lib/supabase/types';
import { logger } from '@/utils/logger';
import { ENTITY_REGISTRY } from '@/config/entity-registry';
import { DATABASE_TABLES } from '@/config/database-tables';

import type {
  DocumentContext,
  ProfileContext,
  WalletSummary,
  TaskSummary,
  PaymentCapabilities,
  FullUserContext,
} from './document-context-types';

import { fetchEntitiesForCat } from './entity-context-fetcher';
import {
  fetchConversationsForCat,
  fetchInboundActivityForCat,
  fetchGroupMembershipsForCat,
} from './social-context-fetcher';

// Re-export types so existing callers stay unchanged
export type {
  DocumentContext,
  ProfileContext,
  EntitySummary,
  TaskSummary,
  WalletSummary,
  PaymentCapabilities,
  ConversationSummary,
  SaleRecord,
  GroupMembershipSummary,
  BookingRecord,
  InboundActivity,
  FullUserContext,
} from './document-context-types';

// Re-export string builders so existing callers stay unchanged
export { buildFullContextString } from './context-string-builder';

// Re-export entity fetcher so callers can import directly if needed
export { fetchEntitiesForCat } from './entity-context-fetcher';

// Re-export social fetchers
export {
  fetchConversationsForCat,
  fetchInboundActivityForCat,
  fetchGroupMembershipsForCat,
} from './social-context-fetcher';

async function fetchDocumentsForCat(
  supabase: AnySupabaseClient,
  userId: string
): Promise<DocumentContext[]> {
  try {
    const { data: actor, error: actorError } = await supabase
      .from(DATABASE_TABLES.ACTORS)
      .select('id')
      .eq('actor_type', 'user')
      .eq('user_id', userId)
      .maybeSingle();

    if (actorError || !actor) {
      logger.warn('Could not find actor for user', { userId }, 'DocumentContext');
      return [];
    }

    const { data: documents, error: docsError } = await supabase
      .from(ENTITY_REGISTRY.document.tableName)
      .select('id, title, content, document_type, visibility')
      .eq('actor_id', actor.id)
      .in('visibility', ['cat_visible', 'public'])
      .order('document_type', { ascending: true });

    if (docsError) {
      logger.error('Failed to fetch documents for cat', docsError, 'DocumentContext');
      return [];
    }

    return (documents || []) as DocumentContext[];
  } catch (error) {
    logger.error('Exception fetching documents for cat', error, 'DocumentContext');
    return [];
  }
}

async function fetchProfileForCat(
  supabase: AnySupabaseClient,
  userId: string
): Promise<ProfileContext | null> {
  try {
    const { data: profile, error: profileError } = await supabase
      .from(DATABASE_TABLES.PROFILES)
      .select('username, name, bio, location_city, location_country, background, website')
      .eq('id', userId)
      .maybeSingle();

    if (profileError || !profile) {
      return null;
    }

    return {
      username: profile.username,
      name: profile.name,
      bio: profile.bio,
      location_city: profile.location_city,
      location_country: profile.location_country,
      background: profile.background,
      website: profile.website,
    };
  } catch (error) {
    logger.error('Exception fetching profile for cat', error, 'DocumentContext');
    return null;
  }
}

async function fetchWalletsForCat(
  supabase: AnySupabaseClient,
  userId: string
): Promise<WalletSummary[]> {
  try {
    const { data: profile } = await supabase
      .from(DATABASE_TABLES.PROFILES)
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!profile) {
      return [];
    }

    const { data: wallets, error } = await supabase
      .from(DATABASE_TABLES.WALLETS)
      .select(
        'label, description, category, behavior_type, goal_amount, goal_currency, goal_deadline, budget_amount, budget_period, is_primary, nwc_connection_uri, lightning_address'
      )
      .eq('profile_id', profile.id)
      .eq('is_active', true)
      .limit(20);

    if (error) {
      logger.warn('Failed to fetch wallets for cat', { error: error.message }, 'DocumentContext');
      return [];
    }

    return (wallets || []).map(w => ({
      label: w.label,
      description: w.description,
      category: w.category,
      behavior_type: w.behavior_type,
      goal_amount: w.goal_amount,
      goal_currency: w.goal_currency,
      goal_deadline: w.goal_deadline,
      budget_amount: w.budget_amount,
      budget_period: w.budget_period,
      is_primary: w.is_primary,
      has_nwc: !!w.nwc_connection_uri,
      lightning_address: w.lightning_address ?? null,
    })) as WalletSummary[];
  } catch (error) {
    logger.error('Exception fetching wallets for cat', error, 'DocumentContext');
    return [];
  }
}

async function fetchTasksForCat(
  supabase: AnySupabaseClient,
  userId: string
): Promise<TaskSummary[]> {
  try {
    const { data: tasks, error } = await supabase
      .from(DATABASE_TABLES.TASKS)
      .select(
        'id, title, category, priority, current_status, task_type, schedule_human, due_date, is_reminder'
      )
      .eq('created_by', userId)
      .eq('is_archived', false)
      .eq('is_completed', false)
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('priority', { ascending: false })
      .limit(30);

    if (error) {
      logger.warn('Failed to fetch tasks for cat', { error: error.message }, 'DocumentContext');
      return [];
    }

    return (tasks || []) as TaskSummary[];
  } catch (error) {
    logger.error('Exception fetching tasks for cat', error, 'DocumentContext');
    return [];
  }
}

export async function fetchFullContextForCat(
  supabase: AnySupabaseClient,
  userId: string
): Promise<FullUserContext> {
  const [
    profile,
    documents,
    { entities, stats },
    tasks,
    wallets,
    conversations,
    inboundActivity,
    memberGroups,
  ] = await Promise.all([
    fetchProfileForCat(supabase, userId),
    fetchDocumentsForCat(supabase, userId),
    fetchEntitiesForCat(supabase, userId),
    fetchTasksForCat(supabase, userId),
    fetchWalletsForCat(supabase, userId),
    fetchConversationsForCat(supabase, userId),
    fetchInboundActivityForCat(supabase, userId),
    fetchGroupMembershipsForCat(supabase, userId),
  ]);

  const urgentTasks = tasks.filter(
    t => t.priority === 'urgent' || t.current_status === 'needs_attention'
  ).length;

  const paymentCapabilities: PaymentCapabilities = {
    hasNwcWallet: wallets.some(w => w.has_nwc),
    lightningAddress: wallets.find(w => w.lightning_address)?.lightning_address ?? null,
  };

  return {
    profile,
    documents,
    entities,
    tasks,
    wallets,
    conversations,
    inboundActivity,
    memberGroups,
    paymentCapabilities,
    stats: {
      ...stats,
      totalTasks: tasks.length,
      urgentTasks,
      totalWallets: wallets.length,
    },
  };
}
