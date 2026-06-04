'use client';

/**
 * One-time plaintext reveal card. Shared between IntegrationKeysCard
 * (used after mint AND after rotate) — same UX in both cases: show
 * the plaintext once, copy button, dismiss button.
 *
 * Lifted out of IntegrationKeysCard 2026-06-04 to keep the parent
 * under the 300-line component cap.
 */

import { Copy } from 'lucide-react';
import { logger } from '@/utils/logger';

interface Props {
  plaintext: string;
  prefix: string;
  /** Singular noun for messaging: "key" / "secret" / etc. */
  label?: string;
  onDismiss: () => void;
}

export default function PlaintextRevealCard({
  plaintext,
  prefix,
  label = 'key',
  onDismiss,
}: Props) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(plaintext);
    } catch (err) {
      logger.warn('Clipboard write failed', { err });
    }
  }

  return (
    <div className="rounded-lg border border-ring/50 bg-muted/40 p-4">
      <p className="text-sm font-medium text-foreground">
        Copy this {label} now — you won&apos;t see it again
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Prefix <code className="rounded bg-muted px-1">{prefix}</code> is all you&apos;ll see after
        closing this card.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <code className="flex-1 truncate rounded-md border border-border-subtle bg-background px-3 py-2 font-mono text-xs text-foreground">
          {plaintext}
        </code>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1 rounded-md border border-border-subtle px-2.5 py-1.5 text-xs text-foreground hover:bg-muted/60"
        >
          <Copy className="h-3.5 w-3.5" />
          Copy
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Close
        </button>
      </div>
    </div>
  );
}
