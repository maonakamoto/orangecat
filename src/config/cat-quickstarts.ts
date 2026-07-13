/**
 * CAT QUICK-STARTS — SSOT for the opening suggestion chips in My Cat chat.
 *
 * The chips a user sees before their first message are the Cat's pitch: they
 * must point at the next economically useful step, not generic filler. The
 * rules are deliberately cheap — they read only data the suggestions API
 * already loads (entity count, wallets), no extra queries, no LLM call.
 *
 * Context rules (evaluated in order):
 *
 * 1. `noEntities` — user has nothing listed yet (0 entities).
 *    Goal: get them into the core loop — one tap → the Cat prefills a real,
 *    publishable economic object. Each chip is a direct create-intent that the
 *    tool pipeline routes to `prefill_entity_form` (product / project / cause).
 *    Also the fallback for anonymous visitors and fetch errors
 *    (DEFAULT_SUGGESTIONS in src/services/ai/suggestions.ts).
 *
 * 2. `entitiesNoWallet` — has at least one entity but no wallet row.
 *    Goal: unblock getting paid. Everything they list is unmonetizable until
 *    a wallet exists, so the wallet chip leads.
 *
 * 3. `established` — has entities AND at least one wallet.
 *    Goal: grow. Lean on the offer engine ("What can I offer next?") and
 *    demand matching.
 *
 * Personalisation (named-entity chips, document/task nudges) is layered on
 * top by generateSuggestionsFromContext — this file only owns the tier chips.
 */

export interface QuickstartContext {
  /** Total entities the user owns (any type). */
  entityCount: number;
  /** True when the user has at least one wallet row (any kind — a way to get paid). */
  hasWallet: boolean;
}

export const CAT_QUICKSTARTS = {
  noEntities: [
    'Sell something I make',
    'Start a fundraiser for a project',
    'Raise money for a cause',
  ],
  entitiesNoWallet: [
    'Connect a wallet so you can get paid',
    'What can I offer next?',
    'Find people who need what I offer',
  ],
  established: [
    'What can I offer next?',
    'Find people who need what I offer',
    "How can I grow what I've already listed?",
  ],
} as const;

/** Pick the quick-start tier for a user's economic state. */
export function selectQuickstarts(ctx: QuickstartContext): readonly string[] {
  if (ctx.entityCount === 0) {
    return CAT_QUICKSTARTS.noEntities;
  }
  if (!ctx.hasWallet) {
    return CAT_QUICKSTARTS.entitiesNoWallet;
  }
  return CAT_QUICKSTARTS.established;
}
