/**
 * Badge Colors — SSOT for semantic badge/status color classes.
 *
 * All status badges, pill labels, and colored chips across the app pull from
 * here. Changing a semantic color (e.g. "success" from green → teal) is a
 * one-line edit in this file.
 *
 * Pattern: `bg-*-100 text-*-700 border-*-200`
 * The border color is included so callers that add a `border` class get a
 * matching border automatically. Callers without `border` are unaffected.
 */

export const BADGE_COLORS = {
  success:
    'bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-900',
  warning:
    'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-900',
  error:
    'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-900',
  info: 'bg-tiffany-100 text-tiffany-700 border-tiffany-200 dark:bg-tiffany-900/20 dark:text-tiffany-400 dark:border-tiffany-800',
  neutral:
    'bg-muted text-muted-strong border-border dark:bg-muted dark:text-muted-foreground dark:border-border',
  muted:
    'bg-slate-100 text-slate-600 border-slate-200 dark:bg-muted dark:text-muted-foreground dark:border-border',
  amber:
    'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-900',
  orange:
    'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-900',
  tiffany:
    'bg-tiffany-100 text-tiffany-700 border-tiffany-200 dark:bg-tiffany-900/20 dark:text-tiffany-400 dark:border-tiffany-800',
  pink: 'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-950 dark:text-pink-400 dark:border-pink-900',
} as const;

export type BadgeColorKey = keyof typeof BADGE_COLORS;

/**
 * Stat panel accent colors — for full-card colored panels (stat cards, KPI tiles).
 * Lighter variant: bg-*-50 text-*-600 border-*-200
 * Use BADGE_COLORS for small pill badges; use STAT_COLORS for panel backgrounds.
 */
export const STAT_COLORS = {
  neutral:
    'bg-muted/40 text-muted-foreground border-border dark:bg-muted dark:text-muted-foreground dark:border-border',
  info: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-900',
  amber:
    'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-900',
  success:
    'bg-green-50 text-green-600 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-900',
  tiffany:
    'bg-tiffany-50 text-tiffany-600 border-tiffany-200 dark:bg-tiffany-900/20 dark:text-tiffany-400 dark:border-tiffany-800',
} as const;

export type StatColorKey = keyof typeof STAT_COLORS;
