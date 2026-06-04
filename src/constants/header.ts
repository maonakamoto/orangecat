/**
 * Header Constants
 *
 * Single source of truth for all header-related constants.
 * Prevents magic numbers and ensures consistency.
 *
 * Created: 2026-01-16
 */

/**
 * Header dimensions
 */
export const HEADER_DIMENSIONS = {
  /** Mobile height */
  HEIGHT_MOBILE: 'h-14',
  /** Desktop height */
  HEIGHT_DESKTOP: 'sm:h-16',
  /** Mobile height in pixels (for calculations) */
  HEIGHT_MOBILE_PX: 56,
  /** Desktop height in pixels (for calculations) */
  HEIGHT_DESKTOP_PX: 64,
  /** Top position for components below header */
  TOP_OFFSET_MOBILE: 'top-14',
  /** Top position for components below header (desktop) */
  TOP_OFFSET_DESKTOP: 'sm:top-16',
} as const;

/**
 * Header spacing constants
 */
export const HEADER_SPACING = {
  /** Container padding */
  CONTAINER_PADDING: 'px-3 sm:px-4 md:px-6',
  /** Gap between items */
  ITEM_GAP: 'gap-2 sm:gap-3',
  /** Gap between action buttons - increased on mobile for better touch targets */
  ACTION_GAP: 'gap-2.5 sm:gap-2',
  /** Max width */
  MAX_WIDTH: 'max-w-7xl',
} as const;

/**
 * Touch target sizes (minimum 44x44px for accessibility)
 */
export const TOUCH_TARGETS = {
  /** Mobile touch target (11 * 4px = 44px) */
  MOBILE: 'w-11 h-11 min-w-11 min-h-11',
  /** Desktop touch target */
  DESKTOP: 'sm:w-10 sm:h-10 sm:min-w-0 sm:min-h-0',
  /** Combined mobile and desktop */
  RESPONSIVE: 'w-11 h-11 sm:w-10 sm:h-10 min-w-11 min-h-11 sm:min-w-0 sm:min-h-0',
} as const;

/**
 * Button base styles (DRY)
 */
export const HEADER_BUTTON_BASE = {
  /** Base button classes */
  BASE: 'flex-shrink-0 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors touch-manipulation relative',
  /** Mobile search button specific */
  MOBILE_SEARCH:
    'md:hidden text-muted-strong hover:bg-muted/40 active:bg-muted border border-border hover:border-border-strong shadow-sm',
} as const;

/**
 * Mobile menu constants
 */
export const MOBILE_MENU = {
  /** Menu width */
  WIDTH: 'w-80',
  /** Max width on small screens */
  MAX_WIDTH: 'max-w-[85vw] sm:max-w-sm',
  /** Position */
  POSITION: 'fixed top-16 bottom-0 left-0',
  // eslint-disable-next-line no-restricted-syntax -- mobile menu uses gray-900 dark; bg-card (3.9%) and bg-muted (11%) diverge visually from the intended shade
  BACKGROUND: 'bg-card dark:bg-background',
  /** Shadow */
  SHADOW: 'shadow-sm',
  /** Overflow */
  OVERFLOW: 'overflow-y-auto overscroll-contain',
  /** Transition */
  TRANSITION: 'transition-transform duration-300 ease-out',
} as const;
