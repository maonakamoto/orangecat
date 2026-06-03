'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Plus, User, Compass, BookOpen, Cat } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useBottomNavScroll } from '@/hooks/useHeaderScroll';
import { useComposer } from '@/contexts/ComposerContext';
import { cn } from '@/lib/utils';
import { getRouteChrome, getRouteSurface, ROUTES } from '@/config/routes';
import { getContextualCreateAction } from '@/lib/navigation/contextual-create';
import { isNavHrefActive } from '@/lib/navigation/isActive';
import { MobileCreateSheet } from '@/components/create/MobileCreateSheet';
import { Z_INDEX } from '@/constants/z-index';

const MobileBottomNav = React.memo(function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, hydrated } = useAuth();
  const { shouldBeTransparent, shouldBeSmall } = useBottomNavScroll();
  const { openComposer } = useComposer();
  const [showCreateSheet, setShowCreateSheet] = useState(false);

  // Don't render until auth is hydrated to prevent layout shift
  if (!hydrated) {
    return null;
  }

  // Don't render if no pathname
  if (!pathname) {
    return null;
  }

  // SSOT: bottom nav appears wherever the desktop sidebar would (every
  // in-app surface). Mirrors AppShell's `isAppSurface` rule.
  if (getRouteSurface(pathname) !== 'app') {
    return null;
  }

  if (getRouteChrome(pathname).hideMobileBottomNav) {
    return null;
  }

  // Get contextual create action for the "+" button
  const createAction = getContextualCreateAction(pathname);

  // Authenticated users ALWAYS see the same 5 items for consistency
  // Non-authenticated users see simplified nav
  const isAuthenticated = !!user;

  // Active state uses isNavHrefActive — the same SSOT as sidebar +
  // desktop header nav, so a route is considered "active" identically
  // across all three chrome surfaces. Profile match is the one exception
  // (collapses /profile + /profiles into the same nav item).
  const isActive = (href: string) => isNavHrefActive(pathname, href);
  const isProfileActive = !!(pathname?.startsWith('/profile') || pathname?.startsWith('/profiles'));

  // Navigation items - consistent for authenticated users regardless of route
  const navItems = isAuthenticated
    ? [
        {
          icon: Cat,
          label: 'Cat',
          href: ROUTES.DASHBOARD.CAT,
          active: isActive(ROUTES.DASHBOARD.CAT),
        },
        {
          icon: Home,
          label: 'Dashboard',
          href: ROUTES.DASHBOARD.HOME,
          active:
            pathname === ROUTES.DASHBOARD.HOME ||
            (pathname?.startsWith(`${ROUTES.DASHBOARD.HOME}/`) ?? false),
        },
        {
          icon: Plus,
          label: createAction.label,
          href: createAction.href,
          active: false,
          primary: true,
          createAction, // Pass the action for the click handler
        },
        {
          icon: BookOpen,
          label: 'Timeline',
          href: ROUTES.TIMELINE,
          active: isActive(ROUTES.TIMELINE),
        },
        {
          icon: User,
          label: 'Profile',
          href: ROUTES.PROFILE.EDIT,
          active: isProfileActive,
        },
      ]
    : [
        { icon: Home, label: 'Home', href: ROUTES.HOME, active: pathname === ROUTES.HOME },
        {
          icon: Compass,
          label: 'Discover',
          href: ROUTES.DISCOVER,
          active: isActive(ROUTES.DISCOVER),
        },
        {
          icon: Plus,
          label: 'Create',
          href: ROUTES.PROJECTS.CREATE,
          active: isActive(ROUTES.PROJECTS.CREATE),
          primary: true,
        },
        { icon: User, label: 'Login', href: ROUTES.AUTH, active: isActive(ROUTES.AUTH) },
      ];

  // Handle click on primary "+" button
  const handlePrimaryClick = (item: (typeof navItems)[number]) => {
    if ('createAction' in item && item.createAction) {
      const action = item.createAction;
      if (action.type === 'post') {
        // Open composer for posts
        openComposer();
        router.push(`${ROUTES.TIMELINE}?compose=true`);
      } else if (action.type === 'entity') {
        // Navigate directly to entity creation
        router.push(action.href);
      } else if (action.type === 'menu') {
        // Show the create sheet with all options
        setShowCreateSheet(true);
      }
    } else {
      // Fallback for non-authenticated nav
      router.push(item.href);
    }
  };

  return (
    <>
      <div
        className={cn(
          'md:hidden fixed bottom-0 left-0 right-0 border-t',
          'transition-all duration-300 ease-in-out',
          shouldBeTransparent
            ? 'bg-background/20 backdrop-blur-sm border-transparent'
            : 'bg-background/95 backdrop-blur-md',
          isAuthenticated ? 'border-border shadow-sm' : 'border-border'
        )}
        style={{
          zIndex: Z_INDEX.MOBILE_BOTTOM_NAV,
          // SSOT for nav-vs-home-indicator clearance lives on this outer container.
          // Inner <nav> uses a fixed interior padding so we don't double up.
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          transform: shouldBeSmall ? 'scale(0.85) translateY(4px)' : 'scale(1) translateY(0)',
          opacity: shouldBeTransparent ? 0.7 : 1,
        }}
      >
        {/* Primary button spacer - creates space above nav for floating button */}
        <div
          className={cn('transition-all duration-300', shouldBeSmall ? 'h-1' : 'h-2')}
          aria-hidden="true"
        />

        <nav
          className={cn(
            'flex items-center justify-around transition-all duration-300 pb-2',
            shouldBeSmall ? 'px-1 py-1' : 'px-2 py-2'
          )}
          style={{
            minHeight: shouldBeSmall ? '48px' : '64px',
          }}
          role="navigation"
          aria-label="Mobile navigation"
        >
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = item.active;

            return (
              <button
                key={`${item.href}-${index}`}
                onClick={e => {
                  e.preventDefault();
                  if (item.primary) {
                    // Use contextual handler for primary "+" button
                    handlePrimaryClick(item);
                  } else {
                    router.push(item.href);
                  }
                }}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 rounded-lg',
                  'transition-all duration-200',
                  'touch-manipulation select-none',
                  '-webkit-tap-highlight-color-transparent',
                  'active:scale-95 active:bg-muted dark:active:bg-muted',
                  isActive && 'text-foreground',
                  !isActive && 'text-muted-foreground',
                  item.primary && 'relative',
                  shouldBeSmall ? 'min-h-12 gap-0.5' : 'min-h-14 gap-1'
                )}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                type="button"
              >
                {item.primary ? (
                  <div
                    className={cn(
                      'absolute flex items-center justify-center rounded-full shadow-sm',
                      'transition-all duration-300 hover:scale-105 active:scale-95',
                      'bg-foreground'
                    )}
                    style={{
                      width: shouldBeSmall ? '48px' : '56px',
                      height: shouldBeSmall ? '48px' : '56px',
                      top: shouldBeSmall ? '-24px' : '-28px',
                    }}
                  >
                    <Icon
                      className={cn(
                        'text-background transition-all duration-300',
                        shouldBeSmall ? 'w-5 h-5' : 'w-6 h-6'
                      )}
                      strokeWidth={2}
                    />
                  </div>
                ) : (
                  <>
                    <Icon
                      className={cn(
                        'transition-all duration-300',
                        shouldBeSmall ? 'w-5 h-5' : 'w-6 h-6',
                        isActive && 'fill-current scale-110'
                      )}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                    <span
                      className={cn(
                        'font-medium transition-all duration-300 leading-tight',
                        shouldBeSmall ? 'text-2xs' : 'text-xs',
                        isActive && 'font-semibold'
                      )}
                    >
                      {item.label}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Mobile Create Sheet - shown when "+" triggers menu action */}
      <MobileCreateSheet isOpen={showCreateSheet} onClose={() => setShowCreateSheet(false)} />
    </>
  );
});

MobileBottomNav.displayName = 'MobileBottomNav';

export default MobileBottomNav;
