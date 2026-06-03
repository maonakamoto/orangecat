'use client';

import { useAuthStore } from '@/stores/auth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { isAuthenticatedRoute, getRouteContext, ROUTES } from '@/config/routes';

/**
 * Hydration ceiling. If the auth store hasn't resolved after this long,
 * every consumer of useRequireAuth is freed from the loading state so
 * pages can render a real "sign in" CTA instead of a perpetual spinner.
 * Real auth resolves in <300ms; anything past 2-3s is a sign of a
 * broken hydration path (cookie domain mismatch — orangecat.ch vs
 * www.orangecat.ch — blocked storage, third-party script blocking the
 * Supabase client init, …).
 *
 * This used to live as a local timeout in /settings/integrations only;
 * generalized 2026-06-03 so every auth-gated page (settings root,
 * /settings/ai, /settings/ai/onboarding, dashboard subpages, etc.)
 * benefits without each one re-implementing the timeout.
 */
const HYDRATION_TIMEOUT_MS = 4_000;

export function useRequireAuth() {
  const { user, session, profile, isLoading, hydrated } = useAuthStore();
  const [_isConsistent, setIsConsistent] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [hydrationTimedOut, setHydrationTimedOut] = useState(false);

  // Start the hydration ceiling timer the moment we mount. If hydration
  // resolves first the timer is cancelled cleanly; otherwise the
  // consumer falls through to the !user branch and renders a sign-in CTA.
  useEffect(() => {
    if (hydrated && !isLoading) {
      return undefined;
    }
    const timer = setTimeout(() => setHydrationTimedOut(true), HYDRATION_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [hydrated, isLoading]);

  useEffect(() => {
    if (hydrated && !isLoading) {
      const hasInconsistentState = (user && !session) || (!user && session);

      if (hasInconsistentState) {
        const timeoutId = setTimeout(() => {
          setIsConsistent(false);
        }, 2000);
        return () => clearTimeout(timeoutId);
      } else {
        setIsConsistent(true);
        return undefined;
      }
    }
    return undefined;
  }, [user, session, isLoading, hydrated]);

  useEffect(() => {
    if ((!hydrated || isLoading) && !hydrationTimedOut) {
      return;
    }

    const isAuthenticated = !!user;

    if (!isAuthenticated) {
      // Preserve the original destination so post-login we send the user
      // back where they were trying to go. Without this, signing in from
      // /dashboard/projects lands on /dashboard regardless.
      const from = pathname && pathname !== '/' ? pathname : null;
      const redirectUrl = from
        ? `${ROUTES.AUTH}?mode=login&from=${encodeURIComponent(from)}`
        : `${ROUTES.AUTH}?mode=login`;
      router.push(redirectUrl);
    }

    setCheckedAuth(true);
  }, [user, isLoading, hydrated, router, pathname, hydrationTimedOut]);

  // isLoading stays true while hydration is in flight AND the ceiling
  // hasn't fired yet. Once timed out, isLoading flips false so pages
  // render their fallback state instead of pinning a spinner forever.
  const effectiveIsLoading = (isLoading || !hydrated || !checkedAuth) && !hydrationTimedOut;

  return {
    user,
    profile,
    session,
    isLoading: effectiveIsLoading,
    hydrated,
    /** True when the 4s hydration ceiling fired before auth resolved.
     * Pages can branch on this to show "auth seems stuck — sign in" UX. */
    hydrationTimedOut,
    isAuthenticated: !!user && hydrated && !isLoading,
  };
}

export function useRedirectIfAuthenticated() {
  const { user, session, isLoading, hydrated, profile } = useAuthStore();
  const [_isConsistent, setIsConsistent] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (hydrated && !isLoading) {
      const hasInconsistentState = (user && !session) || (!user && session);

      if (hasInconsistentState) {
        const timeoutId = setTimeout(() => {
          setIsConsistent(false);
        }, 2000);
        return () => clearTimeout(timeoutId);
      } else {
        setIsConsistent(true);
        return undefined;
      }
    }
    return undefined;
  }, [user, session, isLoading, hydrated]);

  useEffect(() => {
    if (!hydrated || isLoading) {
      return;
    }

    const isAuthenticated = !!user;

    if (
      isAuthenticated &&
      pathname &&
      pathname !== '/' &&
      !isAuthenticatedRoute(pathname) &&
      getRouteContext(pathname) !== 'public' &&
      getRouteContext(pathname) !== 'universal'
    ) {
      router.push(ROUTES.DASHBOARD.HOME);
    }
  }, [user, session, isLoading, hydrated, router, pathname, profile]);

  return {
    isLoading: isLoading || !hydrated,
    hydrated,
    isAuthenticated: !!user && hydrated && !isLoading,
  };
}
