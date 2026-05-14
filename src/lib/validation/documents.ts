import { z } from 'zod';
import { DOCUMENT_TYPES, DOCUMENT_VISIBILITY_TYPES } from '@/config/documents';

// =============================================================================
// DOCUMENT VALIDATION (My Cat Context)
// =============================================================================

export const documentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  content: z.string().max(50000, 'Content must be 50,000 characters or less').optional().nullable(),
  document_type: z.enum(DOCUMENT_TYPES.map(t => t.value) as [string, ...string[]]).default('notes'),
  visibility: z
    .enum(DOCUMENT_VISIBILITY_TYPES.map(t => t.value) as [string, ...string[]])
    .default('cat_visible'),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

export type DocumentFormData = z.infer<typeof documentSchema>;
export type DocumentType = (typeof DOCUMENT_TYPES)[number]['value'];
export type DocumentVisibility = (typeof DOCUMENT_VISIBILITY_TYPES)[number]['value'];
