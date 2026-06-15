/**
 * WELCOME STEP COMPONENT
 * First step of onboarding - introduction and benefits
 */

import { Bot, CheckCircle, Lightbulb } from 'lucide-react';
import { aiOnboardingContent } from '@/lib/ai-guidance';

export function WelcomeStep() {
  return (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 bg-surface-raised rounded-full flex items-center justify-center mx-auto">
        <Bot className="w-10 h-10 text-fg-primary" />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">{aiOnboardingContent.welcome.whyTitle}</h3>
        <p className="text-fg-secondary">{aiOnboardingContent.welcome.whyContent}</p>
      </div>

      {/* Benefits */}
      <div className="grid grid-cols-2 gap-4 text-left">
        {aiOnboardingContent.welcome.tips?.map((tip, index) => (
          <div key={index} className="flex items-start gap-2 p-3 bg-surface-raised rounded-lg">
            <CheckCircle className="w-5 h-5 text-fg-primary mt-0.5 flex-shrink-0" />
            <span className="text-sm text-fg-primary">{tip}</span>
          </div>
        ))}
      </div>

      {/* Pro Tip */}
      <div className="bg-surface-raised/40 border border-subtle rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-fg-primary mt-0.5 flex-shrink-0" />
          <div className="text-left">
            <h4 className="font-semibold text-fg-primary mb-1">Pro Tip</h4>
            <p className="text-fg-primary text-sm">
              We recommend OpenRouter for beginners - one key gives you access to 100+ AI models
              with simple, prepaid billing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
