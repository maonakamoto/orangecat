/**
 * Form theme colors keyed by entity colorTheme.
 * Used to tint the entity form background and action button gradient.
 */
import type { EntityMetadata } from './entity-registry';
import { GRADIENTS } from './gradients';

export const FORM_THEME: Record<EntityMetadata['colorTheme'], { bg: string; btnGradient: string }> =
  {
    orange: { bg: 'from-orange-50/30', btnGradient: GRADIENTS.brandOrangeDark },
    tiffany: { bg: 'from-tiffany-50/30', btnGradient: GRADIENTS.brandTiffanyDark },
    rose: { bg: 'from-rose-50/30', btnGradient: GRADIENTS.brandRoseDark },
    green: { bg: 'from-green-50/30', btnGradient: GRADIENTS.brandGreen },
  };
