'use client';

import Link from 'next/link';
import { User, Target, Building2, Users, Plus } from 'lucide-react';
import { PROFILE_CATEGORIES } from '@/types/profile';
import { GRADIENTS } from '@/config/gradients';
import { ENTITY_REGISTRY } from '@/config/entity-registry';

/** Map profile types to Lucide icons (avoids emojis in UI) */
const PROFILE_TYPE_ICONS = {
  individual: User,
  project: Target,
  organization: Building2,
  collective: Users,
} as const;

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
    <div className="relative overflow-hidden bg-gradient-to-r from-orange-50/50 to-tiffany-50/50 dark:from-muted/30 dark:to-accent/20 rounded-xl border border-gray-100 dark:border-border p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`p-3 ${GRADIENTS.brandMixedBr} rounded-xl`}>
            <User className="h-6 w-6 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
              Welcome back,{' '}
              {profile === null ? (
                <span className="inline-block h-5 w-28 animate-pulse rounded bg-gray-200 dark:bg-muted align-text-bottom" />
              ) : (
                profile.name || profile.username || 'there'
              )}
              !
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
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-tiffany-600 text-white hover:bg-tiffany-700 transition-colors cursor-pointer">
                <Plus className="h-4 w-4" />
                Start Creating
              </div>
            </Link>
          )}
          {profileCategory && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border border-orange-200 text-orange-700">
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
