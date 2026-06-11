'use client';

import { Loader2 } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { getContextualContent } from './contextual-loader-config';

interface ContextualLoaderProps {
  className?: string;
  pathname?: string;
}

/**
 * Honest navigation loader. Used to render an oversize card with the
 * destination's icon, title, subtitle, AND four feature-list bullet
 * points + "Preparing your personalized experience..." subtext —
 * marketing copy for features the user was about to start using
 * anyway. Eight seconds of "Start new conversations · Join group
 * discussions · Get instant notifications · Secure, private messaging"
 * every time they clicked into /messages reads as condescending.
 *
 * Strip to a clean title + spinner. Faster to scan, honest about what
 * the page is doing (loading), and no feature ads.
 */
export function ContextualLoader({ className, pathname: propPathname }: ContextualLoaderProps) {
  const hookPathname = usePathname();
  const pathname = propPathname || hookPathname || '/';
  const content = getContextualContent(pathname);
  const IconComponent = content.icon;

  return (
    <div className={cn('flex items-center justify-center min-h-[400px] p-8', className)}>
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="oc-icon-tile h-12 w-12">
          <IconComponent className={cn('w-6 h-6', content.color)} aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-medium text-foreground">{content.title}</h2>
          <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
            Loading…
          </p>
        </div>
      </div>
    </div>
  );
}
