'use client';

/**
 * Intelligent Onboarding
 *
 * Collects a brief description from the user, marks onboarding complete,
 * then redirects to Cat with the description pre-loaded as the first
 * message. The Cat handles all intelligent analysis — no keyword heuristics.
 *
 * Created: 2026-01-22
 * Last Modified: 2026-04-24
 * Last Modified Summary: Replace fake keyword-analysis with Cat redirect
 */

import { useState } from 'react';
import { Cat, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { VoiceInputButton } from '@/components/ui/VoiceInputButton';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ProfileService } from '@/services/profile';
import { logger } from '@/utils/logger';
import { ROUTES } from '@/config/routes';
import { ONBOARDING_METHOD } from '@/config/onboarding';

const EXAMPLE_PROMPTS = [
  "I'm a freelance graphic designer looking to find clients and sell design templates",
  'I run a small community garden and want to raise funds for seeds and equipment',
  'I make handmade jewellery and want to start selling online',
  "I'm a musician who wants to fund an album and connect with fans",
  'I teach yoga and want to offer online classes and workshops',
  'My neighbourhood needs a community space — I want to fundraise and organise it',
];

export default function IntelligentOnboarding() {
  const router = useRouter();
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [isRedirecting, setIsRedirecting] = useState(false);

  const canSubmit = description.trim().length > 0 && displayName.trim().length > 0;

  const handleStartChat = async () => {
    if (!canSubmit) {
      return;
    }
    setIsRedirecting(true);

    // Persist what we collected so Cat has context next session and the
    // dashboard greeting can stop saying "User". Username auto-slugifies
    // from displayName at first save — no pseudonymity blocker.
    if (user?.id) {
      ProfileService.fallbackProfileUpdate(user.id, {
        onboarding_completed: true,
        onboarding_method: ONBOARDING_METHOD.INTELLIGENT,
        name: displayName.trim(),
        bio: description.trim(),
      }).catch(err => {
        logger.error(
          'Failed to mark intelligent onboarding complete',
          err,
          'IntelligentOnboarding'
        );
      });
    }

    // Send the user to Cat with their description as the first message
    const params = new URLSearchParams({ q: description.trim() });
    router.push(`${ROUTES.DASHBOARD.CAT}?${params.toString()}`);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-page p-4">
      <div className="w-full max-w-lg">
        {/* Back navigation */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-fg-secondary hover:text-fg-primary mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-md border border-subtle bg-surface-raised">
            <Cat className="h-8 w-8 text-fg-primary" />
          </div>
          <h1 className="text-2xl font-bold text-fg-primary mb-2">Tell Cat what you need</h1>
          <p className="text-fg-secondary">
            Describe what you are trying to do. Cat will suggest the right tools and help you get
            set up.
          </p>
        </div>

        {/* Input */}
        <div className="space-y-4 rounded-md border border-subtle bg-surface-page p-6">
          <Input
            data-testid="onboarding-display-name"
            label="What should Cat call you?"
            description="A name or alias — pseudonyms are fine."
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Satoshi"
            maxLength={100}
            required
          />

          <label className="block text-sm font-medium text-fg-primary">
            What are you here to do?
          </label>

          <div className="flex items-start gap-2">
            <Textarea
              data-testid="onboarding-description"
              placeholder="e.g. I'm a photographer looking to sell prints and offer portrait sessions…"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              className="w-full resize-none"
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  void handleStartChat();
                }
              }}
            />
            {process.env.NEXT_PUBLIC_FEATURE_VOICE_INPUT === 'true' && (
              <VoiceInputButton
                ariaLabel="Voice input"
                size="sm"
                onTranscript={t => setDescription(prev => (prev ? prev + ' ' : '') + t)}
              />
            )}
          </div>

          {/* Example prompts */}
          <div className="space-y-1">
            <p className="text-xs text-fg-tertiary font-medium uppercase tracking-wide">Examples</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_PROMPTS.map(prompt => (
                <button
                  key={prompt}
                  onClick={() => setDescription(prompt)}
                  className="rounded-sm border border-subtle px-3 py-1.5 text-left text-xs text-fg-secondary transition-colors hover:border-strong hover:bg-surface-raised hover:text-fg-primary"
                >
                  {prompt.length > 50 ? prompt.slice(0, 50) + '…' : prompt}
                </button>
              ))}
            </div>
          </div>

          <Button
            data-testid="onboarding-start-chat"
            onClick={handleStartChat}
            disabled={!canSubmit || isRedirecting}
            className="w-full bg-fg-primary text-fg-inverted hover:bg-fg-primary/90"
          >
            {isRedirecting ? (
              <>
                <Sparkles className="h-4 w-4 mr-2 animate-pulse" />
                Starting your conversation…
              </>
            ) : (
              <>
                <ArrowRight className="h-4 w-4 mr-2" />
                Chat with Cat
              </>
            )}
          </Button>

          <p className="text-xs text-center text-fg-tertiary">
            Cat will ask follow-up questions and suggest the right setup for your situation
          </p>
        </div>
      </div>
    </div>
  );
}
