/**
 * Untyped Supabase access helpers — the ONE escape hatch for dynamic names.
 *
 * WHY: Supabase's TypeScript client types `from()` / `rpc()` against the
 * generated schema. When the table or function name comes from a runtime value
 * (DATABASE_TABLES.*, getTableName(entityType), a computed RPC name), TS can't
 * narrow the return type, so call sites historically cast `(sb.from(x) as any)`.
 * Rather than scatter that `any` — and its eslint-disable — across the codebase,
 * every dynamic-name access routes through here, so the escape hatch lives in
 * exactly one audited place (SSOT/DRY). Behaviour is identical to the raw call.
 */

import type { AnySupabaseClient } from '@/lib/supabase/types';

/**
 * Call `supabase.from(table)` with a dynamic table name.
 * Returns an untyped query builder so callers don't need individual `as any` casts.
 */

export function fromTable(sb: AnySupabaseClient, table: string): any {
  return sb.from(table);
}

/**
 * Call `supabase.rpc(fn, params, options)` with a dynamic function name.
 * `options` forwards PostgREST modifiers like `{ count: 'exact', head: true }`.
 * Returns an untyped result so callers don't need individual `as any` casts.
 */
export function callRpc(
  sb: AnySupabaseClient,
  fn: string,
  params?: Record<string, unknown>,
  options?: Record<string, unknown>
): any {
  return sb.rpc(fn as never, params as never, options as never);
}
