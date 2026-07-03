import { redirect } from 'next/navigation';
import { ENTITY_REGISTRY } from '@/config/entity-registry';

/**
 * Documents have no public surface — they are private context for the Cat.
 * The registry declares publicBasePath '/documents' for type-uniformity
 * (share/SEO helpers build URLs from it), so this route must resolve:
 * send visitors to the owner's dashboard (auth-gated there).
 */
export default function DocumentsPublicRedirect() {
  redirect(ENTITY_REGISTRY['document'].basePath);
}
