import { Plus, ArrowRight } from 'lucide-react';
import { ROUTES } from '@/config/routes';
import Button from '@/components/ui/Button';

export default function DiscoverHero() {
  return (
    <section className="relative overflow-hidden bg-surface-page border-b border-default">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="text-center">
          <h1 className="text-fluid-3xl font-extrabold tracking-tight text-fg-primary mb-4">
            <span className="block">Discover Opportunities</span>
            <span className="block text-fg-primary">Fund, Invest & Connect</span>
          </h1>

          <p className="mt-4 max-w-2xl mx-auto text-fluid-lg text-fg-secondary">
            Projects, causes, products, services, loans, investments, events, and more — from
            creators and communities around the world.
          </p>

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
