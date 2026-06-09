import { redirect } from 'next/navigation';
import { ENTITY_REGISTRY, type EntityType } from '@/config/entity-registry';

/**
 * /create/[entityType] — catch-all that bounces guessed URLs (e.g.
 * /create/project, /create/ai-assistant) to the canonical create path
 * from ENTITY_REGISTRY. Previously these all 404'd because the create
 * flows live under /dashboard/<entity>/create.
 *
 * Nothing internal links here — this exists purely as a graceful
 * recovery for users who type the URL or follow stale external links.
 */
export default async function CreateEntityRedirect({
  params,
}: {
  params: Promise<{ entityType: string }>;
}) {
  const { entityType } = await params;

  // Look the slug up against the registry. If it's a known entity,
  // redirect to its canonical create path. If not, fall back to the
  // generic /create page which itself redirects to projects/create.
  const meta = ENTITY_REGISTRY[entityType as EntityType];
  redirect(meta?.createPath ?? '/create');
}
