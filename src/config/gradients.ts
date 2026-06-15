/**
 * Gradient Classes — SSOT for reusable Tailwind gradient strings.
 *
 * Product rule: gradients are rare. Most historical keys resolve to neutral
 * surfaces so older page code stays compatible while the app moves to a
 * quieter x.ai-like aesthetic. Use the brand and Bitcoin keys only when the
 * accent is semantically useful.
 *
 * Usage: `className={GRADIENTS.brandOrange}` or
 *        `className={cn(GRADIENTS.brandOrange, 'other-classes')}`
 */

export const GRADIENTS = {
  // ── Right-direction gradients ─────────────────────────────────────────────
  brandOrange: 'bg-fg-primary',
  brandOrangeDark: 'bg-fg-primary',
  brandMixed: 'bg-fg-primary',
  brandTiffany: 'bg-fg-primary',
  brandTiffanyDark: 'bg-fg-primary',
  brandPrimary: 'bg-fg-primary',
  brandOrangeAmber: 'bg-fg-primary',
  brandGreen: 'bg-status-positive',
  brandBlue: 'bg-fg-primary',
  brandRose: 'bg-rose-600',
  brandRoseDark: 'bg-rose-600',

  // ── Section / card background tints ───────────────────────────────────────
  sectionClean: 'bg-surface-page',
  sectionSubtle: 'bg-surface-raised/30',
  sectionAlt: 'bg-surface-raised/50',
  sectionGreen: 'bg-surface-raised/30',
  sectionOrangeTiffany: 'bg-surface-raised/30',
  sectionTiffanyMuted: 'bg-surface-raised/30',
  iconOrangeTiffany: 'bg-surface-raised',
  sectionGrayOrange: 'bg-surface-raised/30',
  sectionOrangeWarm: 'bg-surface-raised/30',

  // ── Icon circle/badge gradients (diagonal, for icon backgrounds) ──────────
  iconBlue: 'bg-fg-primary',
  iconOrange: 'bg-fg-primary',
  iconTiffany: 'bg-fg-primary',
  iconGreen: 'bg-status-positive',
  iconTiffanyLight: 'bg-surface-raised',

  // ── Card background section tints (diagonal) ──────────────────────────────
  sectionBlueCyan: 'bg-surface-raised/30',
  sectionAmberOrange: 'bg-surface-raised/30',
  sectionOrangeTiffanyBr: 'bg-surface-raised/30',
  sectionGreenEmerald: 'bg-surface-raised/30',

  // ── Diagonal (br) gradients ───────────────────────────────────────────────
  brandOrangeBr: 'bg-fg-primary',
  brandOrangeCircle: 'bg-fg-primary',
  brandOrangeLightBr: 'bg-surface-raised',
  brandTiffanyBr: 'bg-fg-primary',
  grayLight: 'bg-surface-raised/30',
  graySubtle: 'bg-surface-raised/20',
  heroSection: 'bg-surface-page',
  heroOrangeTiffany: 'bg-fg-primary',
  brandOrangeYellow: 'bg-fg-primary',
  brandMixedBr: 'bg-fg-primary',
  iconTiffanyOrange: 'bg-fg-primary',
  tiffanyMuted: 'bg-surface-raised',
  sectionOrangeAmber: 'bg-surface-raised/30',
  sectionTiffanyOrange: 'bg-surface-raised/20',
  sectionGrayWhite: 'bg-surface-page',

  // ── Overlay gradients (dark overlays over images) ───────────────────────
  overlayDarkBottom: 'bg-black/40',

  // ── Page background gradients (full-bleed wrappers) ───────────────────────
  pageBgOrangeDown: 'bg-surface-page',
  pageBgTiffanyDown: 'bg-surface-page',
  pageBg: 'bg-surface-page',
  pageBgSolid: 'bg-surface-page',
  pageBgFrost: 'bg-surface-page',
  pageBgOrange: 'bg-surface-page',
  pageBgBlue: 'bg-surface-page',

  // ── Bitcoin gradients (only for Bitcoin-related UI) ──────────────────────
  brandBitcoin: 'bg-bitcoinOrange',
  progressBitcoin: 'bg-bitcoinOrange',
  btnBitcoin: 'bg-bitcoinOrange hover:bg-bitcoinOrange/90',

  // ── Button combos (base + hover, always used together) ───────────────────
  btnOrange: 'bg-fg-primary hover:bg-muted-strong',
  btnOrangeDark: 'bg-fg-primary hover:bg-muted-strong',
  btnPrimary: 'bg-fg-primary hover:bg-muted-strong',
  btnGreen: 'bg-status-positive hover:bg-status-positive/90',
} as const;

export type GradientKey = keyof typeof GRADIENTS;
