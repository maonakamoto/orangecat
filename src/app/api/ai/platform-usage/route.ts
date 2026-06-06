import { createApiKeyService } from '@/services/ai/api-key-service';
import { withAuth, type AuthenticatedRequest } from '@/lib/api/withAuth';
import { apiSuccess, apiInternalError } from '@/lib/api/standardResponse';
import { logger } from '@/utils/logger';

// Returns the current user's free-tier platform usage envelope used by the Cat
// Controls panel and the BYOK onboarding flow. Backed by `checkPlatformUsage`
// in the api-key-service so the same shape is used wherever it's consumed.
export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const { user, supabase } = request;
    const keyService = createApiKeyService(supabase);
    const usage = await keyService.checkPlatformUsage(user.id);
    return apiSuccess(usage);
  } catch (error) {
    logger.error('Error fetching platform usage', error, 'PlatformUsageAPI');
    return apiInternalError('Internal server error');
  }
});
