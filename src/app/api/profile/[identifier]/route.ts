import { createAdminClient } from '@/lib/supabase/admin';
import { withOptionalAuth } from '@/lib/api/withAuth';
import { apiSuccess, apiNotFound, handleApiError } from '@/lib/api/standardResponse';
import { getTableName } from '@/config/entity-registry';
import { DATABASE_TABLES } from '@/config/database-tables';
import { ENTITY_STATUS } from '@/config/database-constants';
import { getOrCreateUserActor } from '@/services/actors/getOrCreateUserActor';

/**
 * GET /api/profile/[identifier] - Get profile by username or email
 *
 * Supports both username and email lookups for viewing other users' profiles
 */

/**
 * Account PII / internal columns on the `profiles` row that must NEVER be
 * returned from this UNAUTHENTICATED (withOptionalAuth) endpoint. Anyone can
 * call it — by username OR by email — so returning the raw row (the previous
 * `select('*')` + `{ ...profile }`) leaked emails, phones, and internal blobs
 * to any caller and turned the email branch into a harvesting oracle.
 *
 * This is a DENYLIST, not an allowlist, on purpose: `src/types/database.ts`
 * drifts from the live schema (prod has columns like `background`,
 * `inspiration_statement`, `location_context` that aren't typed here), so an
 * allowlist would silently drop real public display fields. New sensitive
 * columns MUST be added here. Contact is via in-app messaging, not raw email.
 */
const SENSITIVE_PROFILE_FIELDS = [
  'email',
  'contact_email',
  'phone',
  'verification_data',
  'privacy_settings',
  'payment_preferences',
  'preferences',
  'metadata',
  'last_login_at',
  'last_active_at',
  'onboarding_completed',
  'onboarding_wallet_setup_completed',
  'onboarding_first_project_created',
  'onboarding_method',
  'profile_completed_at',
  'terms_accepted_at',
  'privacy_policy_accepted_at',
  'location_search',
] as const;

function toPublicProfile(profile: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = { ...profile };
  for (const field of SENSITIVE_PROFILE_FIELDS) {
    delete clean[field];
  }
  return clean;
}

interface RouteContext {
  params: Promise<{ identifier: string }>;
}

export const GET = withOptionalAuth(async (request, context: RouteContext) => {
  try {
    const { identifier } = await context.params;

    if (!identifier?.trim()) {
      return apiNotFound('Profile identifier is required');
    }

    const { supabase } = request;
    const trimmedIdentifier = identifier.trim();
    const isEmail = trimmedIdentifier.includes('@');

    let profile = null;
    let error = null;
    let userId: string | null = null;

    if (isEmail) {
      // Try to find profile by email field first (if it exists in profiles table)
      const { data: profileByEmail, error: emailError } = await supabase
        .from(DATABASE_TABLES.PROFILES)
        .select('*')
        .eq('email', trimmedIdentifier)
        .single();

      if (!emailError && profileByEmail) {
        profile = profileByEmail;
        userId = profileByEmail.id;
      } else {
        // If email field doesn't exist in profiles, try to find user by email
        // in auth.users via the admin client. Uses the createAdminClient SSOT
        // (src/lib/supabase/admin.ts) so env-var fallback (SERVICE_ROLE_KEY
        // → SECRET_KEY → SERVICE_KEY) stays consistent with every other
        // server-side admin call.
        try {
          const adminClient = createAdminClient();
          // List users and find by email (compatible across versions)
          const { data: usersData, error: listError } = await adminClient.auth.admin.listUsers();
          if (!listError && usersData?.users) {
            const user = usersData.users.find(
              u => u.email?.toLowerCase() === trimmedIdentifier.toLowerCase()
            );
            if (user?.id) {
              userId = user.id;
            } else {
              return apiNotFound('Profile not found');
            }
          } else {
            return apiNotFound('Profile not found');
          }

          // Now fetch the profile by user ID
          if (userId) {
            const { data: profileById, error: profileError } = await supabase
              .from(DATABASE_TABLES.PROFILES)
              .select('*')
              .eq('id', userId)
              .single();

            if (!profileError && profileById) {
              profile = profileById;
            } else {
              error = profileError;
            }
          } else {
            return apiNotFound('Profile not found');
          }
        } catch {
          // createAdminClient returns a dummy proxy when service-role env vars
          // are missing; calling .auth.admin.listUsers on it throws. That's
          // expected — fall through to suggesting the username lookup.
          return apiNotFound('Profile not found. Please use username instead of email.');
        }
      }
    } else {
      // Look up by username
      const { data: profileByUsername, error: usernameError } = await supabase
        .from(DATABASE_TABLES.PROFILES)
        .select('*')
        .eq('username', trimmedIdentifier)
        .single();

      profile = profileByUsername;
      error = usernameError;
      if (profile) {
        userId = profile.id;
      }
    }

    if (error || !profile) {
      return apiNotFound('Profile not found');
    }

    // Calculate project count via actor_id (consistent with actor system)
    const resolvedUserId = userId || profile.id;
    let projectCount = 0;
    try {
      const actor = await getOrCreateUserActor(resolvedUserId);
      const { count } = await supabase
        .from(getTableName('project'))
        .select('*', { count: 'exact', head: true })
        .eq('actor_id', actor.id)
        .neq('status', ENTITY_STATUS.DRAFT); // Exclude drafts from public view
      projectCount = count || 0;
    } catch {
      // Non-fatal: profile still returned without count
    }

    return apiSuccess({ ...toPublicProfile(profile), project_count: projectCount });
  } catch (error) {
    return handleApiError(error);
  }
});
