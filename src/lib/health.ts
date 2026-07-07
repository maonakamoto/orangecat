import { createServerClient } from '@/lib/supabase/server';
import { DATABASE_TABLES } from '@/config/database-tables';
import { Redis } from '@upstash/redis';

export type ServiceStatus = 'operational' | 'degraded' | 'outage';

interface ServiceHealth {
  name: string;
  status: ServiceStatus;
}

interface HealthReport {
  overall: ServiceStatus;
  timestamp: string;
  services: ServiceHealth[];
}

const PROBE_TIMEOUT_MS = 3000;

// Bound every probe so one slow dependency can't hang the health endpoint (and
// thus the uptime monitor). A timed-out probe is treated as failed by its caller.
async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let t: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    t = setTimeout(() => reject(new Error('probe timeout')), ms);
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    clearTimeout(t!);
  }
}

// Real round-trip to the DB (not an inference). Any error/timeout = outage.
async function probeDatabase(): Promise<ServiceStatus> {
  try {
    const supabase = await createServerClient();
    const { error } = await withTimeout(
      Promise.resolve(supabase.from(DATABASE_TABLES.PROFILES).select('id').limit(1)),
      PROBE_TIMEOUT_MS
    );
    return error ? 'outage' : 'operational';
  } catch {
    return 'outage';
  }
}

// Probe GoTrue directly — auth can be down while the DB is up (the old code
// inferred "db up ⇒ auth up", which hid a GoTrue-only outage).
async function probeAuth(): Promise<ServiceStatus> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) {
    return 'outage';
  }
  try {
    const res = await withTimeout(
      fetch(`${base}/auth/v1/health`, { cache: 'no-store' }),
      PROBE_TIMEOUT_MS
    );
    return res.ok ? 'operational' : 'outage';
  } catch {
    return 'outage';
  }
}

// PING the rate-limit Redis. Non-paging: when Upstash isn't configured the app
// falls back to an in-memory limiter (fine in dev), and a Redis blip degrades
// rate limiting but not the site — so this never flips `overall` to outage.
async function probeCache(): Promise<ServiceStatus> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return 'operational';
  }
  try {
    const redis = new Redis({ url, token });
    const pong = await withTimeout(redis.ping(), PROBE_TIMEOUT_MS);
    return pong === 'PONG' ? 'operational' : 'degraded';
  } catch {
    return 'degraded';
  }
}

export async function checkHealth(): Promise<HealthReport> {
  const timestamp = new Date().toISOString();

  const [dbStatus, authStatus, cacheStatus] = await Promise.all([
    probeDatabase(),
    probeAuth(),
    probeCache(),
  ]);

  const services: ServiceHealth[] = [
    // Website + API are trivially operational: this endpoint is serving the request.
    { name: 'Website', status: 'operational' },
    { name: 'API', status: 'operational' },
    { name: 'Database', status: dbStatus },
    { name: 'Authentication', status: authStatus },
    { name: 'Cache', status: cacheStatus },
    { name: 'Bitcoin Integration', status: 'operational' },
  ];

  // Only the CRITICAL dependencies (DB, auth) can flip the site to unhealthy and
  // page the uptime monitor. Cache degradation is surfaced for visibility but
  // stays non-paging (the in-memory fallback keeps the site working).
  const overall: ServiceStatus =
    dbStatus === 'outage' || authStatus === 'outage' ? 'outage' : 'operational';

  return { overall, timestamp, services };
}
