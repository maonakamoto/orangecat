import Link from 'next/link';
import { Plus, ArrowRight } from 'lucide-react';
import { ROUTES } from '@/config/routes';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

interface DiscoverHeroProps {
  totalProjects: number;
  totalProfiles: number;
  totalFinancial?: number;
}

export default function DiscoverHero({
  totalProjects,
  totalProfiles,
  totalFinancial = 0,
}: DiscoverHeroProps) {
  return (
    <section className="relative overflow-hidden bg-background border-b border-border">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="text-center">
          <h1 className="text-fluid-3xl font-extrabold tracking-tight text-foreground mb-4">
            <span className="block">Discover Opportunities</span>
            <span className="block text-foreground">Fund, Invest & Connect</span>
          </h1>

          <p className="mt-4 max-w-2xl mx-auto text-fluid-lg text-muted-foreground">
            Projects, causes, products, services, loans, investments, events, and more — from
            creators and communities around the world.
          </p>

          {/* Stats - Compact */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl mx-auto">
            <Link href={`${ROUTES.DISCOVER}?type=projects`} className="block">
              <Card className="p-4 transition-colors hover:border-border-strong">
                <div className="text-fluid-xl font-bold text-foreground">{totalProjects}</div>
                <div className="text-sm text-muted-foreground mt-1">Active Projects</div>
              </Card>
            </Link>
            <Link href={`${ROUTES.DISCOVER}?type=profiles`} className="block">
              <Card className="p-4 transition-colors hover:border-border-strong">
                <div className="text-fluid-xl font-bold text-foreground">{totalProfiles}</div>
                <div className="text-sm text-muted-foreground mt-1">People</div>
              </Card>
            </Link>
            <Card className="p-4">
              <div className="text-fluid-xl font-bold text-foreground">{totalFinancial}</div>
              <div className="text-sm text-muted-foreground mt-1">Finance</div>
            </Card>
          </div>

          {/* Creator CTA */}
          <div className="mt-6">
            <Button href={ROUTES.AUTH} variant="gradient" size="lg">
              <Plus className="w-4 h-4" />
              Start Creating
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
