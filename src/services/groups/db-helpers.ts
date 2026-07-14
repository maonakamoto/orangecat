/**
 * Groups Service Database Helpers
 *
 * The dynamic-table escape hatch now lives in the shared @/lib/supabase/untyped
 * module (used across all services, not just groups). This file re-exports it so
 * the group call sites importing from here keep working with no churn.
 */

export { fromTable, callRpc } from '@/lib/supabase/untyped';
export type { AnySupabaseClient } from '@/lib/supabase/types';
