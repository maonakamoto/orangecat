'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Breadcrumb } from '@/components/ui/Breadcrumb';

/**
 * EntityListShell — canonical page-header wrapper for every in-app surface.
 *
 * Despite the legacy "Entity" name, this is the cockpit/x.ai-style page shell:
 * <h1> + subtitle + right-slot actions + optional breadcrumb, with the
 * spacing/typography rules every internal page should share. Use it for
 * dashboard, settings, profile, and any other signed-in destination so the
 * top of every page looks the same.
 *
 * Marketing landing pages (which have hero sections) intentionally stay
 * outside this convention — they have their own visual identity.
 */

interface EntityListShellProps {
  title: string;
  description?: string;
  headerActions?: ReactNode;
  /** Hide the auto-generated breadcrumb (defaults to `{ label: title }`). */
  hideBreadcrumb?: boolean;
  /** Custom breadcrumb trail. When omitted, defaults to `[{ label: title }]`. */
  breadcrumbs?: { label: string; href?: string }[];
  children: ReactNode;
  className?: string;
}

export default function EntityListShell({
  title,
  description,
  headerActions,
  hideBreadcrumb = false,
  breadcrumbs,
  children,
  className,
}: EntityListShellProps) {
  const crumbs = breadcrumbs ?? [{ label: title }];

  return (
    <div className={cn('oc-page pb-20 md:pb-8', className)}>
      <div className="oc-page-container oc-page-stack">
        {!hideBreadcrumb && <Breadcrumb items={crumbs} />}
        <div className="oc-page-header">
          <div className="flex-1 min-w-0">
            <h1 className="oc-page-title break-words">{title}</h1>
            {description && <p className="oc-page-subtitle break-words">{description}</p>}
          </div>
          {headerActions && (
            <div className="w-full flex-shrink-0 sm:w-auto">
              <div className="oc-page-actions">{headerActions}</div>
            </div>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
