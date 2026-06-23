'use client';

import type { ScalableProfile } from '@/services/profile/types';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { User, Globe, Calendar, Mail, Phone } from 'lucide-react';
import { SocialLinksDisplay } from './SocialLinksDisplay';
import { ProfileSupportSection } from './ProfileSupportSection';
import { SocialLink } from '@/types/social';
import { ROUTES } from '@/config/routes';
import { ENTITY_REGISTRY } from '@/config/entity-registry';
import { useDisplayCurrency } from '@/hooks/useDisplayCurrency';

interface ProfileOverviewTabProps {
  profile: ScalableProfile;
  stats?: {
    projectCount: number;
    totalRaised: number;
  };
  /**
   * Whether the currently authenticated user is viewing their own profile.
   * Enables edit prompts and links in dashboard context.
   */
  isOwnProfile?: boolean;
  /**
   * Rendering context:
   * - "public": public profile view (default)
   * - "dashboard": /dashboard/info owner-focused view
   */
  context?: 'public' | 'dashboard';
}

/**
 * ProfileOverviewTab Component
 *
 * Shows profile bio, stats, and key information.
 * Default tab that loads immediately for fast initial view.
 */
export default function ProfileOverviewTab({
  profile,
  stats,
  isOwnProfile = false,
  context = 'public',
}: ProfileOverviewTabProps) {
  const isDashboardView = context === 'dashboard';
  // Public contact email is ONLY the opt-in contact_email field — never the
  // private account login email (profile.email). See profile email-leak fix.
  const publicContactEmail = profile.contact_email;
  const { formatAmountBtc } = useDisplayCurrency();

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Bio Section - always visible; prompts to fill in when empty */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <User className="w-4 h-4 sm:w-5 sm:h-5 text-fg-secondary" />
            About
          </h3>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {profile.bio ? (
            <p className="text-sm sm:text-base text-fg-primary whitespace-pre-wrap leading-relaxed">
              {profile.bio}
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

      <ProfileSupportSection profile={profile} />

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <Card>
            <CardContent className="pt-4 sm:pt-6">
              <div className="text-center">
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-fg-primary">
                  {stats.projectCount}
                </div>
                <div className="text-xs sm:text-sm text-fg-secondary mt-1">
                  {stats.projectCount === 1
                    ? ENTITY_REGISTRY.project.name
                    : ENTITY_REGISTRY.project.namePlural}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 sm:pt-6">
              <div className="text-center">
                {/* Success green only signals an actual raise — a zero balance
                    rendered green reads as a positive metric it isn't. */}
                <div
                  className={`text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold ${
                    stats.totalRaised > 0 ? 'text-status-positive' : 'text-fg-primary'
                  }`}
                >
                  {formatAmountBtc(stats.totalRaised)}
                </div>
                <div className="text-xs sm:text-sm text-fg-secondary mt-1">Total Raised</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Online presence / credibility */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold">Online presence</h3>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 space-y-2 sm:space-y-3">
          {/* Website */}
          <div className="flex items-center gap-3 text-fg-primary">
            <Globe className="w-5 h-5 text-fg-tertiary" />
            <div className="flex-1">
              <div className="text-sm text-fg-secondary">Website</div>
              {profile.website ? (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-fg-primary hover:text-fg-primary underline-offset-4 hover:underline break-all text-sm sm:text-base"
                >
                  {profile.website.replace(/^https?:\/\//, '')}
                </a>
              ) : isOwnProfile && isDashboardView ? (
                <a
                  href={`${ROUTES.DASHBOARD.INFO_EDIT}#website`}
                  className="inline-flex items-center gap-2 text-fg-primary hover:text-fg-primary underline-offset-4 hover:underline text-sm sm:text-base"
                >
                  <span className="text-fg-tertiary italic">Add a website</span>
                  <span className="text-xs uppercase tracking-wide">Edit</span>
                </a>
              ) : (
                <span className="text-sm sm:text-base text-fg-tertiary italic">
                  No website added yet.
                </span>
              )}
            </div>
          </div>

          {/* Social Media & Links */}
          <div className="pt-3 border-t border-default">
            {profile.social_links &&
            typeof profile.social_links === 'object' &&
            'links' in profile.social_links &&
            profile.social_links.links &&
            Array.isArray(profile.social_links.links) &&
            (profile.social_links.links as SocialLink[]).length > 0 ? (
              <SocialLinksDisplay
                links={profile.social_links.links as SocialLink[]}
                compact={true}
              />
            ) : isOwnProfile && isDashboardView ? (
              <a
                href={`${ROUTES.DASHBOARD.INFO_EDIT}#socialLinks`}
                className="inline-flex items-center gap-2 text-fg-primary hover:text-fg-primary underline-offset-4 hover:underline text-sm sm:text-base"
              >
                <span className="text-fg-tertiary italic">Add social links or profiles</span>
                <span className="text-xs uppercase tracking-wide">Edit</span>
              </a>
            ) : (
              <span className="text-sm sm:text-base text-fg-tertiary italic">
                No links added yet.
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Contact: how to reach this person */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold">Contact</h3>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 space-y-2 sm:space-y-3">
          {/* Contact Email (public) */}
          <div className="flex items-center gap-3 text-fg-primary pt-3 border-t border-default">
            <Mail className="w-5 h-5 text-fg-tertiary" />
            <div className="flex-1">
              <div className="text-sm text-fg-secondary">Contact email</div>
              {publicContactEmail ? (
                <a
                  href={`mailto:${publicContactEmail}`}
                  className="text-fg-primary hover:text-fg-primary underline-offset-4 hover:underline break-all text-sm sm:text-base"
                >
                  {publicContactEmail}
                </a>
              ) : isOwnProfile && isDashboardView ? (
                <a
                  href={`${ROUTES.DASHBOARD.INFO_EDIT}#contactEmail`}
                  className="inline-flex items-center gap-2 text-fg-primary hover:text-fg-primary underline-offset-4 hover:underline text-sm sm:text-base"
                >
                  <span className="text-fg-tertiary italic">Add a public contact email</span>
                  <span className="text-xs uppercase tracking-wide">Edit</span>
                </a>
              ) : (
                <span className="text-sm sm:text-base text-fg-tertiary italic">
                  No public email added.
                </span>
              )}
            </div>
          </div>

          {/* Phone */}
          <div className="flex items-center gap-3 text-fg-primary">
            <Phone className="w-5 h-5 text-fg-tertiary" />
            <div className="flex-1">
              <div className="text-sm text-fg-secondary">Phone</div>
              {profile.phone ? (
                <a
                  href={`tel:${profile.phone}`}
                  className="text-fg-primary hover:text-fg-primary underline-offset-4 hover:underline text-sm sm:text-base"
                >
                  {profile.phone}
                </a>
              ) : isOwnProfile && isDashboardView ? (
                <a
                  href={`${ROUTES.DASHBOARD.INFO_EDIT}#phone`}
                  className="inline-flex items-center gap-2 text-fg-primary hover:text-fg-primary underline-offset-4 hover:underline text-sm sm:text-base"
                >
                  <span className="text-fg-tertiary italic">Add a phone number</span>
                  <span className="text-xs uppercase tracking-wide">Edit</span>
                </a>
              ) : (
                <span className="text-sm sm:text-base text-fg-tertiary italic">
                  No phone number added.
                </span>
              )}
            </div>
          </div>

          {/* Joined Date (contextual meta) */}
          {profile.created_at && (
            <div className="flex items-center gap-3 text-fg-secondary text-sm pt-3 border-t border-default">
              <Calendar className="w-4 h-4" />
              <span>
                Joined{' '}
                {new Date(profile.created_at).toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
