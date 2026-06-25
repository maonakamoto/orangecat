/**
 * Cat Credits Service
 *
 * Bitcoin-paid access to frontier models. Users top up a sats balance over
 * Lightning; frontier inference is metered against it. See
 * docs/architecture/CAT_CREDITS.md.
 *
 * The cat_credit_entries ledger is the single source of truth — balance is
 * derived from it, never stored separately. Reads are RLS-scoped to the owner;
 * writes go through the atomic, server-only cat_credit_append RPC (which
 * serializes per user and refuses to overdraw).
 *
 * Phase 1: balance read + history + the write primitive. Top-up (Lightning) and
 * usage metering are wired in later phases on top of appendCreditEntry.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { AnySupabaseClient } from '@/lib/supabase/types';
import { DATABASE_TABLES } from '@/config/database-tables';
import { logger } from '@/utils/logger';

export type CreditEntryKind = 'topup' | 'usage' | 'grant' | 'refund' | 'adjustment';

export interface CreditEntry {
  id: string;
  kind: CreditEntryKind;
  amount_sats: number;
  balance_after: number;
  ref: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

/** Max ledger rows returned for the history view. */
const HISTORY_LIMIT = 100;

/**
 * Current credit balance in sats (0 on any failure — missing table, RLS, etc.).
 * Never throws; callers treat unavailable as "no credits".
 */
export async function getCreditBalance(
  supabase: AnySupabaseClient,
  userId: string
): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('cat_credit_balance', { p_user_id: userId });
    if (error) {
      logger.warn('cat_credit_balance RPC failed', { error }, 'CatCredits');
      return 0;
    }
    return typeof data === 'number' ? data : Number(data ?? 0);
  } catch (err) {
    logger.warn('getCreditBalance threw', { err }, 'CatCredits');
    return 0;
  }
}

/** A user's ledger history, newest first (RLS guarantees they see only theirs). */
export async function listCreditEntries(
  supabase: AnySupabaseClient,
  userId: string
): Promise<CreditEntry[]> {
  try {
    const { data, error } = await supabase
      .from(DATABASE_TABLES.CAT_CREDIT_ENTRIES)
      .select('id, kind, amount_sats, balance_after, ref, metadata, created_at')
      .eq('user_id', userId)
      .order('seq', { ascending: false })
      .limit(HISTORY_LIMIT);
    if (error) {
      logger.warn('listCreditEntries failed', { error }, 'CatCredits');
      return [];
    }
    return (data ?? []) as CreditEntry[];
  } catch (err) {
    logger.warn('listCreditEntries threw', { err }, 'CatCredits');
    return [];
  }
}

/**
 * Append a ledger entry atomically and return the new balance. Wraps the
 * SECURITY DEFINER cat_credit_append RPC, which serializes per user and rejects
 * an overdraw with 'insufficient_credits'.
 *
 * MUST be called with a service-role client — the RPC is revoked from
 * anon/authenticated so a normal user client cannot post entries. Used by the
 * top-up (Lightning settlement) and usage-metering paths.
 *
 * @returns the new balance in sats, or null on failure (incl. insufficient credits).
 */
export async function appendCreditEntry(
  serviceSupabase: AnySupabaseClient,
  userId: string,
  entry: {
    kind: CreditEntryKind;
    amountSats: number;
    ref?: string | null;
    metadata?: Record<string, unknown> | null;
  }
): Promise<number | null> {
  try {
    const { data, error } = await serviceSupabase.rpc('cat_credit_append', {
      p_user_id: userId,
      p_kind: entry.kind,
      p_amount_sats: entry.amountSats,
      p_ref: entry.ref ?? null,
      p_metadata: entry.metadata ?? null,
    });
    if (error) {
      // 23514 check_violation = insufficient_credits (expected, not exceptional).
      logger.warn('cat_credit_append failed', { error, kind: entry.kind }, 'CatCredits');
      return null;
    }
    return typeof data === 'number' ? data : Number(data ?? 0);
  } catch (err) {
    logger.warn('appendCreditEntry threw', { err }, 'CatCredits');
    return null;
  }
}
