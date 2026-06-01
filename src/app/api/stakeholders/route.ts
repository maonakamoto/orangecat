/**
 * Stakeholder Relationships API
 *
 * Typed edges between projects and the eight stakeholder categories
 * (competitor / collaborator / investor / customer / employee /
 * acquirer / acquisition_target / in_house_dev) — the cross-product
 * stakeholder graph documented in the Thoughts essay "Where
 * Stakeholders Live" on cockpitapp.vercel.app.
 *
 * GET    /api/stakeholders?fromProjectId=<uuid>&kind=<kind>
 *        — list relationships for a project (and optionally filter by kind).
 * POST   /api/stakeholders
 *        — create a new typed edge from the caller's project to a
 *          stakeholder. Stakeholder target is one of: another actor,
 *          another project, or an external URL.
 *
 * Backed by the stakeholder_relationships table — see migration
 * 20260601000000_create_stakeholder_relationships.sql. RLS in the
 * database is the authoritative ownership check; the validation here
 * is defence in depth.
 */

import { z } from 'zod';
import { withAuth, type AuthenticatedRequest } from '@/lib/api/withAuth';
import {
  apiSuccess,
  apiCreated,
  apiBadRequest,
  apiValidationError,
  apiNotFound,
  apiInternalError,
  apiUnauthorized,
} from '@/lib/api/standardResponse';
import { logger } from '@/utils/logger';

// =====================================================================
// SHAPES
// =====================================================================

const STAKEHOLDER_KINDS = [
  'competitor',
  'collaborator',
  'investor',
  'customer',
  'employee',
  'acquirer',
  'acquisition_target',
  'in_house_dev',
] as const;

const createSchema = z
  .object({
    fromProjectId: z.string().uuid('fromProjectId must be a UUID'),
    kind: z.enum(STAKEHOLDER_KINDS),
    toActorId: z.string().uuid().optional(),
    toProjectId: z.string().uuid().optional(),
    toExternalUrl: z.string().url().optional(),
    toExternalName: z.string().min(1).max(200).optional(),
    status: z.string().max(50).optional(),
    confidence: z.number().int().min(0).max(100).optional(),
    notes: z.string().max(5000).optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .refine(
    data => {
      // Exactly one "to" target must be provided. Mirror the database
      // CHECK constraint here so we fail fast with a clear message
      // instead of bubbling a Postgres error.
      const set = [data.toActorId, data.toProjectId, data.toExternalUrl].filter(Boolean).length;
      return set === 1;
    },
    {
      message: 'Exactly one of toActorId, toProjectId, or toExternalUrl must be set',
    }
  );

// =====================================================================
// GET — list relationships for a project (the caller must own it via RLS)
// =====================================================================

export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const { supabase } = request;
    const url = new URL(request.url);
    const fromProjectId = url.searchParams.get('fromProjectId');
    const kindFilter = url.searchParams.get('kind');

    if (!fromProjectId) {
      return apiBadRequest('fromProjectId query parameter is required');
    }

    let query = supabase
      .from('stakeholder_relationships')
      .select('*')
      .eq('from_project_id', fromProjectId)
      .order('updated_at', { ascending: false });

    if (kindFilter) {
      if (!(STAKEHOLDER_KINDS as readonly string[]).includes(kindFilter)) {
        return apiBadRequest(`kind must be one of: ${STAKEHOLDER_KINDS.join(', ')}`);
      }
      query = query.eq('kind', kindFilter);
    }

    const { data, error } = await query;
    if (error) {
      logger.error('Failed to list stakeholder relationships', error, 'StakeholdersAPI');
      return apiInternalError('Failed to load stakeholders');
    }

    return apiSuccess({ relationships: data ?? [] });
  } catch (error) {
    logger.error('Unexpected error in GET /api/stakeholders', error, 'StakeholdersAPI');
    return apiInternalError('Internal server error');
  }
});

// =====================================================================
// POST — create a new stakeholder relationship
// =====================================================================

export const POST = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const { user, supabase } = request;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiBadRequest('Invalid JSON body');
    }

    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError('Invalid request', parsed.error.flatten());
    }
    const input = parsed.data;

    // Resolve the caller's actor — the owner of the relationship row.
    // RLS would block writes for the wrong actor; we set it explicitly
    // here so the row is well-formed up front.
    const { data: actorRow, error: actorErr } = await supabase
      .from('actors')
      .select('id')
      .eq('user_id', user.id)
      .eq('actor_type', 'user')
      .maybeSingle();
    if (actorErr || !actorRow) {
      logger.error('No actor found for authenticated user', actorErr, 'StakeholdersAPI');
      return apiUnauthorized('No actor associated with this user');
    }
    const ownerActorId = actorRow.id as string;

    // Guard: the from_project must belong to the caller. RLS on
    // projects would already enforce this on read, but we verify the
    // relationship explicitly so the error message is meaningful.
    const { data: projectRow, error: projectErr } = await supabase
      .from('projects')
      .select('id, actor_id')
      .eq('id', input.fromProjectId)
      .maybeSingle();
    if (projectErr) {
      logger.error('Failed to verify project ownership', projectErr, 'StakeholdersAPI');
      return apiInternalError('Failed to verify project');
    }
    if (!projectRow) {
      return apiNotFound('Project not found');
    }
    if (projectRow.actor_id !== ownerActorId) {
      return apiUnauthorized('You can only add stakeholders to your own projects');
    }

    const row = {
      owner_actor_id: ownerActorId,
      from_project_id: input.fromProjectId,
      kind: input.kind,
      to_actor_id: input.toActorId ?? null,
      to_project_id: input.toProjectId ?? null,
      to_external_url: input.toExternalUrl ?? null,
      to_external_name: input.toExternalName ?? null,
      status: input.status ?? null,
      confidence: input.confidence ?? null,
      notes: input.notes ?? null,
      metadata: input.metadata ?? {},
    };

    const { data: inserted, error: insertErr } = await supabase
      .from('stakeholder_relationships')
      .insert(row)
      .select('*')
      .single();

    if (insertErr) {
      logger.error('Failed to insert stakeholder relationship', insertErr, 'StakeholdersAPI');
      return apiInternalError('Failed to create stakeholder relationship');
    }

    return apiCreated({ relationship: inserted });
  } catch (error) {
    logger.error('Unexpected error in POST /api/stakeholders', error, 'StakeholdersAPI');
    return apiInternalError('Internal server error');
  }
});
