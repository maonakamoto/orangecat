/**
 * Form theme colors keyed by entity colorTheme.
 * Used for semantic action emphasis without page-level color washes.
 */
import type { EntityMetadata } from './entity-registry';
import { GRADIENTS } from './gradients';

export const FORM_THEME: Record<
  EntityMetadata['colorTheme'],
  { pageSurface: string; btnGradient: string }
> = {
  orange: { pageSurface: 'bg-background', btnGradient: GRADIENTS.brandOrangeDark },
  tiffany: { pageSurface: 'bg-background', btnGradient: GRADIENTS.brandTiffanyDark },
  rose: { pageSurface: 'bg-background', btnGradient: GRADIENTS.brandRoseDark },
  green: { pageSurface: 'bg-background', btnGradient: GRADIENTS.brandGreen },
};
