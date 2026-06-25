/**
 * Cat Credits API
 *
 * GET /api/cat/credits - Your sats credit balance + ledger history
 *
 * Read-only. Balance is derived from the cat_credit_entries ledger (SSOT).
 * Top-up (Lightning) and usage metering post entries server-side via
 * cat_credit_append; see docs/architecture/CAT_CREDITS.md.
 */

import { getCreditBalance, listCreditEntries } from '@/services/cat/credits';
import { apiSuccess, handleApiError } from '@/lib/api/standardResponse';
import { withAuth, type AuthenticatedRequest } from '@/lib/api/withAuth';

export const GET = withAuth(async (request: AuthenticatedRequest) => {
  const { user, supabase } = request;
  try {
    const [balanceSats, entries] = await Promise.all([
      getCreditBalance(supabase, user.id),
      listCreditEntries(supabase, user.id),
    ]);
    return apiSuccess({ balanceSats, entries });
  } catch (error) {
    return handleApiError(error);
  }
});
