/**
 * Presentational sections extracted from ProfileOverviewTab.tsx to keep that
 * component under the 300-line limit. Pure, prop-driven — no state or data
 * fetching; the parent owns visibility conditions.
 */
import Link from 'next/link';
import { User, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import ProfileProjectCard from './ProfileProjectCard';
import { ROUTES } from '@/config/routes';
import { ENTITY_REGISTRY } from '@/config/entity-registry';

/** Loose project shape — the page passes server-fetched rows; we read defensively. */
export interface OverviewProject {
  id: string;
  title: string;
  description?: string | null;
  cover_image_url?: string | null;
  thumbnail_url?: string | null;
  goal_amount?: number | null;
  goal_currency?: string | null;
  currency?: string | null;
  raised_amount?: number | null;
  bitcoin_balance_btc?: number | null;
  category?: string | null;
  status?: string | null;
  bitcoin_address?: string | null;
  created_at: string;
}

/** "About" card — shows the bio, or an owner-only prompt to add one. */
export function ProfileAboutCard({
  bio,
  isOwnProfile,
  isDashboardView,
}: {
  bio?: string | null;
  isOwnProfile: boolean;
  isDashboardView: boolean;
}) {
  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
          <User className="w-4 h-4 sm:w-5 sm:h-5 text-fg-secondary" />
          About
        </h3>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0">
        {bio ? (
          <p className="text-sm sm:text-base text-fg-primary whitespace-pre-wrap leading-relaxed">
            {bio}
          </p>
        ) : isOwnProfile && isDashboardView ? (
          <a
            href={`${ROUTES.DASHBOARD.INFO_EDIT}#bio`}
            className="inline-flex items-center gap-2 text-fg-primary hover:text-fg-primary underline-offset-4 hover:underline group text-sm sm:text-base"
          >
            <span className="text-fg-tertiary italic group-hover:text-fg-primary">
              Tell people more about yourself
            </span>
            <span className="text-xs uppercase tracking-wide">Add bio</span>
          </a>
        ) : (
          <p className="text-sm sm:text-base text-fg-tertiary italic">No bio yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

/** Owner's projects preview — explore-and-fund without leaving the profile. */
export function ProfileProjectsSection({
  visibleProjects,
  totalProjects,
  projectsTabHref,
}: {
  visibleProjects: OverviewProject[];
  totalProjects: number;
  projectsTabHref: string;
}) {
  const ProjectIcon = ENTITY_REGISTRY.project.icon;
  return (
    <section className="space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-base font-semibold text-fg-primary sm:text-lg">
          <ProjectIcon className="h-4 w-4 text-fg-secondary sm:h-5 sm:w-5" />
          {ENTITY_REGISTRY.project.namePlural}
        </h3>
        {totalProjects > visibleProjects.length && (
          <Link
            href={projectsTabHref}
            className="inline-flex items-center gap-1 text-sm text-fg-secondary hover:text-fg-primary"
          >
            View all {totalProjects}
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      <div className="space-y-4">
        {visibleProjects.map(p => (
          <ProfileProjectCard
            key={p.id}
            project={{
              id: p.id,
              title: p.title,
              description: p.description,
              imageUrl: p.cover_image_url ?? p.thumbnail_url ?? null,
              goalAmount: p.goal_amount,
              raisedAmount: p.raised_amount ?? undefined,
              balanceBtc: p.bitcoin_balance_btc ?? undefined,
              currency: p.goal_currency ?? p.currency ?? undefined,
              category: p.category,
              status: p.status,
              hasWallet: !!p.bitcoin_address,
              createdAt: p.created_at,
            }}
          />
        ))}
      </div>
    </section>
  );
}
