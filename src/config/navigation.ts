/**
 * Unified Navigation Configuration
 *
 * Single source of truth for all navigation items across the application
 * Combines header, sidebar, footer, and mobile navigation
 *
 * Entity-based navigation is generated from entity registry (single source of truth).
 * Manual sections for non-entity navigation (Home, Explore, Learn).
 *
 * Progressive disclosure: Only most-used sections expanded by default to reduce clutter.
 *
 * Created: 2025-01-07
 * Last Modified: 2025-01-30
 * Last Modified Summary: Integrated navigation generator from entity registry, applied progressive disclosure
 */

import { ComponentType, SVGProps } from 'react';
import { generateEntityNavigation } from './navigation-generator';
import { ROUTES } from './routes';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import {
  Home,
  Users,
  Settings,
  User as UserIcon,
  MessageSquare,
  BookOpen,
  Globe,
  Info,
  HelpCircle,
  Search,
  Cat,
  ClipboardList,
  BarChart3,
} from 'lucide-react';

/**
 * Counter source identifier for nav items showing a live numeric badge.
 * Mirrors the same union in src/hooks/useNavigation.ts NavItem.counter
 * — kept duplicate-named because NavigationItem (this file) is used by
 * the public/header nav and NavItem (useNavigation) by the sidebar; both
 * agreed surfaces should accept the same set of sources.
 */
export type NavCounterSource = 'messages';

export interface NavigationItem {
  name: string;
  href?: string;
  requiresAuth?: boolean;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  description?: string;
  children?: NavigationItem[]; // For dropdown menus
  external?: boolean; // For external links that open in new tab
  comingSoon?: boolean; // For features not yet available
  counter?: NavCounterSource; // Optional live counter source for badges
}

export interface NavSection {
  id: string;
  title: string;
  priority: number;
  defaultExpanded?: boolean;
  collapsible?: boolean; // Whether section can be collapsed/expanded
  requiresAuth?: boolean;
  items: NavigationItem[];
}

interface NavItem {
  name: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  description?: string;
  requiresAuth?: boolean;
}

/**
 * Header navigation configuration
 *
 * SSOT for all header navigation items.
 * Organized by authentication state.
 */
const headerNavigationConfig = {
  /** Navigation for authenticated users */
  authenticated: [
    { name: 'Home', href: ROUTES.FEED },
    { name: 'Dashboard', href: ROUTES.DASHBOARD.HOME },
    { name: 'Discover', href: ROUTES.DISCOVER },
    { name: 'Collaborate', href: ROUTES.COLLABORATE },
    { name: 'Community', href: ROUTES.COMMUNITY },
  ],

  /** Navigation for unauthenticated users */
  unauthenticated: [
    { name: 'Discover', href: ROUTES.DISCOVER },
    { name: 'Community', href: ROUTES.COMMUNITY },
    { name: 'About', href: ROUTES.ABOUT },
  ],
};

/**
 * Get navigation items based on authentication state for header
 *
 * @param user - Supabase User object or null
 * @returns Array of navigation items appropriate for the auth state
 */
export function getHeaderNavigationItems(user: SupabaseUser | null): NavigationItem[] {
  return user
    ? [...headerNavigationConfig.authenticated]
    : [...headerNavigationConfig.unauthenticated];
}

/**
 * Sidebar navigation sections for authenticated users
 *
 * SIMPLIFIED X/Twitter-style navigation:
 * - 4-5 main sections only
 * - Progressive disclosure via single "Create" button
 * - Less cognitive load, faster navigation
 *
 * Structure:
 * 1. Main (Home, Timeline, Messages, Explore) - flat, no nesting
 * 2. Create (single section for all creation - collapsed by default)
 * 3. More (Settings, Profile, Help) - collapsed by default
 */

// Generate entity-based navigation as semantic groups instead of one long list.
const entitySections = generateEntityNavigation().map(section =>
  section.id === 'coordinate'
    ? {
        ...section,
        items: [
          ...section.items,
          {
            name: 'People',
            href: ROUTES.DASHBOARD.PEOPLE,
            icon: Users,
            description: 'Find connections',
            requiresAuth: true,
          },
        ],
      }
    : section
);

// Simplified main navigation - X/Twitter style
const simplifiedSections: NavSection[] = [
  {
    id: 'main',
    title: '', // No title - these are primary nav items
    priority: 1,
    defaultExpanded: true,
    collapsible: false, // Primary nav is always visible
    requiresAuth: false,
    items: [
      {
        name: 'Cat',
        href: ROUTES.DASHBOARD.CAT,
        icon: Cat,
        description: 'Your AI agent',
        requiresAuth: true,
      },
      {
        name: 'Home',
        href: ROUTES.DASHBOARD.HOME,
        icon: Home,
        description: 'Your dashboard',
        requiresAuth: true,
      },
      {
        name: 'Timeline',
        href: ROUTES.TIMELINE,
        icon: BookOpen,
        description: 'Your feed',
        requiresAuth: true,
      },
      {
        name: 'Messages',
        href: ROUTES.MESSAGES,
        icon: MessageSquare,
        description: 'Private messages',
        requiresAuth: true,
        counter: 'messages',
      },
      {
        name: 'Explore',
        href: ROUTES.DISCOVER,
        icon: Search,
        description: 'Discover',
        requiresAuth: false,
      },
    ],
  },
  ...entitySections,
  {
    id: 'operations',
    title: 'Work',
    priority: 6,
    defaultExpanded: false, // Collapsed by default
    collapsible: true,
    requiresAuth: true,
    items: [
      {
        name: 'Tasks',
        href: ROUTES.DASHBOARD.TASKS,
        icon: ClipboardList,
        description: 'Manage team tasks',
        requiresAuth: true,
      },
      {
        name: 'Analytics',
        href: ROUTES.DASHBOARD.TASKS_ANALYTICS,
        icon: BarChart3,
        description: 'Task analytics',
        requiresAuth: true,
      },
    ],
  },
  {
    id: 'more',
    title: 'More',
    priority: 7,
    defaultExpanded: false, // Collapsed by default
    collapsible: true,
    requiresAuth: false,
    items: [
      {
        name: 'Profile',
        href: ROUTES.PROFILES.ME,
        icon: UserIcon,
        description: 'Your profile',
        requiresAuth: true,
      },
      {
        name: 'Settings',
        href: ROUTES.SETTINGS,
        icon: Settings,
        description: 'Preferences',
        requiresAuth: true,
      },
      {
        name: 'Community',
        href: ROUTES.COMMUNITY,
        icon: Globe,
        description: 'Public feed',
        requiresAuth: false,
      },
      {
        name: 'About',
        href: ROUTES.ABOUT,
        icon: Info,
        description: 'About OrangeCat',
        requiresAuth: false,
      },
      {
        name: 'Help',
        href: ROUTES.FAQ,
        icon: HelpCircle,
        description: 'FAQ & Support',
        requiresAuth: false,
      },
    ],
  },
];

// Export simplified sections
export const sidebarSections: NavSection[] = simplifiedSections;

/**
 * Bottom navigation items for account management
 *
 * These appear at the bottom of the sidebar
 * Note: Profile and Settings are already in the "More" section above,
 * so this array is kept empty to avoid duplicate navigation items.
 */
export const bottomNavItems: NavItem[] = [];

/**
 * Footer navigation configuration
 */
export const footerNavigation = {
  product: [
    { name: 'Documentation', href: ROUTES.DOCS },
    { name: 'How It Works', href: ROUTES.HOW_IT_WORKS },
    { name: 'Status', href: ROUTES.STATUS },
  ],
  company: [
    { name: 'About OrangeCat', href: ROUTES.ABOUT },
    { name: 'Careers', href: '/company/careers' },
    { name: 'Blog', href: ROUTES.BLOG },
    { name: 'FAQ', href: ROUTES.FAQ },
  ],
  legal: [
    { name: 'Privacy', href: ROUTES.PRIVACY },
    { name: 'Terms', href: ROUTES.TERMS },
    { name: 'Security', href: ROUTES.SECURITY },
  ],
  social: [
    {
      name: 'Twitter',
      href: 'https://twitter.com/orangecat',
      icon: Globe,
    },
    {
      name: 'GitHub',
      href: 'https://github.com/g-but/orangecat',
      icon: Globe,
    },
  ],
  // Compact bottom-bar links (rendered next to the copyright line in
  // <Footer>). Kept in config so adding/removing one is a config-only
  // change. External URLs are marked with `external: true`.
  bottomBar: [
    { name: 'Documentation', href: ROUTES.DOCS },
    { name: 'Source Code', href: 'https://github.com/g-but/orangecat', external: true },
    { name: 'Technology', href: ROUTES.TECHNOLOGY },
    { name: 'FAQ', href: ROUTES.FAQ },
  ] as { name: string; href: string; external?: boolean }[],
};

/**
 * Authentication navigation items
 */
export const authNavigationItems = [
  { name: 'Sign In', href: `${ROUTES.AUTH}?mode=login` },
  { name: 'Get Started', href: `${ROUTES.AUTH}?mode=register` },
];

/**
 * Navigation labels for accessibility and internationalization
 */
export const navigationLabels = {
  MAIN_NAVIGATION: 'Main navigation',
  SECTION_TOGGLE: 'Toggle section',
  COMING_SOON: 'Coming soon',
  SIDEBAR_EXPAND: 'Expand sidebar',
  SIDEBAR_COLLAPSE: 'Collapse sidebar',
} as const;
