import { fromTable } from '@/lib/supabase/untyped';
import supabase from '@/lib/supabase/browser';
import { DATABASE_TABLES } from '@/config/database-tables';
import { logger } from '@/utils/logger';

export async function getContract(contractId: string) {
  try {
    const { data, error } = await fromTable(supabase, DATABASE_TABLES.CONTRACTS)
      .select('*')
      .eq('id', contractId)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, contract: data };
  } catch (error) {
    logger.error('Exception getting contract', error, 'Contracts');
    return { success: false, error: 'Failed to get contract' };
  }
}
