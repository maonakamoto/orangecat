import { redirect } from 'next/navigation';
import { ENTITY_REGISTRY } from '@/config/entity-registry';

/**
 * Legacy /create — used to be a client component that fired
 * router.replace() from useEffect, which caused a flash of an empty
 * page on first paint while React hydrated. A server redirect skips
 * the flash entirely and also lets the response be a real 307 instead
 * of a JS-driven nav.
 *
 * The /create/[entityType] sibling handles guessed paths like
 * /create/ai-assistant.
 */
export default function LegacyCreateRedirect() {
  redirect(ENTITY_REGISTRY['project'].createPath);
}
