'use client';

import { ArrowUpRight, Bot } from 'lucide-react';
import Button from '@/components/ui/Button';
import { ORANGECAT_FLEETCROWN_INTEGRATION } from '@/config/entity-registry';

/**
 * FleetCrown cross-sell — "build this with an AI fleet".
 *
 * FleetCrown is the sibling execution product (OC = economic layer, FC =
 * production layer; one shared login via "Login with OrangeCat"). This CTA is
 * the single bridge component; the target URL derives from the integration
 * SSOT in the entity registry.
 *
 * - `banner`: slim horizontal strip for the projects dashboard.
 * - `card`: compact block for the project detail sidebar rail.
 */

const FLEETCROWN_BUILD_URL = `${ORANGECAT_FLEETCROWN_INTEGRATION.fleetCrown.site}/sign-in?callbackUrl=${encodeURIComponent('/projects')}`;

const COPY = {
  title: `Build it with ${ORANGECAT_FLEETCROWN_INTEGRATION.fleetCrown.title}`,
  body: 'Run AI agents on this project. One login: your OrangeCat account.',
  action: `Open ${ORANGECAT_FLEETCROWN_INTEGRATION.fleetCrown.title}`,
} as const;

interface FleetCrownBuildCtaProps {
  variant: 'banner' | 'card';
}

export default function FleetCrownBuildCta({ variant }: FleetCrownBuildCtaProps) {
  if (variant === 'banner') {
    return (
      <div className="mb-4 rounded-md border border-subtle bg-surface-raised/30 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-md border border-subtle bg-surface-page p-2">
              <Bot className="h-5 w-5 text-accent-warm" aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-medium text-fg-primary">{COPY.title}</h3>
              <p className="mt-1 text-sm text-fg-secondary">{COPY.body}</p>
            </div>
          </div>
          <Button href={FLEETCROWN_BUILD_URL} variant="outline" size="sm" className="shrink-0">
            {COPY.action}
            <ArrowUpRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-subtle bg-surface-base p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-md border border-subtle bg-surface-page p-2">
          <Bot className="h-5 w-5 text-accent-warm" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-fg-primary">{COPY.title}</h3>
          <p className="mt-1 text-sm text-fg-secondary">{COPY.body}</p>
        </div>
      </div>
      <Button href={FLEETCROWN_BUILD_URL} variant="outline" size="sm" className="mt-3 w-full">
        {COPY.action}
        <ArrowUpRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
