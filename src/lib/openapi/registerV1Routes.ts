/**
 * Registers every /api/v1/<entity> POST endpoint with the OpenAPI registry.
 *
 * The v1 contract enumerated in src/config/public-api.ts is the SSOT for
 * which routes are exposed; this file maps each public entity type to
 * its existing Zod schema and builds the request/response operation.
 *
 * To add a new entity to v1: add it to PUBLIC_API_ENTITY_TYPES, point
 * to its schema in ENTITY_SCHEMAS below, and the spec picks it up
 * automatically.
 *
 * Created: 2026-06-03
 */

import { z } from 'zod';
import { openApiRegistry } from './registry';
import { apiSuccessSchema, apiErrorSchema } from './responses';
import {
  PUBLIC_API_BASE,
  PUBLIC_API_ENTITY_TYPES,
  type PublicApiEntityType,
  publicApiEndpoint,
} from '@/config/public-api';
import { getEntityMetadata } from '@/config/entity-registry';
import {
  userProductSchema,
  userServiceSchema,
  userCauseSchema,
  projectSchema,
  eventSchema,
  loanSchema,
  investmentSchema,
  assetSchema,
  wishlistSchema,
} from '@/lib/validation';

/**
 * Map public entity types to their request-body Zod schemas. Adding a
 * new entity to v1 means adding it here AND to PUBLIC_API_ENTITY_TYPES.
 */
const ENTITY_SCHEMAS: Record<PublicApiEntityType, z.ZodTypeAny> = {
  product: userProductSchema,
  service: userServiceSchema,
  project: projectSchema,
  cause: userCauseSchema,
  event: eventSchema,
  loan: loanSchema,
  investment: investmentSchema,
  asset: assetSchema,
  wishlist: wishlistSchema,
};

/**
 * Every endpoint accepts the optional `actor_id` field to create on
 * behalf of a group actor. The integration-key auth path ignores body
 * `actor_id` because the key itself is bound to one. Either way the
 * field is part of the contract.
 */
const ACTOR_ID_FIELD = {
  actor_id: z.string().uuid().optional().openapi({
    description:
      'Optional actor to create on behalf of. Session auth: user must be a privileged member (founder/admin/moderator) of the group whose actor matches. Integration-key auth: the key is already bound to an actor; this field is ignored.',
  }),
};

/**
 * Response payload for a successful create — same fields as the request
 * body plus a server-assigned `id`. We do not attempt to model every
 * DB-side default; consumers should treat unknown fields as additive.
 */
function buildEntityResponseSchema(requestSchema: z.ZodTypeAny, label: string) {
  const requestObject =
    requestSchema instanceof z.ZodObject ? requestSchema : z.object({}).catchall(z.unknown());

  return requestObject
    .extend({
      id: z.string().uuid().openapi({ description: 'Server-assigned identifier.' }),
      actor_id: z.string().uuid().openapi({ description: 'Actor that owns the created entity.' }),
      created_at: z.string().datetime().openapi({ description: 'ISO 8601 creation timestamp.' }),
    })
    .passthrough()
    .openapi(`${label}Response`);
}

const COMMON_ERROR_RESPONSES = {
  400: {
    description: 'Validation error — request body did not match the schema.',
    content: { 'application/json': { schema: apiErrorSchema } },
  },
  401: {
    description: 'Missing or invalid authentication.',
    content: { 'application/json': { schema: apiErrorSchema } },
  },
  403: {
    description:
      'Authenticated, but not permitted to act as the requested actor (session auth only).',
    content: { 'application/json': { schema: apiErrorSchema } },
  },
  429: {
    description: 'Rate limit exceeded for this user / key.',
    content: { 'application/json': { schema: apiErrorSchema } },
  },
  500: {
    description: 'Internal server error.',
    content: { 'application/json': { schema: apiErrorSchema } },
  },
} as const;

/**
 * Register every v1 entity route with the shared OpenAPI registry. Safe
 * to call more than once — the registry deduplicates on path+method.
 */
export function registerV1Routes(): void {
  // Auth scheme — applies to every protected route.
  openApiRegistry.registerComponent('securitySchemes', 'IntegrationKey', {
    type: 'apiKey',
    in: 'header',
    name: 'X-OrangeCat-Key',
    description:
      'Integration key minted at /settings/integrations. Format: `ock_<48-hex>`. Also accepted via standard `Authorization: Bearer ock_<48-hex>`. The key is bound to a single actor at mint time — every authenticated request acts as that actor.',
  });

  // Discovery endpoint — public, unauth'd.
  openApiRegistry.registerPath({
    method: 'get',
    path: PUBLIC_API_BASE,
    summary: 'API discovery',
    description:
      "Returns the contract version, base path, auth header hint, and every endpoint we promise to keep working under v1. SDKs should hit this once at startup to confirm they're talking to a server that speaks v1.",
    tags: ['Discovery'],
    responses: {
      200: {
        description: 'Discovery payload.',
        content: { 'application/json': { schema: z.unknown() } },
      },
    },
  });

  // Entity create + list endpoints.
  for (const entityType of PUBLIC_API_ENTITY_TYPES) {
    const schema = ENTITY_SCHEMAS[entityType];
    const meta = getEntityMetadata(entityType);
    const label = meta.name.replace(/\s+/g, '');

    const requestSchema =
      schema instanceof z.ZodObject
        ? schema.extend(ACTOR_ID_FIELD).openapi(`${label}Create`)
        : schema;

    const responseSchema = buildEntityResponseSchema(schema, label);

    openApiRegistry.registerPath({
      method: 'post',
      path: publicApiEndpoint(entityType),
      summary: `Create ${meta.name.toLowerCase()}`,
      description: meta.description,
      tags: [meta.name],
      security: [{ IntegrationKey: [] }],
      request: {
        body: {
          required: true,
          content: { 'application/json': { schema: requestSchema } },
        },
      },
      responses: {
        201: {
          description: `${meta.name} created successfully.`,
          content: {
            'application/json': {
              schema: apiSuccessSchema(responseSchema, `${label}CreateResponse`),
            },
          },
        },
        ...COMMON_ERROR_RESPONSES,
      },
    });

    openApiRegistry.registerPath({
      method: 'get',
      path: publicApiEndpoint(entityType),
      summary: `List ${meta.namePlural.toLowerCase()}`,
      description: `${meta.description} — integration-key auth returns rows owned by the key's bound actor; session auth returns the caller's rows.`,
      tags: [meta.name],
      security: [{ IntegrationKey: [] }],
      request: {
        query: z
          .object({
            limit: z.coerce
              .number()
              .int()
              .min(1)
              .max(100)
              .optional()
              .openapi({ description: 'Max rows to return. Default 20, max 100.' }),
            offset: z.coerce
              .number()
              .int()
              .min(0)
              .optional()
              .openapi({ description: 'Number of rows to skip.' }),
            category: z.string().optional().openapi({ description: 'Optional category filter.' }),
          })
          .openapi(`${label}ListQuery`),
      },
      responses: {
        200: {
          description: `Paginated list of ${meta.namePlural.toLowerCase()}.`,
          content: {
            'application/json': {
              schema: apiSuccessSchema(z.array(responseSchema), `${label}ListResponse`),
            },
          },
        },
        401: COMMON_ERROR_RESPONSES[401],
        429: COMMON_ERROR_RESPONSES[429],
        500: COMMON_ERROR_RESPONSES[500],
      },
    });
  }
}
