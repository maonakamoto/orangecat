'use client';

import dynamic from 'next/dynamic';
import Loading from '@/components/Loading';
import { cn } from '@/lib/utils';
import { GRADIENTS } from '@/config/gradients';
import { ProfileCompletionModal } from '@/components/onboarding/ProfileCompletionModal';
import {
  DashboardHeader,
  DashboardInviteCTA,
  DashboardJourney,
  DashboardQuickActions,
  DashboardProjects,
} from '@/components/dashboard/sections';
import { MobileDashboardSidebar } from '@/components/dashboard/MobileDashboardSidebar';
import { PendingActionsCard } from '@/components/ai-chat/PendingActionsCard';
import { useDashboard } from './useDashboard';

const DashboardTimeline = dynamic(
  () => import('@/components/dashboard/DashboardTimeline').then(mod => mod.DashboardTimeline),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-24 bg-gray-200 rounded"></div>
          <div className="h-24 bg-gray-200 rounded"></div>
        </div>
      </div>
    ),
  }
);

export default function DashboardPage() {
  const {
    user,
    profile,
    isLoading,
    hydrated,
    localLoading,
    timelineFeed,
    timelineLoading,
    timelineError,
    showProfileCompletion,
    pendingActions,
    safeProjects,
    totalProjects,
    totalDrafts,
    hasProjects,
    sidebarStats,
    reloadTimeline,
    handleProfileCompletionDone,
    handleConfirmAction,
    handleRejectAction,
  } = useDashboard();

  if (!hydrated || localLoading) {
    return <Loading fullScreen message="Loading your account..." />;
  }

  if (!user && !isLoading) {
    return <Loading fullScreen message="Redirecting to login..." />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className={cn(GRADIENTS.pageBg, 'min-h-screen')}>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 pb-20 sm:pb-8">
        <DashboardHeader
          profile={profile}
          totalProjects={totalProjects}
          totalDrafts={totalDrafts}
        />

        {pendingActions.length > 0 && (
          <div className="space-y-3">
            {pendingActions.map(action => (
              <PendingActionsCard
                key={action.id}
                action={action}
                onConfirm={handleConfirmAction}
                onReject={handleRejectAction}
              />
            ))}
          </div>
        )}

        <DashboardJourney />

        <div className="space-y-4 sm:space-y-6">
          <div className="block lg:hidden">
            <MobileDashboardSidebar stats={sidebarStats} />
          </div>
          <div className="space-y-6">
            <DashboardTimeline
              timelineFeed={timelineFeed}
              isLoading={timelineLoading}
              error={timelineError}
              onRefresh={reloadTimeline}
              onPostSuccess={reloadTimeline}
              userId={user?.id}
            />
            <DashboardProjects projects={safeProjects} />
          </div>
        </div>

        <div className={hasProjects ? 'grid grid-cols-1 md:grid-cols-2 gap-6' : ''}>
          <DashboardInviteCTA profile={profile} userId={user.id} />
          {hasProjects && <DashboardQuickActions />}
        </div>
      </div>

      {profile && showProfileCompletion && (
        <ProfileCompletionModal
          open={showProfileCompletion}
          onComplete={handleProfileCompletionDone}
          profile={profile}
          userId={user.id}
        />
      )}
    </div>
  );
}
