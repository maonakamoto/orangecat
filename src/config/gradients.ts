/**
 * Gradient Classes — SSOT for reusable Tailwind gradient strings.
 *
 * Changing a brand gradient requires editing one line here.
 *
 * Usage: `className={GRADIENTS.brandOrange}` or
 *        `className={cn(GRADIENTS.brandOrange, 'other-classes')}`
 */

export const GRADIENTS = {
  // ── Right-direction gradients ─────────────────────────────────────────────
  brandOrange: 'bg-gradient-to-r from-orange-500 to-orange-600',
  brandOrangeDark: 'bg-gradient-to-r from-orange-600 to-orange-700',
  brandMixed: 'bg-gradient-to-r from-orange-500 to-tiffany-500',
  brandTiffany: 'bg-gradient-to-r from-tiffany-500 to-tiffany-600',
  brandTiffanyDark: 'bg-gradient-to-r from-tiffany-600 to-tiffany-700',
  brandPrimary: 'bg-gradient-to-r from-tiffany-600 to-orange-600',
  brandOrangeAmber: 'bg-gradient-to-r from-orange-500 to-amber-500',

  // ── Diagonal (br) gradients ───────────────────────────────────────────────
  brandOrangeBr: 'bg-gradient-to-br from-orange-400 to-orange-500',
  brandOrangeLightBr: 'bg-gradient-to-br from-orange-100 to-orange-200',
  brandTiffanyBr: 'bg-gradient-to-br from-tiffany-400 to-tiffany-600',

  // ── Button combos (base + hover, always used together) ───────────────────
  btnOrange:
    'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700',
  btnOrangeDark:
    'bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800',
  btnPrimary:
    'bg-gradient-to-r from-tiffany-600 to-orange-600 hover:from-tiffany-700 hover:to-orange-700',
} as const;

export type GradientKey = keyof typeof GRADIENTS;
