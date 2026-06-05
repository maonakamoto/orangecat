'use client';

import type { ScalableProfile } from '@/services/profile/types';
import { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { User, Globe, Calendar, Mail, Phone, Heart, Repeat, Copy } from 'lucide-react';
import { SocialLinksDisplay } from './SocialLinksDisplay';
import { SocialLink } from '@/types/social';
import { ROUTES } from '@/config/routes';
import { ENTITY_REGISTRY } from '@/config/entity-registry';
import { toast } from 'sonner';
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
  const publicContactEmail = profile.contact_email || profile.email;
  const { formatAmountBtc } = useDisplayCurrency();

  // Donate + Subscribe both use the profile's real Bitcoin/Lightning
  // addresses. The Lend + Invest sub-flows were removed (they only
  // toast.success("Would persist via...") with no backend behind them).
  const [supportType, setSupportType] = useState<'donate' | 'subscribe' | null>(null);
  const [subAmount, setSubAmount] = useState(0.001);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Bio Section - always visible; prompts to fill in when empty */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <User className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
            About
          </h3>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {profile.bio ? (
            <p className="text-sm sm:text-base text-foreground whitespace-pre-wrap leading-relaxed">
              {profile.bio}
            </p>
          ) : isOwnProfile && isDashboardView ? (
            <a
              href={`${ROUTES.DASHBOARD.INFO_EDIT}#bio`}
              className="inline-flex items-center gap-2 text-foreground hover:text-muted-strong underline-offset-4 hover:underline group text-sm sm:text-base"
            >
              <span className="text-muted-dim italic group-hover:text-foreground">
                Tell people more about yourself
              </span>
              <span className="text-xs uppercase tracking-wide">Add bio</span>
            </a>
          ) : (
            <p className="text-sm sm:text-base text-muted-dim italic">No bio yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-fg-secondary" />
            Support this Profile
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Donate one-time or subscribe to recurring support — payments go directly to the
            profile's Lightning or Bitcoin address.
          </p>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setSupportType('donate')}
              className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl border text-sm transition-all ${supportType === 'donate' ? 'border-foreground bg-muted' : 'border-border hover:border-border-strong'}`}
            >
              <Heart className="w-5 h-5" />
              <span>Donate</span>
              <span className="text-[10px] text-muted-foreground">One-time support</span>
            </button>
            <button
              onClick={() => setSupportType('subscribe')}
              className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl border text-sm transition-all ${supportType === 'subscribe' ? 'border-foreground bg-muted' : 'border-border hover:border-border-strong'}`}
            >
              <Repeat className="w-5 h-5" />
              <span>Subscribe</span>
              <span className="text-[10px] text-muted-foreground">Recurring</span>
            </button>
          </div>

          {/* Dynamic form for selected support type */}
          {supportType && (
            <div className="mt-4 p-4 border border-border rounded-xl bg-surface/50">
              {supportType === 'donate' && (
                <div className="space-y-3">
                  <div className="font-medium">Donate to this profile</div>
                  <div className="text-sm text-muted-foreground">
                    One-time contribution. Send to the profile's Bitcoin or Lightning address (real
                    engine integrates the full PublicEntityPaymentSection / LightningPayment flow
                    for invoicing + confirmation).
                  </div>
                  {profile.bitcoin_address || profile.lightning_address ? (
                    <div className="space-y-2 text-sm">
                      {profile.lightning_address && (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                            {profile.lightning_address}
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(profile.lightning_address!);
                              toast.success('Lightning address copied');
                            }}
                            className="p-1"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      {profile.bitcoin_address && (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                            {profile.bitcoin_address}
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(profile.bitcoin_address!);
                              toast.success('BTC address copied');
                            }}
                            className="p-1"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      <div className="text-[10px] text-muted-foreground">
                        Send any amount. For integrated checkout with amount selection and status,
                        see project support pages.
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground italic">
                      No wallet connected yet. Profile owner can add one in settings.
                    </div>
                  )}
                  <button onClick={() => setSupportType(null)} className="text-xs underline">
                    Close
                  </button>
                </div>
              )}

              {supportType === 'subscribe' && (
                <div className="space-y-3">
                  <div className="font-medium">Buy a subscription</div>
                  <div className="text-sm text-muted-foreground">
                    Recurring support (e.g. monthly sats for updates, early access, or to fund
                    development). Real engine would create a subscription record + recurring
                    invoices.
                  </div>
                  <div className="flex gap-2 items-center">
                    <select
                      value={subAmount}
                      onChange={e => setSubAmount(Number(e.target.value))}
                      className="border rounded p-1 text-sm"
                    >
                      <option value={0.0005}>{formatAmountBtc(0.0005)} / month</option>
                      <option value={0.001}>{formatAmountBtc(0.001)} / month</option>
                      <option value={0.0025}>{formatAmountBtc(0.0025)} / month</option>
                    </select>
                    <span className="text-xs text-muted-foreground">per month</span>
                  </div>
                  {profile.lightning_address ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                          {profile.lightning_address}
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(profile.lightning_address!);
                            toast.success('Address copied for recurring payments');
                          }}
                          className="p-1"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Set up recurring sends manually or via wallet. Full engine would create
                        subscription row + auto-invoice scheduler tied to this profile.
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground italic">
                      No Lightning address for subscriptions.
                    </div>
                  )}
                  <button onClick={() => setSupportType(null)} className="text-xs underline">
                    Close
                  </button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <Card>
            <CardContent className="pt-4 sm:pt-6">
              <div className="text-center">
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
                  {stats.projectCount}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-1">
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
                <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-green-600">
                  {formatAmountBtc(stats.totalRaised)}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-1">Total Raised</div>
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
          <div className="flex items-center gap-3 text-foreground">
            <Globe className="w-5 h-5 text-muted-dim" />
            <div className="flex-1">
              <div className="text-sm text-muted-foreground">Website</div>
              {profile.website ? (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground hover:text-muted-strong underline-offset-4 hover:underline break-all text-sm sm:text-base"
                >
                  {profile.website.replace(/^https?:\/\//, '')}
                </a>
              ) : isOwnProfile && isDashboardView ? (
                <a
                  href={`${ROUTES.DASHBOARD.INFO_EDIT}#website`}
                  className="inline-flex items-center gap-2 text-foreground hover:text-muted-strong underline-offset-4 hover:underline text-sm sm:text-base"
                >
                  <span className="text-muted-dim italic">Add a website</span>
                  <span className="text-xs uppercase tracking-wide">Edit</span>
                </a>
              ) : (
                <span className="text-sm sm:text-base text-muted-dim italic">
                  No website added yet.
                </span>
              )}
            </div>
          </div>

          {/* Social Media & Links */}
          <div className="pt-3 border-t border-border">
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
                className="inline-flex items-center gap-2 text-foreground hover:text-muted-strong underline-offset-4 hover:underline text-sm sm:text-base"
              >
                <span className="text-muted-dim italic">Add social links or profiles</span>
                <span className="text-xs uppercase tracking-wide">Edit</span>
              </a>
            ) : (
              <span className="text-sm sm:text-base text-muted-dim italic">
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
          <div className="flex items-center gap-3 text-foreground pt-3 border-t border-border">
            <Mail className="w-5 h-5 text-muted-dim" />
            <div className="flex-1">
              <div className="text-sm text-muted-foreground">Contact email</div>
              {publicContactEmail ? (
                <a
                  href={`mailto:${publicContactEmail}`}
                  className="text-foreground hover:text-muted-strong underline-offset-4 hover:underline break-all text-sm sm:text-base"
                >
                  {publicContactEmail}
                </a>
              ) : isOwnProfile && isDashboardView ? (
                <a
                  href={`${ROUTES.DASHBOARD.INFO_EDIT}#contactEmail`}
                  className="inline-flex items-center gap-2 text-foreground hover:text-muted-strong underline-offset-4 hover:underline text-sm sm:text-base"
                >
                  <span className="text-muted-dim italic">Add a public contact email</span>
                  <span className="text-xs uppercase tracking-wide">Edit</span>
                </a>
              ) : (
                <span className="text-sm sm:text-base text-muted-dim italic">
                  No public email added.
                </span>
              )}
            </div>
          </div>

          {/* Phone */}
          <div className="flex items-center gap-3 text-foreground">
            <Phone className="w-5 h-5 text-muted-dim" />
            <div className="flex-1">
              <div className="text-sm text-muted-foreground">Phone</div>
              {profile.phone ? (
                <a
                  href={`tel:${profile.phone}`}
                  className="text-foreground hover:text-muted-strong underline-offset-4 hover:underline text-sm sm:text-base"
                >
                  {profile.phone}
                </a>
              ) : isOwnProfile && isDashboardView ? (
                <a
                  href={`${ROUTES.DASHBOARD.INFO_EDIT}#phone`}
                  className="inline-flex items-center gap-2 text-foreground hover:text-muted-strong underline-offset-4 hover:underline text-sm sm:text-base"
                >
                  <span className="text-muted-dim italic">Add a phone number</span>
                  <span className="text-xs uppercase tracking-wide">Edit</span>
                </a>
              ) : (
                <span className="text-sm sm:text-base text-muted-dim italic">
                  No phone number added.
                </span>
              )}
            </div>
          </div>

          {/* Joined Date (contextual meta) */}
          {profile.created_at && (
            <div className="flex items-center gap-3 text-muted-foreground text-sm pt-3 border-t border-border">
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
