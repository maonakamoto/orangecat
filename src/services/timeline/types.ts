/**
 * Timeline Service Internal Types
 *
 * Typed interfaces for Supabase RPC responses and internal data structures
 * used across timeline service modules. Keeps `as any` out of business logic.
 *
 * Created: 2026-03-31
 * Last Modified: 2026-03-31
 * Last Modified Summary: Initial creation to eliminate as-any casts in timeline service
 */

// ==================== Fallback Query Row Types ====================

/** Row shape from profiles table (select subset for comment enrichment) */
export interface ProfileRow {
  id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
}

// ==================== Database Row Types for Mutations ====================

/** Row shape from user_projects table (select subset for project events) */
export interface ProjectRow {
  title: string;
  description: string | null;
  goal_amount?: number;
  currency?: string;
}

// ==================== Typed RPC Helper ====================

/**
 * Helper to call a Supabase RPC that isn't in the generated types.
 * Casts supabase.rpc once, returning a typed result.
 *
 * Usage:
 *   const { data, error } = await callRpc<T>(supabase, 'some_rpc', params);
 */
export async function callRpc<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: { rpc: any },
  fnName: string,
  params: Record<string, unknown>
): Promise<{ data: T | null; error: { message: string } | null }> {
  return client.rpc(fnName, params) as Promise<{
    data: T | null;
    error: { message: string } | null;
  }>;
}
