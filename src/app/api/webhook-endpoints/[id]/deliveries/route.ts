/**
 * GET /api/webhook-endpoints/[id]/deliveries
 *
 * Lists the most recent deliveries for one endpoint so the
 * /settings/integrations deliveries drawer can show status, attempt
 * count, response code, timestamps.
 *
 * Auth: Supabase session only — the deliveries drawer is a human
 * operator view, not an integration surface. We re-use the
 * ownership check from webhookEndpointsService (404 on mismatch to
 * avoid leaking endpoint existence to probers).
 *
 * Created: 2026-06-04
 */

import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiUnauthorized,
  apiNotFound,
  handleApiError,
} from '@/lib/api/standardResponse';
import { listRecentDeliveriesForEndpoint } from '@/services/webhooks/deliveryService';
import { userOwnsEndpoint } from '@/services/webhooks/webhookEndpointsService';

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

function parseLimit(url: string): number {
  try {
    const param = new URL(url).searchParams.get('limit');
    if (!param) {
      return DEFAULT_LIMIT;
    }
    const parsed = Number.parseInt(param, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return DEFAULT_LIMIT;
    }
    return Math.min(parsed, MAX_LIMIT);
  } catch {
    return DEFAULT_LIMIT;
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return apiUnauthorized();
    }

    const { id } = await params;
    const owns = await userOwnsEndpoint(id, user.id);
    if (!owns) {
      return apiNotFound('Webhook endpoint');
    }

    const limit = parseLimit(req.url);
    const deliveries = await listRecentDeliveriesForEndpoint(id, limit);

    return apiSuccess({ deliveries });
  } catch (error) {
    return handleApiError(error);
  }
}
