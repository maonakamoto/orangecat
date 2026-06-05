'use client';

/**
 * ProfileSupportSection
 *
 * Donate + Subscribe sub-flows that expose the profile owner's
 * Bitcoin/Lightning addresses for direct payment.
 *
 * Extracted from ProfileOverviewTab to keep that surface readable —
 * the parent only needs to render the section without owning support
 * state.
 */

import { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Heart, Repeat, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useDisplayCurrency } from '@/hooks/useDisplayCurrency';

interface ProfileSupportSectionProps {
  profile: {
    bitcoin_address: string | null;
    lightning_address: string | null;
  };
}

type SupportType = 'donate' | 'subscribe' | null;

export function ProfileSupportSection({ profile }: ProfileSupportSectionProps) {
  const { formatAmountBtc } = useDisplayCurrency();
  const [supportType, setSupportType] = useState<SupportType>(null);
  const [subAmount, setSubAmount] = useState(0.001);

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
          <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-fg-secondary" />
          Support this Profile
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Donate one-time or subscribe to recurring support — payments go directly to the profile's
          Lightning or Bitcoin address.
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

        {supportType && (
          <div className="mt-4 p-4 border border-border rounded-xl bg-surface/50">
            {supportType === 'donate' && (
              <div className="space-y-3">
                <div className="font-medium">Donate to this profile</div>
                <div className="text-sm text-muted-foreground">
                  One-time contribution. Send to the profile's Bitcoin or Lightning address (real
                  engine integrates the full PublicEntityPaymentSection / LightningPayment flow for
                  invoicing + confirmation).
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
                      Send any amount. For integrated checkout with amount selection and status, see
                      project support pages.
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
                  Recurring support (e.g. monthly contributions for updates, early access, or to
                  fund development). Real engine would create a subscription record + recurring
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
  );
}
