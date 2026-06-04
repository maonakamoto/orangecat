'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { CurrencyDisplay } from '@/components/ui/CurrencyDisplay';
import { Target, BarChart3, TrendingUp, Plus } from 'lucide-react';
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
 * MobileDashboardSidebar — mobile sidebar that surfaces real numbers
 * when there are real numbers to show, and the "create first project"
 * CTA otherwise.
 *
 * Pre-2026-06-04 this card unconditionally rendered three big "0 / 0 / 0"
 * tiles for new users — technically real data, but visually
 * indistinguishable from placeholder/fake-metrics, which violates the
 * project rule against displaying empty-state stats as decorative tiles.
 * Now the Impact card is gated on totalProjects > 0; new users see only
 * the CTA.
 *
 * Profile completion handled by DashboardJourney; quick actions by
 * DashboardQuickActions; entity navigation by the main nav sidebar.
 */
export function MobileDashboardSidebar({ stats }: MobileDashboardSidebarProps) {
  const router = useRouter();
  const { totalProjects, totalRaised, totalSupporters, primaryCurrency } = stats;

  if (totalProjects === 0) {
    return (
      <div className="space-y-4 lg:hidden">
        <Card className="border-border-subtle bg-background">
          <CardContent className="p-5 text-center">
            <div className="mb-4 inline-flex rounded-md border border-border-subtle bg-muted/30 p-3">
              <Target className="w-8 h-8 text-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-3">Ready to Start Fundraising?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first project and start receiving support in minutes.
            </p>
            <Button
              className="bg-foreground text-background hover:bg-foreground/90"
              onClick={() => router.push(ENTITY_REGISTRY.project.createPath)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Project
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:hidden">
      <Card className="border-border-subtle bg-background">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-fg-secondary" />
            <h3 className="text-base font-semibold text-foreground">Your Impact</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
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

      <Card className="border-border-subtle bg-background">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-fg-secondary" />
            <h3 className="text-base font-semibold text-foreground">Analytics</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Avg per project</span>
              <span className="text-sm font-bold text-foreground">
                <CurrencyDisplay amount={totalRaised / totalProjects} currency={primaryCurrency} />
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Supporters</span>
              <span className="text-sm font-bold text-foreground">{totalSupporters}</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full mt-2"
              onClick={() => router.push(ENTITY_REGISTRY.project.basePath)}
            >
              View Details
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default MobileDashboardSidebar;
