'use client';

import { useAuthStore } from '@/stores/auth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { isAuthenticatedRoute, getRouteContext, ROUTES } from '@/config/routes';

export function useRequireAuth() {
  const { user, session, profile, isLoading, hydrated } = useAuthStore();
  const [_isConsistent, setIsConsistent] = useState(true);
  const router = useRouter();
  const _pathname = usePathname();
  const [checkedAuth, setCheckedAuth] = useState(false);

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

    if (!isAuthenticated) {
      router.push('/auth?from=protected');
    }

    setCheckedAuth(true);
  }, [user, isLoading, hydrated, router]);

  return {
    user,
    profile,
    session,
    isLoading: isLoading || !hydrated || !checkedAuth,
    hydrated,
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
