import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ProfileService } from '@/services/profile';
import { onboardingEvents } from '@/lib/analytics';
import { ROUTES } from '@/config/routes';
import { logger } from '@/utils/logger';
import { ONBOARDING_STORAGE_KEY, PROGRESS_EXPIRATION_HOURS, ONBOARDING_METHOD } from '../constants';
import type {
  OnboardingProgress,
  OnboardingStep,
  OnboardingState,
  OnboardingActions,
} from '../types';

function loadProgress(): OnboardingProgress | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const saved = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (saved) {
      const progress = JSON.parse(saved) as OnboardingProgress;
      const lastUpdated = new Date(progress.lastUpdated);
      const hoursSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60);
      if (hoursSinceUpdate < PROGRESS_EXPIRATION_HOURS) {
        return progress;
      }
    }
  } catch (error) {
    logger.error('Failed to load onboarding progress', error, 'Onboarding');
  }
  return null;
}

function saveProgress(currentStep: number, completedSteps: Set<number>): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const progress: OnboardingProgress = {
      currentStep,
      completedSteps: Array.from(completedSteps),
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(progress));
  } catch (error) {
    logger.error('Failed to save onboarding progress', error, 'Onboarding');
  }
}

function clearProgress(): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
  } catch (error) {
    logger.error('Failed to clear onboarding progress', error, 'Onboarding');
  }
}

export function useOnboardingProgress(
  steps: OnboardingStep[],
  userId?: string
): OnboardingState & OnboardingActions {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [completingOnboarding, setCompletingOnboarding] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const savedProgress = loadProgress();
    if (savedProgress) {
      setCurrentStep(savedProgress.currentStep);
      setCompletedSteps(new Set(savedProgress.completedSteps));
    }
    setIsInitialized(true);
    onboardingEvents.started(userId);
  }, [userId]);

  useEffect(() => {
    if (isInitialized) {
      saveProgress(currentStep, completedSteps);
    }
  }, [currentStep, completedSteps, isInitialized]);

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      onboardingEvents.stepCompleted(currentStep, steps[currentStep].id, userId);
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      setCurrentStep(currentStep + 1);
      onboardingEvents.stepViewed(currentStep + 1, steps[currentStep + 1].id, userId);
    }
  }, [currentStep, steps, userId]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleSkip = useCallback(async () => {
    onboardingEvents.skipped(currentStep, userId);
    clearProgress();
    if (userId) {
      try {
        await ProfileService.fallbackProfileUpdate(userId, {
          onboarding_completed: true,
          onboarding_method: ONBOARDING_METHOD.SKIPPED,
        });
      } catch (error) {
        logger.error('Failed to mark onboarding as skipped', error, 'Onboarding');
      }
    }
    router.push(`${ROUTES.DASHBOARD.CAT}?welcome=true`);
  }, [currentStep, userId, router]);

  const handleAction = useCallback(
    async (href: string) => {
      onboardingEvents.stepCompleted(currentStep, steps[currentStep].id, userId);
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      clearProgress();
      if (userId) {
        try {
          await ProfileService.fallbackProfileUpdate(userId, {
            onboarding_completed: true,
            onboarding_method: ONBOARDING_METHOD.STANDARD,
          });
          onboardingEvents.completed(userId);
        } catch (error) {
          logger.error('Failed to mark onboarding complete on navigate-away', error, 'Onboarding');
        }
      }
      router.push(href);
    },
    [currentStep, steps, userId, router]
  );

  const handleCompleteOnboarding = useCallback(async () => {
    clearProgress();
    if (!userId) {
      router.push(`${ROUTES.DASHBOARD.CAT}?welcome=true`);
      return;
    }
    setCompletingOnboarding(true);
    try {
      await ProfileService.fallbackProfileUpdate(userId, {
        onboarding_completed: true,
        onboarding_method: ONBOARDING_METHOD.STANDARD,
      });
      onboardingEvents.completed(userId);
      toast.success('Welcome to OrangeCat! Your journey begins now.');
      router.push(`${ROUTES.DASHBOARD.CAT}?welcome=true`);
    } catch (error) {
      logger.error('Failed to complete onboarding', error, 'Onboarding');
      onboardingEvents.completed(userId);
      toast.error('Something went wrong, but you can continue to your dashboard.');
      router.push(`${ROUTES.DASHBOARD.CAT}?welcome=true`);
    } finally {
      setCompletingOnboarding(false);
    }
  }, [userId, router]);

  return {
    currentStep,
    completedSteps,
    completingOnboarding,
    isInitialized,
    handleNext,
    handlePrevious,
    handleSkip,
    handleAction,
    handleCompleteOnboarding,
    setCurrentStep,
  };
}
