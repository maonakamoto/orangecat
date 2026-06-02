/**
 * WELCOME STEP COMPONENT
 * First step of the onboarding flow introducing OrangeCat.
 *
 * Cat-first design: primary CTA is "Tell Cat what you need".
 * The manual entity creation flow remains available for users who know exactly what they want.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Cat, ArrowRight, Loader2 } from 'lucide-react';
import { ROUTES } from '@/config/routes';
import { useOnboardingContext } from '../context';

export function WelcomeStep() {
  const router = useRouter();
  const { onContinueStep } = useOnboardingContext();
  const [navigating, setNavigating] = useState(false);

  const handleCatClick = () => {
    if (navigating) {
      return;
    }
    setNavigating(true);
    router.push(ROUTES.ONBOARDING.INTELLIGENT);
  };

  return (
    <div className="space-y-4">
      <button
        onClick={handleCatClick}
        disabled={navigating}
        className="w-full text-left disabled:opacity-75"
      >
        <div className="flex items-center gap-4 rounded-md border border-border-strong bg-muted p-4 transition-colors hover:bg-muted/80">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md bg-background">
            <Cat className="h-5 w-5 text-foreground" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground">Tell Cat what you need</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Describe what you want to do. Cat will suggest the right setup.
            </p>
          </div>
          {navigating ? (
            <Loader2 className="h-5 w-5 flex-shrink-0 animate-spin text-muted-foreground" />
          ) : (
            <ArrowRight className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
          )}
        </div>
      </button>

      <p className="px-1 text-center text-xs text-muted-foreground">
        Prefer manual setup?{' '}
        <button
          type="button"
          onClick={onContinueStep}
          className="rounded-sm underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        >
          Continue to choose a project, service, product, group, or finance option yourself.
        </button>
      </p>
    </div>
  );
}
