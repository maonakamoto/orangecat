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
  success: 'bg-green-100 text-green-700 border-green-200',
  warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  error: 'bg-red-100 text-red-700 border-red-200',
  info: 'bg-blue-100 text-blue-700 border-blue-200',
  neutral: 'bg-gray-100 text-gray-700 border-gray-200',
  muted: 'bg-slate-100 text-slate-600 border-slate-200',
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
  orange: 'bg-orange-100 text-orange-700 border-orange-200',
  tiffany: 'bg-tiffany-100 text-tiffany-700 border-tiffany-200',
  pink: 'bg-pink-100 text-pink-700 border-pink-200',
} as const;

export type BadgeColorKey = keyof typeof BADGE_COLORS;
