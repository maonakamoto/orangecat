'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import type { Profile } from '@/types/database';
import { executeSaveStepData } from './profileCompletionSaveStep';

export interface StepConfig {
  id: string;
  title: string;
  subtitle: string;
  required: boolean;
}

export const STEPS: StepConfig[] = [
  {
    id: 'identity',
    title: "Let's get to know you",
    subtitle: 'Your Cat needs a name to call you by.',
    required: true,
  },
  {
    id: 'about',
    title: 'Tell the world a bit more',
    subtitle: 'Optional, but it helps your Cat represent you better.',
    required: false,
  },
  {
    id: 'getstarted',
    title: 'Nice! Your Cat now knows who you are.',
    subtitle: "Here's what you can do next.",
    required: false,
  },
];

export const TOTAL_STEPS = STEPS.length;

export function useProfileCompletionForm(profile: Profile, onComplete: () => void) {
  const router = useRouter();
  const updateProfile = useAuthStore(state => state.updateProfile);

  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [username, setUsername] = useState(profile.username || '');
  const [displayName, setDisplayName] = useState(
    profile.name && profile.name !== 'User' ? profile.name : ''
  );
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [locationCity, setLocationCity] = useState(profile.location_city || '');
  const [website, setWebsite] = useState(profile.website || '');

  const step = STEPS[currentStep];
  const isLastStep = currentStep === TOTAL_STEPS - 1;

  const validateIdentity = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    if (!username || username.trim().length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(username.trim())) {
      newErrors.username = 'Only letters, numbers, underscores, and hyphens';
    } else if (username.trim().length > 30) {
      newErrors.username = 'Username must be 30 characters or fewer';
    }
    if (!displayName || displayName.trim().length === 0) {
      newErrors.displayName = 'Your Cat needs something to call you';
    } else if (displayName.trim().length > 100) {
      newErrors.displayName = 'Display name must be 100 characters or fewer';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [username, displayName]);

  const saveStepData = useCallback(
    async () =>
      executeSaveStepData({
        currentStep,
        username,
        displayName,
        avatarUrl,
        bio,
        locationCity,
        website,
        setSaving,
        setErrors,
        updateProfile,
      }),
    [currentStep, username, displayName, avatarUrl, bio, locationCity, website, updateProfile]
  );

  const handleNext = useCallback(async () => {
    if (currentStep === 0 && !validateIdentity()) {
      return;
    }
    const saved = await saveStepData();
    if (saved) {
      setCurrentStep(prev => Math.min(prev + 1, TOTAL_STEPS - 1));
    }
  }, [currentStep, validateIdentity, saveStepData]);

  const handlePrevious = useCallback(() => {
    setErrors({});
    setCurrentStep(prev => Math.max(prev - 1, 0));
  }, []);

  const handleSkipStep = useCallback(() => {
    setErrors({});
    setCurrentStep(prev => Math.min(prev + 1, TOTAL_STEPS - 1));
  }, []);

  const handleQuickAction = useCallback(
    (href: string) => {
      onComplete();
      router.push(href);
    },
    [onComplete, router]
  );

  const setUsernameField = useCallback(
    (value: string) => {
      setUsername(value);
      if (errors.username) {
        setErrors(prev => ({ ...prev, username: '' }));
      }
    },
    [errors.username]
  );

  const setDisplayNameField = useCallback(
    (value: string) => {
      setDisplayName(value);
      if (errors.displayName) {
        setErrors(prev => ({ ...prev, displayName: '' }));
      }
    },
    [errors.displayName]
  );

  return {
    currentStep,
    step,
    isLastStep,
    saving,
    errors,
    username,
    displayName,
    avatarUrl,
    bio,
    locationCity,
    website,
    setUsername: setUsernameField,
    setDisplayName: setDisplayNameField,
    setAvatarUrl,
    setBio,
    setLocationCity,
    setWebsite,
    handleNext,
    handlePrevious,
    handleSkipStep,
    handleComplete: onComplete,
    handleQuickAction,
  };
}
