/**
 * Event Entity Configuration - Single Source of Truth
 *
 * Display labels for event types.
 * Components should import from here instead of defining inline.
 */

// ==================== EVENT TYPES ====================

export const EVENT_TYPES = [
  { value: 'meetup', label: 'Meetup' },
  { value: 'conference', label: 'Conference' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'party', label: 'Party' },
  { value: 'exhibition', label: 'Exhibition' },
  { value: 'festival', label: 'Festival' },
  { value: 'retreat', label: 'Retreat' },
  { value: 'other', label: 'Other' },
] as const;

export type EventType = (typeof EVENT_TYPES)[number]['value'];

// ==================== EVENT CATEGORIES ====================

export const EVENT_CATEGORIES = [
  'Social',
  'Business',
  'Education',
  'Arts & Culture',
  'Technology',
  'Sports & Fitness',
  'Food & Drink',
  'Music',
  'Networking',
  'Community',
  'Other',
] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];

// ==================== DERIVED LOOKUP MAPS ====================

export const EVENT_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  EVENT_TYPES.map(t => [t.value, t.label])
);
