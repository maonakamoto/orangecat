'use client';

import { useEffect, useState } from 'react';
import { isOAuthProvider, type OAuthProvider } from './oauth-provider-map';

/**
 * Which OAuth providers actually work on this deployment.
 *
 * Driven by /api/auth/oauth-providers (single source of truth), which checks
 * both that GoTrue flags the provider enabled AND that its authorize flow
 * really redirects to the external IdP — a provider can be flagged on with
 * broken credentials, which used to render a dead button. Enabling and
 * configuring a provider on the server makes its button appear with zero
 * code change; a disabled or broken provider never renders.
 */
export function useEnabledOAuthProviders(): { enabled: Set<OAuthProvider>; loaded: boolean } {
  const [enabled, setEnabled] = useState<Set<OAuthProvider>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/auth/oauth-providers');
        const body = (await res.json()) as { success?: boolean; data?: { providers?: string[] } };
        const providers = (body.data?.providers ?? []).filter(isOAuthProvider);
        if (active) {
          setEnabled(new Set(providers));
        }
      } catch {
        // Network/parse failure → leave empty so no broken buttons are shown.
      } finally {
        if (active) {
          setLoaded(true);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return { enabled, loaded };
}
