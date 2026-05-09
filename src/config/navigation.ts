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

export interface NavigationItem {
  name: string;
  href?: string;
  requiresAuth?: boolean;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  description?: string;
  children?: NavigationItem[]; // For dropdown menus
  external?: boolean; // For external links that open in new tab
  comingSoon?: boolean; // For features not yet available
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
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Discover', href: '/discover' },
    { name: 'Community', href: '/community' },
  ] as const,

  /** Navigation for unauthenticated users */
  unauthenticated: [
    { name: 'Discover', href: '/discover' },
    { name: 'Community', href: '/community' },
    { name: 'About', href: '/about' },
  ] as const,
} as const;

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

// Generate entity-based navigation for the Create section only
const entitySections = generateEntityNavigation();

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
        name: 'My Cat',
        href: ROUTES.DASHBOARD.CAT,
        icon: Cat,
        description: 'Your AI agent',
        requiresAuth: true,
      },
      {
        name: 'Home',
        href: '/dashboard',
        icon: Home,
        description: 'Your dashboard',
        requiresAuth: true,
      },
      {
        name: 'Timeline',
        href: '/timeline',
        icon: BookOpen,
        description: 'Your feed',
        requiresAuth: true,
      },
      {
        name: 'Messages',
        href: '/messages',
        icon: MessageSquare,
        description: 'Private messages',
        requiresAuth: true,
      },
      {
        name: 'Explore',
        href: '/discover',
        icon: Search,
        description: 'Discover',
        requiresAuth: false,
      },
    ],
  },
  {
    id: 'create',
    title: 'Create',
    priority: 2,
    defaultExpanded: false, // Collapsed - click to expand (progressive disclosure)
    collapsible: true,
    requiresAuth: true,
    items: [
      // Flatten all entity creation into one section
      ...entitySections.flatMap(section => section.items),
      // Add People to creation options
      {
        name: 'People',
        href: ROUTES.DASHBOARD.PEOPLE,
        icon: Users,
        description: 'Find connections',
        requiresAuth: true,
      },
    ],
  },
  {
    id: 'operations',
    title: 'Operations',
    priority: 3,
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
    priority: 4,
    defaultExpanded: false, // Collapsed by default
    collapsible: true,
    requiresAuth: false,
    items: [
      {
        name: 'Profile',
        href: '/profiles/me',
        icon: UserIcon,
        description: 'Your profile',
        requiresAuth: true,
      },
      {
        name: 'Settings',
        href: '/settings',
        icon: Settings,
        description: 'Preferences',
        requiresAuth: true,
      },
      {
        name: 'Community',
        href: '/community',
        icon: Globe,
        description: 'Public feed',
        requiresAuth: false,
      },
      {
        name: 'About',
        href: '/about',
        icon: Info,
        description: 'About OrangeCat',
        requiresAuth: false,
      },
      {
        name: 'Help',
        href: '/faq',
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
    { name: 'Features', href: '/docs' },
    { name: 'Documentation', href: '/docs' },
    { name: 'How It Works', href: '/how-it-works' },
    { name: 'Status', href: '/status' },
  ],
  company: [
    { name: 'About OrangeCat', href: '/about' },
    { name: 'Careers', href: '/company/careers' },
    { name: 'Blog', href: '/blog' },
    { name: 'FAQ', href: '/faq' },
  ],
  legal: [
    { name: 'Privacy', href: '/privacy' },
    { name: 'Terms', href: '/terms' },
    { name: 'Security', href: '/security' },
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
};

/**
 * Authentication navigation items
 */
export const authNavigationItems = [
  { name: 'Sign In', href: '/auth?mode=login' },
  { name: 'Get Started', href: '/auth?mode=register' },
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
