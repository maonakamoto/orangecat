/**
 * App shell layout SSOT
 *
 * Header offset and full-height content regions must derive from here.
 * AppShell uses pt-14 / sm:pt-16 — keep those values in sync with this file.
 *
 * created_date: 2026-06-03
 * last_modified_date: 2026-06-03
 * last_modified_summary: Extracted header height tokens used by Cat chat and messaging surfaces
 */

/** Mobile app header height (matches AppShell `pt-14`) */
export const APP_HEADER_HEIGHT_MOBILE = '3.5rem' as const;

/** Desktop app header height (matches AppShell `sm:pt-16`) */
export const APP_HEADER_HEIGHT_DESKTOP = '4rem' as const;

/**
 * Tailwind classes for a column that fills the viewport below the fixed header.
 * Use on chat-style surfaces (Cat, messages, ai-chat).
 *
 * NOTE: the underscores are REQUIRED. Tailwind converts `_` → space inside
 * arbitrary values, yielding valid `calc(100dvh - 4rem)`. Without them the CSS is
 * `calc(100dvh-4rem)` — invalid, silently dropped — so the height never applies
 * and chat surfaces collapse to content height (composer floats, page scrolls).
 */
export const APP_CONTENT_HEIGHT_CLASS =
  'h-[calc(100dvh_-_3.5rem)] sm:h-[calc(100dvh_-_4rem)]' as const;

/** Max width for chat message columns (ChatGPT-style readable measure) */
export const CHAT_CONTENT_MAX_WIDTH_CLASS = 'max-w-3xl' as const;
