/**
 * ONBOARDING HEADER COMPONENT
 * Header with title and progress bar.
 *
 * Skip-setup is intentionally demoted to a quiet text link below the progress
 * bar rather than a button next to the step counter. The button-at-equal-weight
 * placement was tempting new users to bail before understanding the offer.
 */

import { useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { BrandMarkIcon } from '@/components/shell/BrandMarkIcon';

interface OnboardingHeaderProps {
  currentStep: number;
  totalSteps: number;
  progress: number;
  onSkip: () => Promise<void>;
}

export function OnboardingHeader({
  currentStep,
  totalSteps,
  progress,
  onSkip,
}: OnboardingHeaderProps) {
  const [skipping, setSkipping] = useState(false);

  const handleSkip = async () => {
    setSkipping(true);
    await onSkip();
  };

  return (
    <>
      {/* Header */}
      <div className="text-center mb-6 sm:mb-8">
        <div className="mb-3 flex justify-center">
          <div className="ui-brand-mark ui-brand-mark-default text-foreground">
            <BrandMarkIcon size={26} />
          </div>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Welcome to OrangeCat</h1>
        <p className="text-sm sm:text-base text-muted-foreground px-2">
          Let&apos;s get you set up to receive Bitcoin funding for your projects.
        </p>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <div className="mb-3">
          <span className="text-sm font-medium">
            Step {currentStep + 1} of {totalSteps}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="mt-3 text-right">
          <button
            type="button"
            onClick={handleSkip}
            disabled={skipping}
            className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50"
          >
            {skipping ? 'Redirecting…' : 'Skip setup'}
          </button>
        </div>
      </div>
    </>
  );
}
