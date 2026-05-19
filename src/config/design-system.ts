/**
 * Design system SSOT for shared visual classes.
 *
 * The product direction is deliberately sparse and x.ai-adjacent: mostly
 * neutral surfaces, hairline borders, tight radii, quiet motion, and selective
 * OrangeCat/Tiffany accents only where they carry meaning or action.
 */

export const UI_TOKENS = {
  radius: {
    control: 'rounded-md',
    surface: 'rounded-md',
    pill: 'rounded-full',
  },
  border: {
    subtle: 'border border-border',
    strong: 'border border-border-strong',
  },
  surface: {
    base: 'bg-background text-foreground',
    panel: 'bg-card text-card-foreground',
    muted: 'bg-muted/40 text-foreground',
    inverse: 'bg-foreground text-background',
  },
  shadow: {
    none: 'shadow-none',
    raised: 'shadow-none',
  },
  focus:
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  transition: 'transition-colors duration-150',
} as const;

export const COMPONENT_STYLES = {
  button: {
    base: [
      'inline-flex items-center justify-center gap-2 whitespace-nowrap',
      UI_TOKENS.radius.control,
      'font-medium',
      UI_TOKENS.transition,
      UI_TOKENS.focus,
      'disabled:pointer-events-none disabled:opacity-50',
      'touch-manipulation select-none',
    ].join(' '),
    variants: {
      primary: 'bg-foreground text-background hover:bg-muted-strong',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-muted',
      ghost: 'text-muted-strong hover:bg-muted hover:text-foreground',
      danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      outline: 'border border-border-strong bg-transparent text-foreground hover:bg-muted',
      gradient: 'bg-foreground text-background hover:bg-muted-strong',
    },
    sizes: {
      sm: 'h-9 min-h-9 px-3 text-sm min-w-16',
      md: 'h-10 min-h-10 px-4 text-sm min-w-24',
      lg: 'h-11 min-h-11 px-5 text-base min-w-28',
      xl: 'h-12 min-h-12 px-6 text-base min-w-32',
    },
  },
  iconButton: {
    base: [
      'inline-flex h-10 w-10 min-h-10 min-w-10 items-center justify-center',
      UI_TOKENS.radius.control,
      UI_TOKENS.transition,
      UI_TOKENS.focus,
      'touch-manipulation select-none',
    ].join(' '),
    variants: {
      ghost: 'text-muted-strong hover:bg-muted hover:text-foreground',
      outline: 'border border-border bg-card text-foreground hover:bg-muted',
      inverse: 'bg-foreground text-background hover:bg-muted-strong',
    },
  },
  card: {
    base: [
      UI_TOKENS.surface.panel,
      UI_TOKENS.radius.surface,
      UI_TOKENS.border.subtle,
      UI_TOKENS.shadow.none,
    ].join(' '),
    variants: {
      default: '',
      elevated: 'bg-card',
      minimal: 'bg-transparent shadow-none',
      gradient: 'bg-card',
    },
  },
  field: {
    label: 'block text-sm font-medium text-foreground',
    description: 'text-sm text-muted-foreground',
    errorText: 'text-sm text-destructive',
    required: 'ml-1 text-destructive',
    control: [
      'w-full border border-input bg-card text-foreground',
      UI_TOKENS.radius.control,
      'placeholder:text-muted-dim',
      UI_TOKENS.transition,
      'focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20',
      'disabled:cursor-not-allowed disabled:opacity-50',
    ].join(' '),
    errorControl: 'border-destructive focus:border-destructive focus:ring-destructive/20',
  },
  badge: {
    base: [
      'inline-flex items-center gap-1 border px-2 py-0.5 text-xs font-medium',
      UI_TOKENS.radius.control,
      UI_TOKENS.transition,
      UI_TOKENS.focus,
    ].join(' '),
  },
  accent: {
    text: 'text-tiffany-600 dark:text-tiffany-400',
    surface: 'bg-tiffany-600 text-white dark:bg-tiffany-500 dark:text-background',
    hairline: 'bg-tiffany-500',
  },
} as const;
