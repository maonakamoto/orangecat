'use client';

import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import { logger } from '@/utils/logger';
import { ROUTES } from '@/config/routes';

export { useRequireAuth, useRedirectIfAuthenticated } from './useAuthRedirects';
import { useHydrationCeiling } from './useAuthRedirects';

function useThrottledLog(logFn: () => void, delay: number = 10000) {
  const lastLogTime = useRef(0);
  const logFnRef = useRef(logFn);
  logFnRef.current = logFn;

  return useCallback(() => {
    const now = Date.now();
    if (now - lastLogTime.current >= delay) {
      logFnRef.current();
      lastLogTime.current = now;
    }
  }, [delay]);
}

export function useAuth() {
  const authState = useAuthStore();
  const [_isConsistent, setIsConsistent] = useState(true);
  const router = useRouter();
  const lastLoggedState = useRef<string>('');

  const throttledLog = useThrottledLog(() => {
    if (process.env.NODE_ENV === 'development') {
      const stateSignature = `${!!authState.user}-${!!authState.session}-${!!authState.profile}-${authState.isLoading}-${authState.hydrated}-${_isConsistent}`;

      if (stateSignature !== lastLoggedState.current) {
        const isSignificantChange =
          authState.hydrated &&
          (!authState.isLoading || !_isConsistent || (authState.user && authState.session));

        if (isSignificantChange) {
          logger.debug('Significant auth state change', {
            hasUser: !!authState.user,
            hasSession: !!authState.session,
            hasProfile: !!authState.profile,
            isLoading: authState.isLoading,
            hydrated: authState.hydrated,
            isConsistent: _isConsistent,
            stateChange: lastLoggedState.current
              ? `${lastLoggedState.current} → ${stateSignature}`
              : 'initial',
            timestamp: new Date().toISOString(),
          });
          lastLoggedState.current = stateSignature;
        }
      }
    }
  }, 10000);

  useEffect(() => {
    if (authState.hydrated && !authState.isLoading) {
      const hasInconsistentState =
        (authState.user && !authState.session) || (!authState.user && authState.session);

      if (hasInconsistentState) {
        const timeoutId = setTimeout(() => {
          const currentState = useAuthStore.getState();
          const stillInconsistent =
            (currentState.user && !currentState.session) ||
            (!currentState.user && currentState.session);

          if (stillInconsistent && currentState.hydrated && !currentState.isLoading) {
            setIsConsistent(false);
          } else {
            setIsConsistent(true);
          }
        }, 2000);

        return () => clearTimeout(timeoutId);
      } else {
        setIsConsistent(true);
        return undefined;
      }
    }
    return undefined;
  }, [authState.user, authState.session, authState.hydrated, authState.isLoading]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && authState.hydrated) {
      const shouldLog =
        !authState.isLoading &&
        (!_isConsistent || (authState.user && authState.session && authState.profile));

      if (shouldLog) {
        throttledLog();
      }
    }
  }, [
    authState.user,
    authState.session,
    authState.profile,
    authState.isLoading,
    authState.hydrated,
    _isConsistent,
    throttledLog,
  ]);

  const fixInconsistentState = async () => {
    if (!authState.hydrated || authState.isLoading) {
      return;
    }

    logger.warn('Manually fixing inconsistent auth state', {}, 'Auth');

    try {
      await authState.signOut();

      const currentPath = window.location.pathname;
      if (
        currentPath.startsWith(ROUTES.DASHBOARD.HOME) ||
        currentPath.startsWith('/profile') ||
        currentPath.startsWith('/settings')
      ) {
        router.push(ROUTES.AUTH);
      }
    } catch (error) {
      logger.error(
        'Error during auth state fix',
        { error: error instanceof Error ? error.message : String(error) },
        'Auth'
      );
    }
  };

  const isAuthenticated = authState.hydrated && !authState.isLoading && !!authState.user;

  // Honor the same 4s hydration ceiling as useRequireAuth so pages that gate on
  // `!hydrated` via useAuth (EntityForm, dashboard/people, …) fall through to
  // their fallback instead of pinning a spinner forever when hydration never
  // resolves. `isAuthenticated` stays on raw `hydrated` — a timed-out gate is
  // "resolved enough to render", not "confirmed authenticated".
  const hydrationTimedOut = useHydrationCeiling(authState.hydrated, authState.isLoading);
  const effectiveHydrated = authState.hydrated || hydrationTimedOut;

  return {
    ...authState,
    hydrated: effectiveHydrated,
    hydrationTimedOut,
    isAuthenticated,
    isConsistent: _isConsistent,
    fixInconsistentState,
  };
}
