/**
 * Public Job Postings API
 *
 * GET /api/jobs - Browse public job postings
 *
 * Follows Network State Development Guide - Job Postings feature
 */

import { NextRequest } from 'next/server';
import { apiSuccess, apiInternalError, handleApiError } from '@/lib/api/standardResponse';
import { getPublicJobPostings } from '@/services/groups/queries/proposals';
import { createServerClient } from '@/lib/supabase/server';
import { logger } from '@/utils/logger';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@/constants/pagination';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_PAGE_SIZE), 10))
    );
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));
    const location = searchParams.get('location') || undefined;
    const job_type = searchParams.get('job_type') || undefined;

    // Pass a server client — the service defaults to the browser client, which fails
    // server-side (auth.getUser()/queries throw) and 500s this public endpoint.
    const supabase = await createServerClient();
    const result = await getPublicJobPostings({ limit, offset, location, job_type }, supabase);

    if (!result.success) {
      return apiInternalError(result.error);
    }

    return apiSuccess({
      jobs: result.proposals,
      total: result.total,
    });
  } catch (error) {
    logger.error('Error in GET /api/jobs:', error);
    return handleApiError(error);
  }
}
