/**
 * Unified Route Configuration
 *
 * Single source of truth for all route categorization and detection logic
 * Eliminates scattered route detection throughout the codebase
 *
 * Created: 2025-12-12
 * Last Modified: 2026-01-30
 * Last Modified Summary: Consolidated all route definitions from headerRoutes.ts and lib/routes.ts into this single source of truth
 */

import { ENTITY_REGISTRY } from '@/config/entity-registry';

/**
 * Route contexts categorize routes by their accessibility and purpose
 */
export const ROUTE_CONTEXTS = {
  /**
   * Routes only accessible to authenticated users
   */
  authenticated: [
    '/dashboard',
    '/profile',
    '/settings',
    '/organizations',
    '/messages',
    '/timeline',
    '/post',
    '/project',
    '/onboarding',
  ] as const,

  /**
   * Routes accessible to everyone, typically landing/marketing pages
   */
  public: [
    '/',
    '/discover',
    '/community',
    '/channel',
    '/browse',
    '/categories',
    '/stories',
    '/events',
    '/products',
    '/services',
    '/causes',
    '/loans',
    '/investments',
    '/groups',
    '/ai-assistants',
    '/wishlists',
    '/research',
    '/assets',
    '/technology',
    '/bitcoin-wallet-guide',
    '/study-bitcoin',
    '/how-it-works',
    '/donations',
    '/pages',
    '/wallets',
  ] as const,

  /**
   * Routes accessible to both authenticated and non-authenticated users
   * These are informational pages that don't require login
   */
  universal: ['/about', '/blog', '/docs', '/privacy', '/terms', '/faq', '/coming-soon'] as const,

  /**
   * Authentication-related routes
   */
  auth: [
    '/auth',
    '/auth/callback',
    '/auth/confirm',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/signout',
  ] as const,

  /**
   * Routes that show different content based on auth state
   * (e.g., profiles show different data for own vs others)
   */
  contextual: ['/profiles'] as const,
} as const;

/**
 * Type definitions for route contexts
 */
export type RouteContext = 'authenticated' | 'public' | 'universal' | 'auth' | 'contextual';

/**
 * Routes that should hide the footer (typically authenticated routes)
 */
const FOOTER_HIDDEN_ROUTES = [...ROUTE_CONTEXTS.authenticated] as const;

/**
 * Routes that should show the sidebar (authenticated routes)
 */
const SIDEBAR_VISIBLE_ROUTES = [...ROUTE_CONTEXTS.authenticated] as const;

/**
 * Get the context of a route based on its pathname
 */
export function getRouteContext(pathname: string): RouteContext {
  // Check authenticated routes first (most specific)
  if (
    ROUTE_CONTEXTS.authenticated.some(
      route => pathname === route || pathname.startsWith(`${route}/`)
    )
  ) {
    return 'authenticated';
  }

  // Check auth routes
  if (ROUTE_CONTEXTS.auth.some(route => pathname === route || pathname.startsWith(`${route}/`))) {
    return 'auth';
  }

  // Check universal routes
  if (
    ROUTE_CONTEXTS.universal.some(route => pathname === route || pathname.startsWith(`${route}/`))
  ) {
    return 'universal';
  }

  // Check contextual routes
  if (
    ROUTE_CONTEXTS.contextual.some(route => pathname === route || pathname.startsWith(`${route}/`))
  ) {
    return 'contextual';
  }

  // Check public routes
  if (ROUTE_CONTEXTS.public.some(route => pathname === route || pathname.startsWith(`${route}/`))) {
    return 'public';
  }

  // Default to public for unknown routes
  return 'public';
}

/**
 * Check if a route requires authentication
 * Legacy function for backward compatibility
 */
export function isAuthenticatedRoute(pathname: string): boolean {
  const context = getRouteContext(pathname);
  return context === 'authenticated' || context === 'contextual';
}

/**
 * Check if a route should show the footer
 */
export function shouldShowFooter(pathname: string): boolean {
  return !FOOTER_HIDDEN_ROUTES.some(
    route => pathname === route || pathname.startsWith(`${route}/`)
  );
}

/**
 * Check if a route should show the sidebar
 */
export function shouldShowSidebar(pathname: string): boolean {
  return SIDEBAR_VISIBLE_ROUTES.some(
    route => pathname === route || pathname.startsWith(`${route}/`)
  );
}

/**
 * Check if a route is considered "public" (accessible without auth)
 */
export function isPublicRoute(pathname: string): boolean {
  const context = getRouteContext(pathname);
  return context === 'public' || context === 'universal' || context === 'auth';
}

/**
 * Route Constants
 *
 * Centralized route definitions for programmatic route generation.
 * Use these constants instead of hardcoded strings throughout the application.
 */
export const ROUTES = {
  // Public routes
  HOME: '/',
  AUTH: '/auth',
  DISCOVER: '/discover',
  STUDY_BITCOIN: '/study-bitcoin',
  ONBOARDING: {
    STANDARD: '/onboarding',
    INTELLIGENT: '/onboarding/intelligent',
  },
  COMMUNITY: '/community',
  ABOUT: '/about',
  BLOG: '/blog',
  DOCS: '/docs',
  FAQ: '/faq',
  PRIVACY: '/privacy',
  TERMS: '/terms',

  // Project routes
  PROJECTS: {
    LIST: ENTITY_REGISTRY['project'].publicBasePath,
    CREATE: ENTITY_REGISTRY['project'].createPath,
    VIEW: (id: string) => `${ENTITY_REGISTRY['project'].publicBasePath}/${id}`,
    EDIT: (id: string) => `${ENTITY_REGISTRY['project'].createPath}?edit=${id}`,
  },

  // Public entity routes
  PRODUCTS: {
    VIEW: (id: string) => `${ENTITY_REGISTRY['product'].publicBasePath}/${id}`,
  },
  SERVICES: {
    VIEW: (id: string) => `${ENTITY_REGISTRY['service'].publicBasePath}/${id}`,
  },
  CAUSES: {
    VIEW: (id: string) => `${ENTITY_REGISTRY['cause'].publicBasePath}/${id}`,
  },
  LOANS: {
    VIEW: (id: string) => `${ENTITY_REGISTRY['loan'].publicBasePath}/${id}`,
  },
  INVESTMENTS: {
    VIEW: (id: string) => `${ENTITY_REGISTRY['investment'].publicBasePath}/${id}`,
  },
  EVENTS: {
    VIEW: (id: string) => `${ENTITY_REGISTRY['event'].publicBasePath}/${id}`,
  },
  WISHLISTS: {
    VIEW: (id: string) => `${ENTITY_REGISTRY['wishlist'].publicBasePath}/${id}`,
  },
  RESEARCH: {
    VIEW: (id: string) => `${ENTITY_REGISTRY['research'].publicBasePath}/${id}`,
  },
  AI_ASSISTANTS: {
    VIEW: (id: string) => `${ENTITY_REGISTRY['ai_assistant'].publicBasePath}/${id}`,
  },
  ASSETS: {
    VIEW: (id: string) => `${ENTITY_REGISTRY['asset'].publicBasePath}/${id}`,
  },
  GROUPS: {
    VIEW: (slug: string) => `${ENTITY_REGISTRY['group'].publicBasePath}/${slug}`,
  },

  // Dashboard routes
  DASHBOARD: {
    HOME: '/dashboard',
    PROJECTS: ENTITY_REGISTRY['project'].basePath,
    PROJECTS_CREATE: ENTITY_REGISTRY['project'].createPath,
    ANALYTICS: '/dashboard/analytics',
    INFO: '/dashboard/info',
    INFO_EDIT: '/dashboard/info/edit',
    PEOPLE: '/dashboard/people',
    WALLETS: ENTITY_REGISTRY['wallet'].basePath,
    WALLETS_CREATE: ENTITY_REGISTRY['wallet'].createPath,
    GROUPS: ENTITY_REGISTRY['group'].basePath,
    GROUPS_CREATE: ENTITY_REGISTRY['group'].createPath,
    ASSETS: ENTITY_REGISTRY['asset'].basePath,
    ASSETS_CREATE: ENTITY_REGISTRY['asset'].createPath,
    LOANS: ENTITY_REGISTRY['loan'].basePath,
    LOANS_CREATE: ENTITY_REGISTRY['loan'].createPath,
    INVESTMENTS: ENTITY_REGISTRY['investment'].basePath,
    INVESTMENTS_CREATE: ENTITY_REGISTRY['investment'].createPath,
    ORGANIZATIONS: '/dashboard/organizations',
    EVENTS: ENTITY_REGISTRY['event'].basePath,
    EVENTS_CREATE: ENTITY_REGISTRY['event'].createPath,
    STORE: ENTITY_REGISTRY['product'].basePath,
    STORE_CREATE: ENTITY_REGISTRY['product'].createPath,
    SERVICES: ENTITY_REGISTRY['service'].basePath,
    SERVICES_CREATE: ENTITY_REGISTRY['service'].createPath,
    CAUSES: ENTITY_REGISTRY['cause'].basePath,
    CAUSES_CREATE: ENTITY_REGISTRY['cause'].createPath,
    AI_ASSISTANTS: ENTITY_REGISTRY['ai_assistant'].basePath,
    AI_ASSISTANTS_CREATE: ENTITY_REGISTRY['ai_assistant'].createPath,
    WISHLISTS: ENTITY_REGISTRY['wishlist'].basePath,
    TASKS: '/dashboard/tasks',
    TASKS_NEW: '/dashboard/tasks/new',
    TASKS_ANALYTICS: '/dashboard/tasks/analytics',
    RESEARCH: ENTITY_REGISTRY['research'].basePath,
    BOOKINGS: '/dashboard/bookings',
    CAT: '/dashboard/cat',
    CAT_PERMISSIONS: '/dashboard/cat',
    DOCUMENTS: ENTITY_REGISTRY['document'].basePath,
    DOCUMENTS_CREATE: ENTITY_REGISTRY['document'].createPath,
    SETTINGS: '/dashboard/settings',
  },

  // Profile routes (authenticated - own profile)
  PROFILE: {
    VIEW: (username: string) => `/profile/${username}`,
    SETTINGS: '/profile/settings',
    EDIT: '/dashboard/info',
  },

  // Public profile routes (shareable)
  PROFILES: {
    VIEW: (username: string) => `/profiles/${username}`,
    ME: '/profiles/me',
  },

  // Timeline routes
  TIMELINE: '/timeline',

  // Messages routes
  MESSAGES: '/messages',
  MESSAGE_CONVERSATION: (conversationId: string) => `/messages/${conversationId}`,

  // Settings routes
  SETTINGS: '/settings',
} as const;
