'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
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
  const searchParams = useSearchParams();
  const [showWelcome, setShowWelcome] = useState(false);
  const [showProfileCompletion, setShowProfileCompletion] = useState(false);

  useEffect(() => {
    if (!profile || !hydrated || localLoading || !userId) {
      return;
    }
    const isWelcome = searchParams?.get('welcome') === 'true';
    const isEmailConfirmed = searchParams?.get('confirmed') === 'true';
    const welcomeKey = `orangecat-welcome-shown-${userId}`;
    const hasSeenWelcome = localStorage.getItem(welcomeKey) === 'true';
    const onboardingComplete = profile.onboarding_completed;
    if (
      !hasSeenWelcome &&
      (isWelcome || isEmailConfirmed || (onboardingComplete && !hasSeenWelcome))
    ) {
      setShowWelcome(true);
      if (isEmailConfirmed) {
        toast.success('Email confirmed! Welcome to OrangeCat 🎉', { duration: 5000 });
      }
    } else {
      setShowWelcome(false);
    }
  }, [profile, hydrated, localLoading, searchParams, userId]);

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

  const dismissWelcome = useCallback(() => {
    setShowWelcome(false);
    if (userId) {
      localStorage.setItem(`orangecat-welcome-shown-${userId}`, 'true');
    }
  }, [userId]);

  return { showWelcome, showProfileCompletion, handleProfileCompletionDone, dismissWelcome };
}
