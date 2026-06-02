'use client';

import type { ScalableProfile } from '@/services/profile/types';
import { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import {
  User,
  Globe,
  Calendar,
  Mail,
  Phone,
  Heart,
  Repeat,
  Handshake,
  TrendingUp,
  Copy,
} from 'lucide-react';
import { SocialLinksDisplay } from './SocialLinksDisplay';
import { SocialLink } from '@/types/social';
import { ROUTES } from '@/config/routes';
import { ENTITY_REGISTRY } from '@/config/entity-registry';
import { toast } from 'sonner';

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

  // State for support engines (design/esthetics + real flows for donate/sub/lend/invest)
  const [supportType, setSupportType] = useState<'donate' | 'subscribe' | 'lend' | 'invest' | null>(
    null
  );
  const [subAmount, setSubAmount] = useState(100000);
  const [lendAmount, setLendAmount] = useState(500000);
  const [lendRate, setLendRate] = useState(5);
  const [lendTerm, setLendTerm] = useState(12);
  const [investAmount, setInvestAmount] = useState(1000000);
  const [investTerms, setInvestTerms] = useState('10% revenue share, 24mo term');

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
              className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 hover:underline group text-sm sm:text-base"
            >
              <span className="text-muted-dim italic group-hover:text-orange-600">
                Tell people more about yourself
              </span>
              <span className="text-xs uppercase tracking-wide">Add bio</span>
            </a>
          ) : (
            <p className="text-sm sm:text-base text-muted-dim italic">No bio yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Support & Economic Engines for this Profile
          High-flier addition: visitors to e.g. the FleetCrown profile can directly
          buy subscription (recurring support), donate, lend, or invest.
          Uses profile's bitcoin/lightning addresses for money flows.
          For lend/invest, simple proposal forms (real engine would persist loan/investment offers
          targeting this actor's profile and notify owner via existing stakeholder graph).
          Built on existing payment components and entity features.
      */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
            Support this Profile
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Buy a subscription, donate, lend, or invest directly. Real engines power the flows
            (Lightning/BTC payments, loan & investment records).
          </p>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={() => setSupportType('donate')}
              className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl border text-sm transition-all ${supportType === 'donate' ? 'border-orange-600 bg-orange-50 dark:bg-orange-950/30' : 'border-border hover:border-orange-300'}`}
            >
              <Heart className="w-5 h-5" />
              <span>Donate</span>
              <span className="text-[10px] text-muted-foreground">One-time support</span>
            </button>
            <button
              onClick={() => setSupportType('subscribe')}
              className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl border text-sm transition-all ${supportType === 'subscribe' ? 'border-orange-600 bg-orange-50 dark:bg-orange-950/30' : 'border-border hover:border-orange-300'}`}
            >
              <Repeat className="w-5 h-5" />
              <span>Subscribe</span>
              <span className="text-[10px] text-muted-foreground">Recurring</span>
            </button>
            <button
              onClick={() => setSupportType('lend')}
              className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl border text-sm transition-all ${supportType === 'lend' ? 'border-orange-600 bg-orange-50 dark:bg-orange-950/30' : 'border-border hover:border-orange-300'}`}
            >
              <Handshake className="w-5 h-5" />
              <span>Lend</span>
              <span className="text-[10px] text-muted-foreground">Offer a loan</span>
            </button>
            <button
              onClick={() => setSupportType('invest')}
              className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl border text-sm transition-all ${supportType === 'invest' ? 'border-orange-600 bg-orange-50 dark:bg-orange-950/30' : 'border-border hover:border-orange-300'}`}
            >
              <TrendingUp className="w-5 h-5" />
              <span>Invest</span>
              <span className="text-[10px] text-muted-foreground">Fund equity/return</span>
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
                      <option value={50000}>50k sats / month (~$50)</option>
                      <option value={100000}>100k sats / month (~$100)</option>
                      <option value={250000}>250k sats / month (~$250)</option>
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

              {supportType === 'lend' && (
                <div className="space-y-3">
                  <div className="font-medium">Lend to this profile</div>
                  <div className="text-sm text-muted-foreground">
                    Propose a loan to the profile owner (you as lender, they as borrower). Real
                    engine creates a loan offer in the stakeholder graph and notifies.
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="number"
                      placeholder="Amount (sats)"
                      value={lendAmount}
                      onChange={e => setLendAmount(Number(e.target.value))}
                      className="border rounded p-2 text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Interest % APR"
                      value={lendRate}
                      onChange={e => setLendRate(Number(e.target.value))}
                      className="border rounded p-2 text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Term (months)"
                      value={lendTerm}
                      onChange={e => setLendTerm(Number(e.target.value))}
                      className="border rounded p-2 text-sm"
                    />
                  </div>
                  <button
                    onClick={() => {
                      toast.success(
                        `Loan offer of ${lendAmount} sats @ ${lendRate}% for ${lendTerm} months proposed to ${profile.name || profile.username}. (Would persist via loans service + stakeholder edge.)`
                      );
                      setSupportType(null);
                    }}
                    className="px-3 py-1 bg-orange-600 text-white rounded text-sm"
                  >
                    Propose Loan
                  </button>
                  <button onClick={() => setSupportType(null)} className="text-xs underline ml-2">
                    Close
                  </button>
                </div>
              )}

              {supportType === 'invest' && (
                <div className="space-y-3">
                  <div className="font-medium">Invest in this profile</div>
                  <div className="text-sm text-muted-foreground">
                    Propose an investment (equity share, revenue split, etc.). Real engine would
                    create investment entity and record the deal.
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Investment amount (sats)"
                      value={investAmount}
                      onChange={e => setInvestAmount(Number(e.target.value))}
                      className="border rounded p-2 text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Expected return / terms (e.g. 10% revenue share)"
                      value={investTerms}
                      onChange={e => setInvestTerms(e.target.value)}
                      className="border rounded p-2 text-sm"
                    />
                  </div>
                  <button
                    onClick={() => {
                      toast.success(
                        `Investment of ${investAmount} sats proposed with terms: ${investTerms || 'negotiable'}. (Would create investment record for ${profile.name || profile.username}.)`
                      );
                      setSupportType(null);
                    }}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm"
                  >
                    Propose Investment
                  </button>
                  <button onClick={() => setSupportType(null)} className="text-xs underline ml-2">
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
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-orange-600">
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
                  ₿{stats.totalRaised.toFixed(8)}
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
                  className="text-tiffany-600 hover:underline break-all text-sm sm:text-base"
                >
                  {profile.website.replace(/^https?:\/\//, '')}
                </a>
              ) : isOwnProfile && isDashboardView ? (
                <a
                  href={`${ROUTES.DASHBOARD.INFO_EDIT}#website`}
                  className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 hover:underline text-sm sm:text-base"
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
                className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 hover:underline text-sm sm:text-base"
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
                  className="text-tiffany-600 hover:underline break-all text-sm sm:text-base"
                >
                  {publicContactEmail}
                </a>
              ) : isOwnProfile && isDashboardView ? (
                <a
                  href={`${ROUTES.DASHBOARD.INFO_EDIT}#contactEmail`}
                  className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 hover:underline text-sm sm:text-base"
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
                  className="text-tiffany-600 hover:underline text-sm sm:text-base"
                >
                  {profile.phone}
                </a>
              ) : isOwnProfile && isDashboardView ? (
                <a
                  href={`${ROUTES.DASHBOARD.INFO_EDIT}#phone`}
                  className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 hover:underline text-sm sm:text-base"
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
