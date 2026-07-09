'use client';

import Link from 'next/link';
import { User, Target, Building2, Users, Sparkles } from 'lucide-react';
import { PROFILE_CATEGORIES } from '@/types/profile';
import { ROUTES } from '@/config/routes';

/** Map profile types to Lucide icons (avoids emojis in UI) */
const PROFILE_TYPE_ICONS = {
  individual: User,
  project: Target,
  organization: Building2,
  collective: Users,
} as const;

// Usernames are stored lowercase; display names from `profile.name` may already
// be properly cased. Capitalize the first character so the greeting reads
// "Welcome back, Mao" rather than "Welcome back, mao".
function capitalizeName(name: string): string {
  if (!name) {
    return name;
  }
  return name.charAt(0).toUpperCase() + name.slice(1);
}

// Anonymous Supabase signups land in profiles with name='User' and
// username='user_<8chars>' (the handle_new_user trigger's last-resort
// fallback when there's no email and no OAuth metadata). Treating those
// as a real name produces "Welcome back, User" — impersonal and a tell
// that the platform doesn't actually know who you are. Detect the
// placeholder pattern and skip the comma+name instead.
function isPlaceholderName(name?: string | null, username?: string | null): boolean {
  if (name === 'User') {
    return true;
  }
  if (username && /^user_[0-9a-f]{8}$/.test(username)) {
    return true;
  }
  return false;
}

interface DashboardHeaderProps {
  profile: {
    name?: string | null;
    username?: string | null;
    profile_type?: string;
  } | null;
  totalProjects: number;
  totalDrafts: number;
}

/**
 * DashboardHeader - Welcome header with user greeting
 * Extracted from dashboard page for modularity
 */
export function DashboardHeader({ profile, totalProjects, totalDrafts }: DashboardHeaderProps) {
  const profileCategory =
    profile?.profile_type && profile.profile_type in PROFILE_CATEGORIES
      ? PROFILE_CATEGORIES[profile.profile_type as keyof typeof PROFILE_CATEGORIES]
      : PROFILE_CATEGORIES.individual;

  return (
    <div className="oc-surface oc-surface-padding">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <div className="oc-accent-tile flex-shrink-0">
            <User className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="mb-0 text-xl font-semibold leading-tight text-fg-primary sm:text-2xl">
              Welcome back
              {profile &&
              (profile.name || profile.username) &&
              !isPlaceholderName(profile.name, profile.username) ? (
                <>, {capitalizeName(profile.name || profile.username || '')}</>
              ) : null}
            </h1>
            <p className="text-sm text-fg-secondary mt-1">
              {totalProjects > 0
                ? `${totalProjects} project${totalProjects !== 1 ? 's' : ''}${totalDrafts > 0 ? ` • ${totalDrafts} draft${totalDrafts !== 1 ? 's' : ''}` : ''}`
                : "Let's get started"}
            </p>
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:shrink-0">
          {totalProjects === 0 && (
            // Cat-first: instead of hardcoding project creation as the
            // canonical first step, route to Cat. Always visible on mobile
            // — header used to have no action affordance on <sm because of
            // a `hidden sm:flex` that wasted the founder's primary viewport.
            <Link href={ROUTES.DASHBOARD.CAT}>
              <div className="flex min-h-10 w-full items-center justify-center gap-1.5 rounded-md bg-fg-primary px-3 py-1.5 text-sm font-medium text-fg-inverted transition-colors hover:bg-muted-strong sm:w-auto">
                <Sparkles className="h-4 w-4" />
                Ask Cat
              </div>
            </Link>
          )}
          {profileCategory && (
            <div className="hidden md:flex items-center gap-1.5 rounded-md border border-subtle px-3 py-1.5 text-sm font-medium text-fg-secondary">
              {(() => {
                const profileType = (profile?.profile_type ||
                  'individual') as keyof typeof PROFILE_TYPE_ICONS;
                const Icon = PROFILE_TYPE_ICONS[profileType] || User;
                return <Icon className="h-4 w-4" />;
              })()}
              {profileCategory.label}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardHeader;
