/**
 * Project Support Helpers
 *
 * Helper functions for project support operations.
 *
 * Created: 2025-01-30
 * Last Modified: 2025-01-30
 * Last Modified Summary: Created project support helper functions
 */

import supabase from '@/lib/supabase/browser';
import { logger } from '@/utils/logger';

/**
 * Get current user ID
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return user.id;
  } catch (error) {
    logger.error('Error getting current user ID', error, 'ProjectSupport');
    return null;
  }
}

// Re-export formatSats from SSOT to avoid duplication
// Use useDisplayCurrency hook in components for user-preferred currency
export { formatSats } from '@/services/currency';
