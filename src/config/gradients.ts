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
  brandGreen: 'bg-gradient-to-r from-green-600 to-green-700',
  brandPurple: 'bg-gradient-to-r from-purple-600 to-purple-700',
  brandBlue: 'bg-gradient-to-r from-blue-600 to-blue-700',

  // ── Section / card background tints ───────────────────────────────────────
  sectionGreen: 'bg-gradient-to-r from-green-50 to-emerald-50',
  iconOrangeTiffany: 'bg-gradient-to-r from-orange-100 to-tiffany-100',

  // ── Diagonal (br) gradients ───────────────────────────────────────────────
  brandOrangeBr: 'bg-gradient-to-br from-orange-400 to-orange-500',
  brandOrangeCircle: 'bg-gradient-to-br from-orange-500 to-orange-600',
  brandOrangeLightBr: 'bg-gradient-to-br from-orange-100 to-orange-200',
  brandTiffanyBr: 'bg-gradient-to-br from-tiffany-400 to-tiffany-600',
  grayLight: 'bg-gradient-to-br from-gray-50 to-gray-100',
  graySubtle: 'bg-gradient-to-br from-gray-50 via-white to-gray-100',
  heroSection: 'bg-gradient-to-br from-orange-50 via-tiffany-50 to-orange-100',

  // ── Page background gradients (full-bleed wrappers) ───────────────────────
  pageBg: 'bg-gradient-to-br from-orange-50/30 via-white to-tiffany-50/20',
  pageBgSolid: 'bg-gradient-to-br from-orange-50 via-white to-tiffany-50',
  pageBgFrost: 'bg-gradient-to-br from-orange-50/80 via-white/80 to-tiffany-50/80',
  pageBgOrange: 'bg-gradient-to-br from-orange-50 via-white to-orange-50',
  pageBgBlue: 'bg-gradient-to-br from-orange-50 via-white to-blue-50',

  // ── Bitcoin gradients (only for Bitcoin-related UI) ──────────────────────
  brandBitcoin: 'bg-gradient-to-r from-bitcoinOrange to-orange-500',
  btnBitcoin:
    'bg-gradient-to-r from-bitcoinOrange to-orange-500 hover:from-orange-600 hover:to-orange-600',

  // ── Button combos (base + hover, always used together) ───────────────────
  btnOrange:
    'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700',
  btnOrangeDark:
    'bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800',
  btnPrimary:
    'bg-gradient-to-r from-tiffany-600 to-orange-600 hover:from-tiffany-700 hover:to-orange-700',
  btnGreen: 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800',
  btnEmeraldTeal:
    'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700',
} as const;

export type GradientKey = keyof typeof GRADIENTS;
