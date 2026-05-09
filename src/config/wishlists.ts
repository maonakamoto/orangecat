/**
 * Wishlist Entity Configuration - Single Source of Truth
 *
 * Display labels for wishlist types.
 * Components should import from here instead of defining inline.
 */

// ==================== WISHLIST TYPES ====================

export const WISHLIST_TYPES = [
  { value: 'birthday', label: 'Birthday' },
  { value: 'wedding', label: 'Wedding' },
  { value: 'baby_shower', label: 'Baby Shower' },
  { value: 'graduation', label: 'Graduation' },
  { value: 'housewarming', label: 'Housewarming' },
  { value: 'charity', label: 'Cause' },
  { value: 'travel', label: 'Travel' },
  { value: 'personal', label: 'Personal' },
  { value: 'general', label: 'General' },
] as const;

export type WishlistType = (typeof WISHLIST_TYPES)[number]['value'];

// ==================== DERIVED LOOKUP MAP ====================

export const WISHLIST_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  WISHLIST_TYPES.map(t => [t.value, t.label])
);
