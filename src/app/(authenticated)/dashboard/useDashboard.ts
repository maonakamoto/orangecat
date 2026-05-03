'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRequireAuth } from '@/hooks/useAuth';
import { useProjectStore } from '@/stores/projectStore';
import { useTimelineEvents } from '@/hooks/useTimelineEvents';
import { logger } from '@/utils/logger';
import { toast } from 'sonner';
import { PLATFORM_DEFAULT_CURRENCY } from '@/config/currencies';
import { usePendingActions } from '@/components/ai-chat/PendingActionsCard';
import { useDashboardTimeline } from './useDashboardTimeline';
import { useDashboardModals } from './useDashboardModals';

export function useDashboard() {
  const { user, profile, isLoading, hydrated } = useRequireAuth();
  const { projects, drafts, loadProjects, getStats } = useProjectStore();
  useTimelineEvents();
  const { getPendingActions, confirmAction, rejectAction } = usePendingActions();

  const [localLoading, setLocalLoading] = useState(true);
  const [pendingActions, setPendingActions] = useState<
    Awaited<ReturnType<typeof getPendingActions>>
  >([]);

  const { timelineFeed, timelineLoading, timelineError, reloadTimeline } = useDashboardTimeline({
    userId: user?.id,
    hydrated,
  });

  const { showWelcome, showProfileCompletion, handleProfileCompletionDone, dismissWelcome } =
    useDashboardModals({
      profile,
      hydrated,
      localLoading,
      userId: user?.id,
      userEmail: user?.email,
    });

  useEffect(() => {
    if (hydrated) {
      setLocalLoading(false);
    }
  }, [hydrated]);

  useEffect(() => {
    if (user?.id && hydrated) {
      getPendingActions()
        .then(actions => setPendingActions(actions))
        .catch(error => logger.error('Failed to load pending actions', { error }, 'Dashboard'));
    }
  }, [user?.id, hydrated, getPendingActions]);

  useEffect(() => {
    if (user?.id && hydrated) {
      loadProjects(user.id)
        .then(() => {
          const currentProjects = useProjectStore.getState().projects;
          logger.debug(
            'Projects loaded',
            { userId: user.id, projectCount: currentProjects.length },
            'Dashboard'
          );
        })
        .catch(error => {
          logger.error('Failed to load projects', { error, userId: user.id }, 'Dashboard');
          toast.error('Failed to load your projects. Please refresh the page.');
        });
    }
  }, [user?.id, hydrated, loadProjects]);

  useEffect(() => {
    const handleFocus = () => {
      if (user?.id && hydrated) {
        loadProjects(user.id).catch(error =>
          logger.error('Failed to reload projects on focus', { error }, 'Dashboard')
        );
        reloadTimeline();
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user?.id, hydrated, loadProjects, reloadTimeline]);

  const handleConfirmAction = useCallback(
    async (actionId: string) => {
      const displayMessage = await confirmAction(actionId);
      setPendingActions(prev => prev.filter(a => a.id !== actionId));
      return displayMessage;
    },
    [confirmAction]
  );

  const handleRejectAction = useCallback(
    async (actionId: string) => {
      await rejectAction(actionId);
      setPendingActions(prev => prev.filter(a => a.id !== actionId));
    },
    [rejectAction]
  );

  const safeProjects = useMemo(() => (Array.isArray(projects) ? projects : []), [projects]);
  const safeDrafts = useMemo(() => (Array.isArray(drafts) ? drafts : []), [drafts]);
  const stats = useMemo(() => getStats(), [getStats]);
  const totalDrafts = safeDrafts.length;

  const fundingByCurrency = useMemo(
    () =>
      safeProjects.reduce(
        (acc, project) => {
          const currency = project.currency || PLATFORM_DEFAULT_CURRENCY;
          acc[currency] = (acc[currency] || 0) + (project.total_funding || 0);
          return acc;
        },
        {} as Record<string, number>
      ),
    [safeProjects]
  );

  const primaryCurrency = useMemo(
    () =>
      fundingByCurrency['CHF'] !== undefined
        ? 'CHF'
        : fundingByCurrency['BTC'] !== undefined
          ? 'BTC'
          : 'CHF',
    [fundingByCurrency]
  );

  const totalRaised = useMemo(
    () => fundingByCurrency[primaryCurrency] || 0,
    [fundingByCurrency, primaryCurrency]
  );
  const totalSupporters = useMemo(
    () => safeProjects.reduce((sum, c) => sum + (c.contributor_count || 0), 0),
    [safeProjects]
  );

  return {
    user,
    profile,
    isLoading,
    hydrated,
    localLoading,
    timelineFeed,
    timelineLoading,
    timelineError,
    showWelcome,
    showProfileCompletion,
    pendingActions,
    safeProjects,
    totalProjects: stats.totalProjects,
    totalDrafts,
    hasProjects: safeProjects.length > 0,
    sidebarStats: {
      totalProjects: stats.totalProjects,
      totalRaised,
      totalSupporters,
      primaryCurrency,
    },
    reloadTimeline,
    handleProfileCompletionDone,
    dismissWelcome,
    handleConfirmAction,
    handleRejectAction,
  };
}
