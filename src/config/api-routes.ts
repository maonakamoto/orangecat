/**
 * API_ROUTES — SSOT for all internal API endpoint paths.
 * Mirrors the ROUTES pattern from src/config/routes.ts (which covers frontend paths).
 * Use these constants in fetch() calls instead of hardcoded strings.
 */
import { ENTITY_REGISTRY } from '@/config/entity-registry';

export const API_ROUTES = {
  CAT: {
    CHAT: '/api/cat/chat',
    SUGGESTIONS: '/api/cat/suggestions',
    HISTORY: '/api/cat/history',
    CONTEXT: '/api/cat/context',
    PERMISSIONS: '/api/cat/permissions',
    ACTIONS: '/api/cat/actions',
    QUOTA: '/api/cat/quota',
  },
  MESSAGES: {
    BASE: '/api/messages',
    CONVERSATION: (id: string) => `/api/messages/${id}`,
    CONVERSATION_READ: (id: string) => `/api/messages/${id}/read`,
    CONVERSATION_SUMMARY: (id: string) => `/api/messages/${id}/summary`,
    EDIT: (id: string) => `/api/messages/edit/${encodeURIComponent(id)}`,
    OPEN: '/api/messages/open',
    SELF: '/api/messages/self',
    ACTORS: '/api/messages/actors',
    BULK_CONVERSATIONS: '/api/messages/bulk-conversations',
    BULK_DELETE: '/api/messages/bulk-delete',
    UNREAD_COUNT: '/api/messages/unread-count',
  },
  WALLETS: {
    BASE: ENTITY_REGISTRY['wallet'].apiEndpoint,
    TRANSFER: '/api/wallets/transfer',
  },
  ENTITY_WALLETS: '/api/entity-wallets',
  NOTIFICATIONS: {
    BASE: '/api/notifications',
    UNREAD: '/api/notifications/unread',
    READ: '/api/notifications/read',
    CLEAR_READ: '/api/notifications?clear=read',
    PREFERENCES: '/api/notifications/preferences',
  },
  PROFILES: {
    BASE: '/api/profiles',
    BY_ID: (id: string) => `/api/profiles/${id}`,
    PROJECTS: (id: string) => `/api/profiles/${id}/projects`,
    ENTITIES: (id: string, entityType: string) => `/api/profiles/${id}/entities/${entityType}`,
    WISHLIST_TIERS: (id: string) => `/api/profiles/${id}/wishlist-tiers`,
  },
  RESEARCH: ENTITY_REGISTRY['research'].apiEndpoint,
  SOCIAL: {
    FOLLOW: '/api/social/follow',
    UNFOLLOW: '/api/social/unfollow',
    FOLLOWING: (id: string) => `/api/social/following/${id}`,
    FOLLOWERS: (id: string) => `/api/social/followers/${id}`,
  },
  TASKS: {
    BASE: '/api/tasks',
    BY_ID: (id: string) => `/api/tasks/${id}`,
    COMPLETE: (id: string) => `/api/tasks/${id}/complete`,
    ATTENTION: (id: string) => `/api/tasks/${id}/attention`,
    REQUEST: (id: string) => `/api/tasks/${id}/request`,
    ANALYTICS: '/api/task-analytics',
  },
  AI: {
    FORM_PREFILL: '/api/ai/form-prefill',
    PLATFORM_USAGE: '/api/ai/platform-usage',
  },
  AUTH: {
    CALLBACK: '/api/auth/callback',
    SYNC: '/api/auth/sync',
    VERIFY_CAPTCHA: '/api/auth/verify-captcha',
  },
  DOCUMENTS: {
    BASE: ENTITY_REGISTRY['document'].apiEndpoint,
    BY_ID: (id: string) => `${ENTITY_REGISTRY['document'].apiEndpoint}/${id}`,
    EXTRACT: `${ENTITY_REGISTRY['document'].apiEndpoint}/extract`,
  },
  WISHLISTS: {
    BASE: ENTITY_REGISTRY['wishlist'].apiEndpoint,
    PROOFS: `${ENTITY_REGISTRY['wishlist'].apiEndpoint}/proofs`,
    FEEDBACK: `${ENTITY_REGISTRY['wishlist'].apiEndpoint}/feedback`,
    ITEM_PROOFS: (itemId: string) =>
      `${ENTITY_REGISTRY['wishlist'].apiEndpoint}/items/${itemId}/proofs`,
  },
  ENTITIES: {
    STATUS: (entityType: string, id: string) => `/api/entities/${entityType}/${id}/status`,
  },
  USER: {
    API_KEYS: '/api/user/api-keys',
    API_KEYS_VALIDATE: '/api/user/api-keys/validate',
    STATS: '/api/users/me/stats',
  },
  PAYMENTS: {
    BASE: '/api/payments',
    SEND: '/api/payments/send',
  },
  PROJECTS: {
    BASE: ENTITY_REGISTRY['project'].apiEndpoint,
    BY_ID: (id: string) => `${ENTITY_REGISTRY['project'].apiEndpoint}/${id}`,
    STATUS: (id: string) => `${ENTITY_REGISTRY['project'].apiEndpoint}/${id}/status`,
    REFRESH_BALANCE: (id: string) =>
      `${ENTITY_REGISTRY['project'].apiEndpoint}/${id}/refresh-balance`,
    UPDATES: (id: string) => `${ENTITY_REGISTRY['project'].apiEndpoint}/${id}/updates`,
    FAVORITE: (id: string) => `${ENTITY_REGISTRY['project'].apiEndpoint}/${id}/favorite`,
    FAVORITES: `${ENTITY_REGISTRY['project'].apiEndpoint}/favorites`,
  },
  PROJECT_ROLES: {
    BASE: '/api/project-roles',
    BY_ID: (id: string) => `/api/project-roles/${id}`,
  },
  LOANS: {
    BASE: ENTITY_REGISTRY['loan'].apiEndpoint,
    COLLATERAL: '/api/loan-collateral',
  },
  PROFILE: '/api/profile',
  GROUPS: {
    BASE: ENTITY_REGISTRY['group'].apiEndpoint,
    EVENTS: (slug: string) => `${ENTITY_REGISTRY['group'].apiEndpoint}/${slug}/events`,
    PROPOSALS: (slug: string) => `${ENTITY_REGISTRY['group'].apiEndpoint}/${slug}/proposals`,
    PROPOSAL: (slug: string, id: string) =>
      `${ENTITY_REGISTRY['group'].apiEndpoint}/${slug}/proposals/${id}`,
    PROPOSAL_VOTES: (slug: string, id: string) =>
      `${ENTITY_REGISTRY['group'].apiEndpoint}/${slug}/proposals/${id}/votes`,
    PROPOSAL_VOTE: (slug: string, id: string) =>
      `${ENTITY_REGISTRY['group'].apiEndpoint}/${slug}/proposals/${id}/vote`,
    PROPOSAL_ACTIVATE: (slug: string, id: string) =>
      `${ENTITY_REGISTRY['group'].apiEndpoint}/${slug}/proposals/${id}/activate`,
    WALLETS: (slug: string) => `${ENTITY_REGISTRY['group'].apiEndpoint}/${slug}/wallets`,
    WALLET_REFRESH: (slug: string, walletId: string) =>
      `${ENTITY_REGISTRY['group'].apiEndpoint}/${slug}/wallets/${walletId}/refresh`,
    ACTIVITIES: (slug: string) => `${ENTITY_REGISTRY['group'].apiEndpoint}/${slug}/activities`,
  },
  JOBS: '/api/jobs',
  DELETE_USER: '/api/delete-user',
  WAITLIST: '/api/waitlist',
  AI_ASSISTANTS: {
    BASE: ENTITY_REGISTRY['ai_assistant'].apiEndpoint,
    BY_ID: (id: string) => `${ENTITY_REGISTRY['ai_assistant'].apiEndpoint}/${id}`,
    CONVERSATIONS: (id: string) =>
      `${ENTITY_REGISTRY['ai_assistant'].apiEndpoint}/${id}/conversations`,
    CONVERSATION: (assistantId: string, conversationId: string) =>
      `${ENTITY_REGISTRY['ai_assistant'].apiEndpoint}/${assistantId}/conversations/${conversationId}`,
    CONVERSATION_MESSAGES: (assistantId: string, conversationId: string) =>
      `${ENTITY_REGISTRY['ai_assistant'].apiEndpoint}/${assistantId}/conversations/${conversationId}/messages`,
  },
  TRANSACTIONS: '/api/transactions',
  BOOKINGS: {
    BASE: '/api/bookings',
    BY_ID: (id: string) => `/api/bookings/${id}`,
  },
  PRESENCE: {
    OFFLINE: '/api/presence/offline',
  },
} as const;
