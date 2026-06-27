/**
 * Messaging server service — barrel.
 *
 * Public surface is split across cohesive modules for separation of concerns:
 *   - server/shared.ts    — auth helpers, DB type aliases, private helpers
 *   - server/queries.ts   — read queries
 *   - server/mutations.ts — write mutations
 *
 * Re-exported here so existing `@/features/messaging/service.server` imports keep working.
 */

export { getServerUser, ensureMessagingFunctions } from './server/shared';
export { fetchUserConversations, fetchConversationSummary, fetchMessages } from './server/queries';
export { sendMessage, markConversationRead, openConversation } from './server/mutations';
