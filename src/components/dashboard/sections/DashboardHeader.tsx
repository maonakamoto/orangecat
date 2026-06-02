'use client';

import Link from 'next/link';
import { User, Target, Building2, Users, Plus } from 'lucide-react';
import { PROFILE_CATEGORIES } from '@/types/profile';
import { ENTITY_REGISTRY } from '@/config/entity-registry';

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
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="oc-accent-tile">
            <User className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="mb-0 text-xl font-semibold leading-tight text-foreground sm:text-2xl">
              {profile === null ? (
                <>
                  Welcome back
                  <span className="inline-block h-5 w-28 animate-pulse rounded bg-muted align-text-bottom" />
                </>
              ) : (
                <>Welcome back, {capitalizeName(profile.name || profile.username || 'there')}</>
              )}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {totalProjects > 0
                ? `${totalProjects} project${totalProjects !== 1 ? 's' : ''}${totalDrafts > 0 ? ` • ${totalDrafts} draft${totalDrafts !== 1 ? 's' : ''}` : ''}`
                : "Let's get started"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {totalProjects === 0 && (
            <Link href={ENTITY_REGISTRY.project.createPath}>
              <div className="hidden sm:flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background transition-colors hover:bg-muted-strong">
                <Plus className="h-4 w-4" />
                Start Creating
              </div>
            </Link>
          )}
          {profileCategory && (
            <div className="hidden sm:flex items-center gap-1.5 rounded-md border border-border-subtle px-3 py-1.5 text-sm font-medium text-muted-foreground">
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
