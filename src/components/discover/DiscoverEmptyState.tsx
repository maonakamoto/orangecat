'use client';

import { motion } from 'framer-motion';
import { Target, Users } from 'lucide-react';
import Button from '@/components/ui/Button';
import type { DiscoverTabType } from '@/components/discover/DiscoverTabs';
import { ENTITY_REGISTRY, type EntityType } from '@/config/entity-registry';
import { ROUTES } from '@/config/routes';
import { GRADIENTS } from '@/config/gradients';
import { cn } from '@/lib/utils';

interface DiscoverEmptyStateProps {
  activeTab: DiscoverTabType;
  hasFilters: boolean;
  onClearFilters: () => void;
}

const TAB_ENTITY_MAP: Partial<Record<DiscoverTabType, EntityType>> = {
  projects: 'project',
  loans: 'loan',
  investments: 'investment',
  assets: 'asset',
  causes: 'cause',
  events: 'event',
  products: 'product',
  services: 'service',
  groups: 'group',
  wishlists: 'wishlist',
  research: 'research',
  ai_assistants: 'ai_assistant',
};

export default function DiscoverEmptyState({
  activeTab,
  hasFilters,
  onClearFilters,
}: DiscoverEmptyStateProps) {
  const entityType = TAB_ENTITY_MAP[activeTab];
  const meta = entityType ? ENTITY_REGISTRY[entityType] : null;
  const EntityIcon = meta?.icon ?? (activeTab === 'profiles' ? Users : Target);

  if (!hasFilters) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center py-16"
      >
        <div className="bg-gradient-to-r from-orange-50 via-tiffany-50 to-orange-50 rounded-2xl border border-orange-200 p-8 text-center max-w-2xl mx-auto">
          <div
            className={cn(
              GRADIENTS.iconOrangeTiffany,
              'w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4'
            )}
          >
            <EntityIcon className="w-8 h-8 text-orange-600" />
          </div>
          <h3 className="text-2xl font-semibold text-gray-900 dark:text-foreground mb-3">
            {activeTab === 'profiles'
              ? 'No People Found'
              : activeTab === 'all'
                ? 'Nothing Here Yet'
                : `No ${meta?.namePlural ?? 'Results'} Yet`}
          </h3>
          <p className="text-lg text-gray-600 dark:text-muted-foreground mb-6 leading-relaxed">
            {activeTab === 'profiles'
              ? 'No profiles match your search criteria. Try adjusting your filters or browse all people.'
              : activeTab === 'all'
                ? 'Nothing matches yet — but this platform is just getting started. Be the first to create something.'
                : `No ${meta?.namePlural?.toLowerCase() ?? 'listings'} are available yet. Be the first!`}
          </p>

          {meta && (
            <>
              <Button
                href={meta.createPath}
                size="lg"
                className={`${GRADIENTS.btnOrangeDark} text-white px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 mb-4`}
              >
                {meta.createActionLabel}
              </Button>

              <p className="text-sm text-gray-500 dark:text-muted-foreground">
                Already have an account?{' '}
                <a href={ROUTES.AUTH} className="text-orange-600 hover:underline font-medium">
                  Sign in
                </a>{' '}
                to get started.
              </p>
            </>
          )}
        </div>
      </motion.div>
    );
  }

  // Has filters — show filtered empty state
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="text-center py-16"
    >
      <div className="max-w-md mx-auto">
        <EntityIcon className="w-16 h-16 text-orange-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-foreground mb-2">
          No matches found
        </h3>
        <p className="text-gray-600 dark:text-muted-foreground mb-8">
          {activeTab === 'profiles'
            ? 'Try different filters or browse all people to discover someone new.'
            : `Try different filters or browse all ${meta?.namePlural?.toLowerCase() ?? 'results'} to discover something new.`}
        </p>
        <div className="space-y-3">
          <Button onClick={onClearFilters} variant="outline" className="px-6 py-2">
            Clear Filters
          </Button>
          {meta && (
            <Button
              href={meta.createPath}
              className={`${GRADIENTS.btnOrangeDark} text-white px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300`}
            >
              Or {meta.createActionLabel.toLowerCase()} →
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
