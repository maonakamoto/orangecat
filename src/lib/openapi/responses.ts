/**
 * Standard response envelope schemas for OpenAPI generation.
 *
 * Mirrors src/lib/api/standardResponse.ts so the spec describes the
 * exact shape clients receive. When standardResponse changes, update
 * here too.
 *
 * Created: 2026-06-03
 */

import { z, type ZodTypeAny } from 'zod';

const metadataSchema = z
  .object({
    timestamp: z.string().datetime().openapi({ example: '2026-06-03T10:00:00.000Z' }),
    page: z.number().int().nonnegative().optional(),
    limit: z.number().int().positive().optional(),
    total: z.number().int().nonnegative().optional(),
  })
  .openapi('ResponseMetadata');

/** Wrap a payload schema in the standard `{ success: true, data, metadata }` envelope. */
export function apiSuccessSchema<T extends ZodTypeAny>(dataSchema: T, refId?: string) {
  const schema = z.object({
    success: z.literal(true),
    data: dataSchema,
    metadata: metadataSchema,
  });
  return refId ? schema.openapi(refId) : schema;
}

/**
 * Standard error envelope — matches src/lib/api/standardResponse.ts
 * exactly. `error.code` is UPPERCASE on the wire (e.g. `UNAUTHORIZED`);
 * SDKs are expected to lowercase before matching against documented
 * codes. `error.details` is endpoint-specific extra context (e.g. Zod
 * issues on validation failure).
 */
export const apiErrorSchema = z
  .object({
    success: z.literal(false),
    error: z
      .object({
        code: z.string().openapi({ example: 'UNAUTHORIZED' }),
        message: z.string().openapi({ example: 'Unauthorized' }),
        details: z.unknown().optional(),
      })
      .openapi('ApiErrorDetail'),
    metadata: z
      .object({
        timestamp: z.string().datetime(),
      })
      .optional(),
  })
  .openapi('ApiError');
