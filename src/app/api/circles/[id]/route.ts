/**
 * Circle CRUD API Routes (GET/PUT/DELETE by id).
 * Generic CRUD handler; entity metadata from entity-registry (SSOT).
 */

import { circleSchema } from '@/lib/validation';
import { createEntityCrudHandlers } from '@/lib/api/entityCrudHandler';
import {
  createUpdatePayloadBuilder,
  commonFieldMappings,
  entityTransforms,
} from '@/lib/api/buildUpdatePayload';

const buildCircleUpdatePayload = createUpdatePayloadBuilder([
  { from: 'title' },
  { from: 'description', transform: entityTransforms.emptyStringToNull },
  { from: 'category', transform: entityTransforms.emptyStringToNull },
  { from: 'visibility' },
  { from: 'cover_image_url', transform: entityTransforms.emptyStringToNull },
  commonFieldMappings.arrayField('tags', []),
  { from: 'status', default: 'active' },
]);

const { GET, PUT, DELETE } = createEntityCrudHandlers({
  entityType: 'circle',
  schema: circleSchema,
  buildUpdatePayload: buildCircleUpdatePayload,
  ownershipField: 'actor_id',
  useActorOwnership: true,
});

export { GET, PUT, DELETE };
