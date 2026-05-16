/**
 * REDIRECT PAGE: /profile → /profiles/me
 *
 * This route is deprecated in favor of /profiles/me
 * Redirects are handled server-side for better SEO
 */

import { redirect } from 'next/navigation';
import { ROUTES } from '@/config/routes';

export default function ProfileRedirect() {
  redirect(ROUTES.PROFILES.ME);
}
