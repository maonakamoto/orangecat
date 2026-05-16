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
  brandBlue: 'bg-gradient-to-r from-blue-600 to-blue-700',
  brandRose: 'bg-gradient-to-r from-rose-500 to-rose-600',
  brandRoseDark: 'bg-gradient-to-r from-rose-600 to-rose-700',

  // ── Section / card background tints ───────────────────────────────────────
  sectionClean: 'bg-background',
  sectionSubtle: 'bg-muted/30',
  sectionAlt: 'bg-muted/50',
  sectionGreen: 'bg-gradient-to-r from-green-50 to-emerald-50',
  sectionOrangeTiffany: 'bg-gradient-to-r from-orange-50 to-tiffany-50',
  sectionTiffanyMuted: 'bg-gradient-to-r from-tiffany-50 to-tiffany-100/50',
  iconOrangeTiffany: 'bg-gradient-to-r from-orange-100 to-tiffany-100',
  sectionGrayOrange: 'bg-gradient-to-r from-gray-50 to-orange-50',
  sectionOrangeWarm: 'bg-gradient-to-r from-orange-50 to-yellow-50',

  // ── Icon circle/badge gradients (diagonal, for icon backgrounds) ──────────
  iconBlue: 'bg-gradient-to-br from-blue-500 to-blue-600',
  iconOrange: 'bg-gradient-to-br from-orange-500 to-orange-600',
  iconTiffany: 'bg-gradient-to-br from-tiffany-500 to-tiffany-600',
  iconGreen: 'bg-gradient-to-br from-green-500 to-green-600',
  iconTiffanyLight: 'bg-gradient-to-br from-tiffany-50 to-tiffany-100',

  // ── Card background section tints (diagonal) ──────────────────────────────
  sectionBlueCyan: 'bg-gradient-to-br from-blue-50 to-cyan-50',
  sectionAmberOrange: 'bg-gradient-to-br from-amber-50 to-orange-50',
  sectionOrangeTiffanyBr: 'bg-gradient-to-br from-orange-50 to-tiffany-50',
  sectionGreenEmerald: 'bg-gradient-to-br from-green-50 to-emerald-50',

  // ── Diagonal (br) gradients ───────────────────────────────────────────────
  brandOrangeBr: 'bg-gradient-to-br from-orange-400 to-orange-500',
  brandOrangeCircle: 'bg-gradient-to-br from-orange-500 to-orange-600',
  brandOrangeLightBr: 'bg-gradient-to-br from-orange-100 to-orange-200',
  brandTiffanyBr: 'bg-gradient-to-br from-tiffany-400 to-tiffany-600',
  grayLight: 'bg-muted/30',
  graySubtle: 'bg-muted/20',
  heroSection: 'bg-background',
  heroOrangeTiffany: 'bg-gradient-to-r from-orange-400 via-orange-500 to-tiffany-500',
  brandOrangeYellow: 'bg-gradient-to-br from-orange-500 to-yellow-500',
  brandMixedBr: 'bg-gradient-to-br from-orange-500 to-tiffany-500',
  iconTiffanyOrange: 'bg-gradient-to-br from-tiffany-500 to-orange-500',
  tiffanyMuted: 'bg-gradient-to-br from-tiffany-100 to-tiffany-200',
  sectionOrangeAmber: 'bg-muted/30',
  sectionTiffanyOrange: 'bg-muted/20',
  sectionGrayWhite: 'bg-background',

  // ── Overlay gradients (dark overlays over images) ───────────────────────
  overlayDarkBottom: 'bg-gradient-to-t from-black/40 to-transparent',

  // ── Page background gradients (full-bleed wrappers) ───────────────────────
  pageBgOrangeDown: 'bg-background',
  pageBgTiffanyDown: 'bg-background',
  pageBg: 'bg-background',
  pageBgSolid: 'bg-muted/30',
  pageBgFrost: 'bg-background',
  pageBgOrange: 'bg-background',
  pageBgBlue: 'bg-background',

  // ── Bitcoin gradients (only for Bitcoin-related UI) ──────────────────────
  brandBitcoin: 'bg-gradient-to-r from-bitcoinOrange to-orange-500',
  progressBitcoin: 'bg-gradient-to-r from-bitcoinOrange via-orange-500 to-orange-600',
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
} as const;

export type GradientKey = keyof typeof GRADIENTS;
