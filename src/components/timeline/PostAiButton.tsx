'use client';

import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { fetchPostDraft } from '@/services/articles/ai-client';
import { TIMELINE_SURFACE } from '@/config/timeline';
import { cn } from '@/lib/utils';

/**
 * One-click "write me a post" — asks the AI writer for a short, engagement-
 * sparking post grounded in the user's own interests, then fills the composer.
 * Fails soft: a transient inline note, never a blocking error.
 */
export default function PostAiButton({
  onDraft,
  disabled,
}: {
  onDraft: (text: string) => void;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    if (busy || disabled) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const draft = await fetchPostDraft({});
      onDraft(draft.text);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not draft a post. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={go}
        disabled={busy || disabled}
        className={cn(TIMELINE_SURFACE.chip, 'gap-1.5')}
        title="Write a post with AI, grounded in your interests"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {busy ? 'Writing…' : 'Write with AI'}
      </button>
      {error && <span className="text-xs text-status-negative">{error}</span>}
    </div>
  );
}
