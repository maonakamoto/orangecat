/**
 * Shared auth for /api/cron/* routes.
 *
 * Replaces four per-route copies of
 *   authHeader === `Bearer ${process.env.CRON_SECRET}`
 * which FAILED OPEN: with CRON_SECRET unset, the template literal becomes
 * "Bearer undefined" and a request carrying that literal string was accepted
 * (found 2026-06-13 while installing the systemd cron on the Hetzner box).
 *
 * This helper fails closed (no/empty secret → reject everything) and uses a
 * timing-safe comparison.
 *
 * Created: 2026-06-13
 */

import { timingSafeEqual } from 'crypto';

export function verifyCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return false;
  }

  const expected = Buffer.from(`Bearer ${secret}`);
  const provided = Buffer.from(authHeader);
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}
