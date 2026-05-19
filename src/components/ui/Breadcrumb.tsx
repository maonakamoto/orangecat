/**
 * Breadcrumb Navigation Component
 *
 * Shows the user where they are in the page hierarchy.
 * Uses entity-registry for consistent naming.
 */

import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { ROUTES } from '@/config/routes';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center gap-1.5 text-sm text-muted-foreground ${className}`}
    >
      <Link
        href={ROUTES.DASHBOARD.HOME}
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        <Home className="h-3.5 w-3.5" />
        <span className="sr-only sm:not-sr-only">Home</span>
      </Link>

      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <ChevronRight className="h-3.5 w-3.5 text-muted-dim dark:text-muted-foreground" />
          {item.href ? (
            <Link href={item.href} className="hover:text-foreground transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
