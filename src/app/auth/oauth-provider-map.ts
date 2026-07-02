/**
 * App OAuth provider ids → Supabase/GoTrue provider keys.
 *
 * Server-safe SSOT (no 'use client') so both the login UI and the
 * /api/auth/oauth-providers route derive providers from the same map.
 * NOTE: "X" is still `twitter` upstream in GoTrue/supabase-js.
 */
export const OAUTH_TO_SUPABASE = {
  google: 'google',
  github: 'github',
  facebook: 'facebook',
  apple: 'apple',
  x: 'twitter',
} as const;

/** App-level OAuth provider id — derived from the map (SSOT). */
export type OAuthProvider = keyof typeof OAUTH_TO_SUPABASE;

export const OAUTH_PROVIDER_IDS = Object.keys(OAUTH_TO_SUPABASE) as OAuthProvider[];

export function isOAuthProvider(value: string): value is OAuthProvider {
  return value in OAUTH_TO_SUPABASE;
}
