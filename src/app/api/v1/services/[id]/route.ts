/**
 * Public API — GET /api/v1/services/[id]
 *
 * See /api/v1/README.md for the v1 contract. This file uses the
 * shared GET-by-id handler factory; integration-key auth + scopes +
 * is_test filtering all live there.
 */

import { createEntityGetByIdHandler } from '@/lib/api/entityGetByIdHandler';

export const GET = createEntityGetByIdHandler({ entityType: 'service' });
