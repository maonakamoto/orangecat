'use client';

import { useEffect, useState } from 'react';
import type { OAuthProvider } from './useAuthForm';

/**
 * App provider id → Supabase/GoTrue provider key.
 * NOTE: "X" is still `twitter` upstream in GoTrue/supabase-js.
 */
export const OAUTH_TO_SUPABASE: Record<OAuthProvider, string> = {
  google: 'google',
  github: 'github',
  facebook: 'facebook',
  apple: 'apple',
  x: 'twitter',
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Which OAuth providers the GoTrue server actually has enabled.
 *
 * The login UI is driven from this (single source of truth) so we never render
 * a social button that can't work. Enabling a provider on the server
 * (`GOTRUE_EXTERNAL_<P>_ENABLED=true`) makes its button appear with zero code
 * change; disabling it removes the button.
 */
export function useEnabledOAuthProviders(): { enabled: Set<OAuthProvider>; loaded: boolean } {
  const [enabled, setEnabled] = useState<Set<OAuthProvider>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    if (!SUPABASE_URL || !ANON_KEY) {
      setLoaded(true);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
          headers: { apikey: ANON_KEY },
        });
        const data = await res.json();
        const ext: Record<string, boolean> = data?.external ?? {};
        const on = new Set<OAuthProvider>();
        (Object.keys(OAUTH_TO_SUPABASE) as OAuthProvider[]).forEach(id => {
          if (ext[OAUTH_TO_SUPABASE[id]]) {
            on.add(id);
          }
        });
        if (active) {
          setEnabled(on);
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
