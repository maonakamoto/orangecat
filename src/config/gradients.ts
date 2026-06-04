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
  brandOrange: 'bg-foreground',
  brandOrangeDark: 'bg-foreground',
  brandMixed: 'bg-foreground',
  brandTiffany: 'bg-foreground',
  brandTiffanyDark: 'bg-foreground',
  brandPrimary: 'bg-foreground',
  brandOrangeAmber: 'bg-foreground',
  brandGreen: 'bg-success',
  brandBlue: 'bg-foreground',
  brandRose: 'bg-rose-600',
  brandRoseDark: 'bg-rose-600',

  // ── Section / card background tints ───────────────────────────────────────
  sectionClean: 'bg-background',
  sectionSubtle: 'bg-muted/30',
  sectionAlt: 'bg-muted/50',
  sectionGreen: 'bg-muted/30',
  sectionOrangeTiffany: 'bg-muted/30',
  sectionTiffanyMuted: 'bg-muted/30',
  iconOrangeTiffany: 'bg-muted',
  sectionGrayOrange: 'bg-muted/30',
  sectionOrangeWarm: 'bg-muted/30',

  // ── Icon circle/badge gradients (diagonal, for icon backgrounds) ──────────
  iconBlue: 'bg-foreground',
  iconOrange: 'bg-foreground',
  iconTiffany: 'bg-foreground',
  iconGreen: 'bg-success',
  iconTiffanyLight: 'bg-muted',

  // ── Card background section tints (diagonal) ──────────────────────────────
  sectionBlueCyan: 'bg-muted/30',
  sectionAmberOrange: 'bg-muted/30',
  sectionOrangeTiffanyBr: 'bg-muted/30',
  sectionGreenEmerald: 'bg-muted/30',

  // ── Diagonal (br) gradients ───────────────────────────────────────────────
  brandOrangeBr: 'bg-foreground',
  brandOrangeCircle: 'bg-foreground',
  brandOrangeLightBr: 'bg-muted',
  brandTiffanyBr: 'bg-foreground',
  grayLight: 'bg-muted/30',
  graySubtle: 'bg-muted/20',
  heroSection: 'bg-background',
  heroOrangeTiffany: 'bg-foreground',
  brandOrangeYellow: 'bg-foreground',
  brandMixedBr: 'bg-foreground',
  iconTiffanyOrange: 'bg-foreground',
  tiffanyMuted: 'bg-muted',
  sectionOrangeAmber: 'bg-muted/30',
  sectionTiffanyOrange: 'bg-muted/20',
  sectionGrayWhite: 'bg-background',

  // ── Overlay gradients (dark overlays over images) ───────────────────────
  overlayDarkBottom: 'bg-black/40',

  // ── Page background gradients (full-bleed wrappers) ───────────────────────
  pageBgOrangeDown: 'bg-background',
  pageBgTiffanyDown: 'bg-background',
  pageBg: 'bg-background',
  pageBgSolid: 'bg-background',
  pageBgFrost: 'bg-background',
  pageBgOrange: 'bg-background',
  pageBgBlue: 'bg-background',

  // ── Bitcoin gradients (only for Bitcoin-related UI) ──────────────────────
  brandBitcoin: 'bg-bitcoinOrange',
  progressBitcoin: 'bg-bitcoinOrange',
  btnBitcoin: 'bg-bitcoinOrange hover:bg-bitcoinOrange/90',

  // ── Button combos (base + hover, always used together) ───────────────────
  btnOrange: 'bg-foreground hover:bg-muted-strong',
  btnOrangeDark: 'bg-foreground hover:bg-muted-strong',
  btnPrimary: 'bg-foreground hover:bg-muted-strong',
  btnGreen: 'bg-success hover:bg-success/90',
} as const;

export type GradientKey = keyof typeof GRADIENTS;
