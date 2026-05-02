import { createServerClient } from '@/lib/supabase/server';
import { DATABASE_TABLES } from '@/config/database-tables';

export type ServiceStatus = 'operational' | 'degraded' | 'outage';

export interface ServiceHealth {
  name: string;
  status: ServiceStatus;
}

export interface HealthReport {
  overall: ServiceStatus;
  timestamp: string;
  services: ServiceHealth[];
}

export async function checkHealth(): Promise<HealthReport> {
  const timestamp = new Date().toISOString();
  let dbStatus: ServiceStatus = 'operational';

  try {
    const supabase = await createServerClient();
    const { error } = await supabase.from(DATABASE_TABLES.PROFILES).select('id').limit(1);
    if (error) {
      dbStatus = 'outage';
    }
  } catch {
    dbStatus = 'outage';
  }

  // Auth shares Supabase — if DB is up, auth is up.
  const authStatus = dbStatus;

  const services: ServiceHealth[] = [
    { name: 'Website', status: 'operational' },
    { name: 'API', status: 'operational' },
    { name: 'Database', status: dbStatus },
    { name: 'Authentication', status: authStatus },
    { name: 'Bitcoin Integration', status: 'operational' },
  ];

  const overall: ServiceStatus = services.some(s => s.status === 'outage')
    ? 'outage'
    : services.some(s => s.status === 'degraded')
      ? 'degraded'
      : 'operational';

  return { overall, timestamp, services };
}
