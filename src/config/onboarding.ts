/**
 * ONBOARDING CONFIGURATION
 * Single Source of Truth for onboarding UI content and options.
 *
 * Labels, options, and color mappings live here so they can be
 * changed in one place without touching component code.
 */

import { Compass, MessageCircle, Users } from 'lucide-react';
import { ROUTES } from '@/config/routes';

// ---------------------------------------------------------------------------
// CreateProjectStep — which entity categories to surface during onboarding
// ---------------------------------------------------------------------------

export const ONBOARDING_CATEGORIES = ['business', 'community', 'finance'] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  business: 'Commerce',
  community: 'Community',
  finance: 'Finance',
};

// ---------------------------------------------------------------------------
// ExploreStep — discovery options shown in Step 3
// ---------------------------------------------------------------------------

export const EXPLORE_OPTIONS = [
  {
    icon: Compass,
    title: 'Discover Projects',
    description: 'Browse what others are building and find inspiration',
    href: ROUTES.DISCOVER,
    bg: 'bg-orange-50',
    text: 'text-orange-600',
    border: 'hover:border-orange-300',
  },
  {
    icon: MessageCircle,
    title: 'My Cat',
    description: 'Your AI economic agent — ask it anything about OrangeCat',
    href: ROUTES.DASHBOARD.CAT,
    bg: 'bg-tiffany-50',
    text: 'text-tiffany-600',
    border: 'hover:border-tiffany-300',
  },
  {
    icon: Users,
    title: 'Community',
    description: 'Connect with creators and supporters',
    href: ROUTES.COMMUNITY,
    bg: 'bg-tiffany-50',
    text: 'text-tiffany-600',
    border: 'hover:border-tiffany-300',
  },
] as const;
