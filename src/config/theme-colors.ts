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
  orange: { pageSurface: 'bg-surface-page', btnGradient: GRADIENTS.brandOrangeDark },
  tiffany: { pageSurface: 'bg-surface-page', btnGradient: GRADIENTS.brandTiffanyDark },
  rose: { pageSurface: 'bg-surface-page', btnGradient: GRADIENTS.brandRoseDark },
  green: { pageSurface: 'bg-surface-page', btnGradient: GRADIENTS.brandGreen },
};
