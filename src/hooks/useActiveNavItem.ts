'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import type { NavSection } from './useNavigation';
import { ROUTES } from '@/config/routes';

interface UseActiveNavItemReturn {
  activeSection: string | null;
  activeItem: string | null;
  isItemActive: (href: string) => boolean;
}

export function useActiveNavItem(sections: NavSection[]): UseActiveNavItemReturn {
  const pathname = usePathname();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<string | null>(null);

  useEffect(() => {
    if (!pathname) {
      return;
    }

    let foundSection: string | null = null;
    let foundItem: string | null = null;

    outer: for (const section of sections) {
      for (const item of section.items) {
        if (pathname === item.href) {
          foundSection = section.id;
          foundItem = item.href ?? null;
          break outer;
        }
        if (
          item.href === ROUTES.DASHBOARD.HOME &&
          (pathname === ROUTES.DASHBOARD.HOME || pathname.startsWith(ROUTES.DASHBOARD.HOME + '/'))
        ) {
          foundSection = section.id;
          foundItem = item.href ?? null;
          break outer;
        }
        if (
          item.href !== ROUTES.DASHBOARD.HOME &&
          (pathname.startsWith(`${item.href}/`) || pathname === item.href)
        ) {
          foundSection = section.id;
          foundItem = item.href ?? null;
          break outer;
        }
      }
    }

    setActiveSection(foundSection);
    setActiveItem(foundItem);
  }, [pathname, sections]);

  const isItemActive = useCallback(
    (href: string) => {
      if (!pathname || !href) {
        return false;
      }
      if (pathname === href) {
        return true;
      }
      if (href === ROUTES.DASHBOARD.HOME) {
        return pathname === ROUTES.DASHBOARD.HOME;
      }
      return pathname.startsWith(`${href}/`) || pathname === href;
    },
    [pathname]
  );

  return { activeSection, activeItem, isItemActive };
}
