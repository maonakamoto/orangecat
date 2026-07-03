import { redirect } from 'next/navigation';
import { ENTITY_REGISTRY } from '@/config/entity-registry';

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Documents have no public detail page — they are private context for the
 * Cat. Any generically-built public URL (registry publicBasePath + id)
 * lands here and is forwarded to the owner-only dashboard detail.
 */
export default async function DocumentPublicRedirect({ params }: PageProps) {
  const { id } = await params;
  redirect(`${ENTITY_REGISTRY['document'].basePath}/${id}`);
}
