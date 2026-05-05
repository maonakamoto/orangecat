/**
 * Contextual Create Action Mapper
 *
 * Maps current pathname to appropriate entity creation action.
 * Uses ENTITY_REGISTRY as single source of truth.
 *
 * Used by MobileBottomNav to determine what the "+" button should create
 * based on the user's current location in the app.
 */

import { ENTITY_REGISTRY, EntityType } from '@/config/entity-registry';

type CreateActionType = 'post' | 'entity' | 'menu';

export interface ContextualCreateAction {
  /** Type of create action */
  type: CreateActionType;
  /** Entity type if type is 'entity' */
  entityType?: EntityType;
  /** URL to navigate to */
  href: string;
  /** Label for the action */
  label: string;
  /** Whether to open post composer (for 'post' type) */
  openComposer?: boolean;
}

/**
 * Route prefix to entity type mapping
 * Maps dashboard routes to their corresponding entity types
 * Built dynamically from ENTITY_REGISTRY for maintainability
 */
function buildRouteToEntityMap(): Map<string, EntityType> {
  const routeMap = new Map<string, EntityType>();

  // Build from entity registry (SSOT)
  for (const [entityType, metadata] of Object.entries(ENTITY_REGISTRY)) {
    routeMap.set(metadata.basePath, entityType as EntityType);
  }

  return routeMap;
}

const ROUTE_TO_ENTITY = buildRouteToEntityMap();

/**
 * Get contextual create action based on current pathname
 *
 * @param pathname - Current route pathname
 * @returns ContextualCreateAction with type, href, and label
 */
export function getContextualCreateAction(pathname: string): ContextualCreateAction {
  // Timeline/Dashboard home - create a post
  if (pathname === '/timeline' || pathname === '/dashboard') {
    return {
      type: 'post',
      href: '/timeline?compose=true',
      label: 'Post',
      openComposer: true,
    };
  }

  // Check if we're on an entity management page
  // Sort by path length (descending) to match most specific routes first
  const sortedRoutes = Array.from(ROUTE_TO_ENTITY.entries()).sort(
    (a, b) => b[0].length - a[0].length
  );

  for (const [route, entityType] of sortedRoutes) {
    if (pathname.startsWith(route)) {
      const metadata = ENTITY_REGISTRY[entityType];
      return {
        type: 'entity',
        entityType,
        href: metadata.createPath,
        label: metadata.name,
      };
    }
  }

  // Messages page - create a post (natural continuation of communication)
  if (pathname.startsWith('/messages')) {
    return {
      type: 'post',
      href: '/timeline?compose=true',
      label: 'Post',
      openComposer: true,
    };
  }

  // Profile pages - show menu (user might want to create various things)
  if (pathname.startsWith('/profiles/') || pathname === '/dashboard/info') {
    return {
      type: 'menu',
      href: '/timeline?compose=true',
      label: 'Create',
    };
  }

  // Public routes (Discover, Community, Home) - show menu with all options
  if (
    pathname === '/discover' ||
    pathname === '/community' ||
    pathname === '/' ||
    pathname.startsWith('/browse')
  ) {
    return {
      type: 'menu',
      href: '/timeline?compose=true',
      label: 'Create',
    };
  }

  // Default: show menu (safest option for unknown routes)
  return {
    type: 'menu',
    href: '/timeline?compose=true',
    label: 'Create',
  };
}
