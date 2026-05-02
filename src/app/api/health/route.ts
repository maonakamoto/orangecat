import { apiSuccess, apiServiceUnavailable } from '@/lib/api/standardResponse';
import { checkHealth } from '@/lib/health';

const CACHE = 'public, s-maxage=10, stale-while-revalidate=30';

// GET /api/health - lightweight liveness/readiness endpoint
export async function GET() {
  const report = await checkHealth();
  const healthy = report.overall === 'operational';

  const body = {
    status: healthy ? 'healthy' : 'unhealthy',
    timestamp: report.timestamp,
    services: Object.fromEntries(
      report.services.map(s => [s.name.toLowerCase().replace(' ', '_'), s.status])
    ),
  };

  const response = healthy
    ? apiSuccess(body)
    : apiServiceUnavailable('One or more services degraded', body);
  response.headers.set('Cache-Control', CACHE);
  return response;
}
