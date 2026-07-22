/**
 * GET /api/tips/receive-info?username=X — public, secret-free check of whether a
 * person can receive Bitcoin tips and via what rail. Powers the tip dialog's
 * empty state without exposing any wallet details.
 */

import type { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import {
  apiBadRequest,
  apiInternalError,
  apiNotFound,
  apiSuccess,
} from '@/lib/api/standardResponse';
import { getTipReceiveInfo } from '@/domain/tips/tip-service';
import { logger } from '@/utils/logger';

export async function GET(request: NextRequest) {
  try {
    const username = new URL(request.url).searchParams.get('username')?.trim();
    if (!username) {
      return apiBadRequest('Missing username');
    }

    const supabase = await createServerClient();
    const info = await getTipReceiveInfo(supabase, username);
    if (!info) {
      return apiNotFound('Person');
    }

    return apiSuccess(info);
  } catch (error) {
    logger.error('tips/receive-info failed', error, 'TipsAPI');
    return apiInternalError('Could not load tip info.');
  }
}
