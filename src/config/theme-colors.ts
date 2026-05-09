/**
 * Form theme colors keyed by entity colorTheme.
 * Used to tint the entity form background and action button gradient.
 */
import type { EntityMetadata } from './entity-registry';

export const FORM_THEME: Record<EntityMetadata['colorTheme'], { bg: string; gradient: string }> = {
  orange: { bg: 'from-orange-50/30', gradient: 'from-orange-600 to-orange-700' },
  tiffany: { bg: 'from-tiffany-50/30', gradient: 'from-tiffany-600 to-tiffany-700' },
  rose: { bg: 'from-rose-50/30', gradient: 'from-rose-600 to-rose-700' },
  green: { bg: 'from-green-50/30', gradient: 'from-green-600 to-green-700' },
};
