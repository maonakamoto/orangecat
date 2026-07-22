/**
 * POST /api/tips/invoice { username, amountBtc } — generate a non-custodial
 * Bitcoin payment request to the recipient's own wallet. Anonymous tippers are
 * allowed (easy UX); IP rate-limited to protect recipients' NWC relays from
 * invoice-generation abuse. Nothing is written to the DB and OrangeCat never
 * touches the funds.
 */

import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { rateLimit, createRateLimitResponse } from '@/lib/rate-limit';
import { apiBadRequest, apiError, apiInternalError, apiSuccess } from '@/lib/api/standardResponse';
import { TIP_MAX_BTC, TIP_MIN_BTC } from '@/config/tips';
import { generateTipInvoice } from '@/domain/tips/tip-service';
import { logger } from '@/utils/logger';

const bodySchema = z.object({
  username: z.string().trim().min(1).max(60),
  amountBtc: z.number().positive().min(TIP_MIN_BTC).max(TIP_MAX_BTC),
});

export async function POST(request: NextRequest) {
  try {
    const rl = await rateLimit(request);
    if (!rl.success) {
      return createRateLimitResponse(rl);
    }

    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return apiBadRequest('Invalid request', parsed.error.flatten());
    }

    const supabase = await createServerClient();
    const result = await generateTipInvoice(supabase, parsed.data.username, parsed.data.amountBtc);
    if (!result.ok) {
      return apiError(result.error, 'TIP_UNAVAILABLE', 400);
    }

    return apiSuccess({ invoice: result.invoice });
  } catch (error) {
    logger.error('tips/invoice failed', error, 'TipsAPI');
    return apiInternalError('Could not create a tip request.');
  }
}
