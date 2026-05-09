'use client';

import { useCallback, useEffect, useState } from 'react';
import { isProfileIncomplete } from '@/components/onboarding/ProfileCompletionModal';
import type { Profile } from '@/types/database';

interface UseDashboardModalsOptions {
  profile: Profile | null;
  hydrated: boolean;
  localLoading: boolean;
  userId: string | undefined;
  userEmail: string | undefined;
}

export function useDashboardModals({
  profile,
  hydrated,
  localLoading,
  userId,
  userEmail,
}: UseDashboardModalsOptions) {
  const [showProfileCompletion, setShowProfileCompletion] = useState(false);

  useEffect(() => {
    if (!profile || !hydrated || localLoading || !userId) {
      return;
    }
    const completionKey = `orangecat-profile-completed-${userId}`;
    const hasCompletedProfile = localStorage.getItem(completionKey) === 'true';
    if (!hasCompletedProfile && isProfileIncomplete(profile, userEmail)) {
      setShowProfileCompletion(true);
    }
  }, [profile, hydrated, localLoading, userId, userEmail]);

  const handleProfileCompletionDone = useCallback(() => {
    setShowProfileCompletion(false);
    if (userId) {
      localStorage.setItem(`orangecat-profile-completed-${userId}`, 'true');
    }
  }, [userId]);

  return { showProfileCompletion, handleProfileCompletionDone };
}
