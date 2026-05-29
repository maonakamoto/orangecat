/**
 * Desktop Navigation Component
 *
 * Modular desktop navigation links for header.
 * Follows SOC principle - separate from Header component.
 *
 * Created: 2026-01-16
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { NavigationItem } from '@/config/navigation';
import { cn } from '@/lib/utils';
import { isNavHrefActive } from '@/lib/navigation/isActive';

interface DesktopNavigationProps {
  /** Navigation items to display */
  items: NavigationItem[];
}

/**
 * Desktop navigation links
 *
 * Displays navigation items with active state highlighting. Active-state
 * matching uses the same SSOT (`isNavHrefActive`) as the sidebar and
 * mobile bottom nav — adding a new chrome surface should never grow a
 * fourth implementation.
 */
export function DesktopNavigation({ items }: DesktopNavigationProps) {
  const pathname = usePathname();

  return (
    <div className="hidden md:flex items-center gap-1 xl:gap-2 ml-2">
      {items.map(item => (
        <Link
          key={item.name}
          href={item.href!}
          className={cn(
            'px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap',
            isNavHrefActive(pathname, item.href!)
              ? 'text-foreground bg-muted'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
        >
          {item.name}
        </Link>
      ))}
    </div>
  );
}
