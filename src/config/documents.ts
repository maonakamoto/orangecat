/**
 * Document Entity Configuration - Single Source of Truth
 *
 * Type and visibility arrays shared between Zod validation schemas,
 * form field configs, and display label maps.
 */

// ==================== DOCUMENT TYPES ====================

export const DOCUMENT_TYPES = [
  { value: 'goals', label: 'Goals & Aspirations', description: 'Your objectives and dreams' },
  { value: 'finances', label: 'Financial Info', description: 'Budget, income, expenses' },
  { value: 'skills', label: 'Skills & Expertise', description: 'Your abilities and experience' },
  { value: 'business_plan', label: 'Business Plan', description: 'Startup ideas and strategies' },
  { value: 'notes', label: 'Notes', description: 'General notes and information' },
  { value: 'other', label: 'Other', description: 'Anything else' },
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number]['value'];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = Object.fromEntries(
  DOCUMENT_TYPES.map(t => [t.value, t.label])
) as Record<DocumentType, string>;

// ==================== DOCUMENT VISIBILITY TYPES ====================

export const DOCUMENT_VISIBILITY_TYPES = [
  {
    value: 'cat_visible',
    label: 'My Cat Only',
    description: 'My Cat can use this for advice',
  },
  {
    value: 'private',
    label: 'Private',
    description: 'Only you can see, My Cat cannot access',
  },
  {
    value: 'public',
    label: 'Public',
    description: 'Anyone can see on your profile',
  },
] as const;

export type DocumentVisibility = (typeof DOCUMENT_VISIBILITY_TYPES)[number]['value'];

export const DOCUMENT_VISIBILITY_LABELS: Record<DocumentVisibility, string> = Object.fromEntries(
  DOCUMENT_VISIBILITY_TYPES.map(t => [t.value, t.label])
) as Record<DocumentVisibility, string>;
