import { logger } from '@/utils/logger';
import supabase from '@/lib/supabase/browser';
import { DATABASE_TABLES } from '@/config/database-tables';
import { getTableName } from '@/config/entity-registry';
import { PROJECT_STATUS } from '@/config/project-statuses';

// Raw database types
interface RawProject {
  id: string;
  user_id: string;
  title: string;
  status?: string;
  is_public?: boolean;
  created_at: string;
  [key: string]: unknown;
}

interface RawTransaction {
  amount_btc?: number;
  from_entity_id?: string;
  to_entity_id?: string;
  from_entity_type?: string;
  user_id?: string;
  amount?: number;
  [key: string]: unknown;
}

export interface FundraisingStats {
  totalProjects: number;
  totalRaised: number;
  totalSupporters: number;
  activeProjects: number;
}

/**
 * Get fundraising statistics for a specific user
 */
export async function getUserFundraisingStats(userId: string): Promise<FundraisingStats> {
  try {
    // Resolve user to actor for ownership filtering
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: actor } = (await (supabase.from(DATABASE_TABLES.ACTORS) as any)
      .select('id')
      .eq('user_id', userId)
      .eq('actor_type', 'user')
      .maybeSingle()) as { data: { id: string } | null };

    if (!actor) {
      return { totalProjects: 0, totalRaised: 0, totalSupporters: 0, activeProjects: 0 };
    }

    // Use centralized supabase client
    // Get user's projects via actor_id
    const { data: ownedProjects, error: ownedError } = await supabase
      .from(getTableName('project'))
      .select('*')
      .eq('actor_id', actor.id);

    if (ownedError) {
      throw ownedError;
    }

    // Organizations removed in MVP - only use user's own projects
    const uniqueProjects = (ownedProjects as RawProject[] | null) || [];

    // Get transactions for these projects to calculate stats
    const projectIds = uniqueProjects.map(p => p.id);
    let totalRaised = 0;
    let totalSupporters = 0;

    if (projectIds.length > 0) {
      // Build OR filter for multiple project IDs
      const projectFilters = projectIds.map(id => `to_entity_id.eq.${id}`).join(',');

      // Only query transactions if we have valid project IDs
      if (projectFilters) {
        const { data: transactions, error: transactionsError } = await supabase
          .from(DATABASE_TABLES.TRANSACTIONS)
          .select('amount_btc, from_entity_id, to_entity_id, from_entity_type')
          .eq('to_entity_type', 'project')
          .or(projectFilters)
          .eq('status', 'confirmed');

        if (transactionsError) {
          throw transactionsError;
        }

        const txList = (transactions as RawTransaction[] | null) || [];
        totalRaised = txList.reduce((sum, t) => sum + (t.amount_btc || 0), 0);

        // Count unique donors (from_entity_id where from_entity_type = 'profile')
        const uniqueDonors = new Set(
          txList.filter(t => t.from_entity_type === 'profile').map(t => t.from_entity_id)
        );
        totalSupporters = uniqueDonors.size;
      }
    }

    const totalProjects = uniqueProjects.length;
    const activeProjects = uniqueProjects.filter(p => p.status === PROJECT_STATUS.ACTIVE).length;

    return {
      totalProjects,
      totalRaised,
      totalSupporters,
      activeProjects,
    };
  } catch (error) {
    logger.error('Error fetching fundraising stats', error, 'Fundraising');
    return {
      totalProjects: 0,
      totalRaised: 0,
      totalSupporters: 0,
      activeProjects: 0,
    };
  }
}

export async function getRecentDonationsCount(userId: string): Promise<number> {
  try {
    // Use centralized supabase client

    // Get start of current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get user's funding pages
    const { data: pages3, error: pagesError } = await supabase
      .from(getTableName('project'))
      .select('id')
      .eq('user_id', userId);

    if (pagesError) {
      throw pagesError;
    }
    if (!pages3 || pages3.length === 0) {
      return 0;
    }

    const pageIds = (pages3 as Array<{ id: string }>).map(page => page.id);

    // Count transactions this month
    const { count, error: transactionsError } = await supabase
      .from(DATABASE_TABLES.TRANSACTIONS)
      .select('*', { count: 'exact', head: true })
      .in('funding_page_id', pageIds)
      .eq('status', 'confirmed')
      .gte('created_at', startOfMonth.toISOString());

    if (transactionsError) {
      throw transactionsError;
    }

    return count || 0;
  } catch (error) {
    logger.error('Error getting recent donations count', error, 'Fundraising');
    return 0;
  }
}
