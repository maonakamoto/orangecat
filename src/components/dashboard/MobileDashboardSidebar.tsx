'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import { CurrencyDisplay } from '@/components/ui/CurrencyDisplay';
import { TrendingUp } from 'lucide-react';
import { ENTITY_REGISTRY } from '@/config/entity-registry';

interface MobileDashboardSidebarProps {
  stats: {
    totalProjects: number;
    totalRaised: number;
    totalSupporters: number;
    primaryCurrency: string;
  };
}

/**
 * MobileDashboardSidebar — mobile Impact card.
 *
 * Renders ONLY when the user has real numbers to show. New users get
 * nothing here — DashboardJourney already drives the next action,
 * and showing "0 / 0 / 0" tiles for an empty account is clutter.
 *
 * The pre-2026-06-05 version also had a duplicate Analytics card
 * (Avg per project + Supporters + View Details button) that just
 * restated the Impact numbers — deleted as part of the action-density
 * sweep.
 */
export function MobileDashboardSidebar({ stats }: MobileDashboardSidebarProps) {
  const router = useRouter();
  const { totalProjects, totalRaised, totalSupporters, primaryCurrency } = stats;

  if (totalProjects === 0) {
    return null;
  }

  return (
    <div className="space-y-4 lg:hidden">
      <Card className="border-border-subtle bg-background">
        <CardContent className="p-4">
          <button
            type="button"
            onClick={() => router.push(ENTITY_REGISTRY.project.basePath)}
            className="flex w-full items-center gap-2 mb-4 text-left"
          >
            <TrendingUp className="w-5 h-5 text-fg-secondary" />
            <h3 className="text-base font-semibold text-foreground">Your Impact</h3>
          </button>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="rounded-md border border-border-subtle bg-muted/30 p-3 text-center">
              <div className="text-2xl font-bold text-foreground">{totalProjects}</div>
              <div className="text-xs text-muted-foreground">Projects</div>
            </div>
            <div className="rounded-md border border-border-subtle bg-muted/30 p-3 text-center">
              <div className="text-lg font-bold text-foreground">
                <CurrencyDisplay amount={totalRaised} currency={primaryCurrency} />
              </div>
              <div className="text-xs text-muted-foreground">Raised</div>
            </div>
          </div>
          <div className="rounded-md border border-border-subtle bg-muted/30 p-2 text-center">
            <div className="text-lg font-bold text-foreground">{totalSupporters}</div>
            <div className="text-xs text-muted-foreground">Supporters</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default MobileDashboardSidebar;
