'use client';

import { useState } from 'react';
import { Check, Share2 } from 'lucide-react';

/**
 * Share affordance for an article — native share sheet where available, else
 * copy-to-clipboard with a brief confirmation. No third-party share widgets.
 */
export default function ShareButton({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        /* user dismissed — fall through to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — no-op */
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex items-center gap-1.5 rounded-md border border-default px-3 py-1.5 text-sm font-medium text-fg-secondary transition-colors hover:bg-surface-raised hover:text-fg-primary"
    >
      {copied ? <Check className="h-4 w-4 text-status-positive" /> : <Share2 className="h-4 w-4" />}
      {copied ? 'Link copied' : 'Share'}
    </button>
  );
}
