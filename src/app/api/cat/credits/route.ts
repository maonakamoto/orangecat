/**
 * Cat Credits API
 *
 * GET /api/cat/credits - Your Cat Credit balance (BTC) + ledger history
 *
 * Read-only. Balance is derived from the cat_credit_entries ledger (SSOT).
 * Top-up (Lightning) and usage metering post entries server-side via
 * cat_credit_append; see docs/architecture/CAT_CREDITS.md.
 */

import { getCreditBalance, listCreditEntries } from '@/services/cat/credits';
import { platformReceiveEnabled } from '@/lib/bitcoin/platform-wallet';
import { apiSuccess, handleApiError } from '@/lib/api/standardResponse';
import { withAuth, type AuthenticatedRequest } from '@/lib/api/withAuth';

export const GET = withAuth(async (request: AuthenticatedRequest) => {
  const { user, supabase } = request;
  try {
    const [balanceBtc, entries] = await Promise.all([
      getCreditBalance(supabase, user.id),
      listCreditEntries(supabase, user.id),
    ]);
    // topupEnabled tells the UI whether to offer Lightning top-up (only when a
    // platform receiving wallet is configured — otherwise the button stays off).
    return apiSuccess({ balanceBtc, entries, topupEnabled: platformReceiveEnabled() });
  } catch (error) {
    return handleApiError(error);
  }
});
