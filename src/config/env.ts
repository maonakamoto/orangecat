/**
 * Environment SSOT — canonical URLs and runtime mode flags.
 *
 * Prefer importing from here over raw `process.env` for values that must stay
 * consistent across auth redirects, emails, and OG metadata.
 */

function normalizeUrl(value: string | undefined, fallback: string): string {
  return (value?.trim() || fallback).replace(/\/$/, '');
}

const defaultOrigin = 'https://orangecat.ch';

/** Public site origin (marketing, auth redirects). */
export const SITE_URL = normalizeUrl(process.env.NEXT_PUBLIC_SITE_URL, defaultOrigin);

/** App origin (API callbacks, emails). Falls back to SITE_URL when unset. */
export const APP_URL = normalizeUrl(process.env.NEXT_PUBLIC_APP_URL, SITE_URL);

export const RUNTIME = {
  isDev: process.env.NODE_ENV === 'development',
  isProd: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
} as const;
