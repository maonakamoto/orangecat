import { statfs } from 'node:fs/promises';
import os from 'node:os';

/**
 * Host (box) resource metrics for the health endpoint.
 *
 * OrangeCat runs as a standalone Node process directly on the Hetzner box (systemd
 * `orangecat-app`, not containerized), so `statfs('/')` and `os` read the REAL box
 * filesystem + RAM. Exposing these on /api/health lets the free off-box uptime
 * monitor (.github/workflows/uptime.yml) alert on disk/memory pressure — the single
 * box is the whole platform's failure domain, and a silent disk-full = hard outage.
 *
 * Percentages only — no paths, sizes, or anything sensitive — so this is safe on the
 * public health endpoint.
 */
export interface HostMetrics {
  /** Root filesystem usage %, or null if statfs is unavailable on this runtime. */
  disk_used_pct: number | null;
  /** RAM usage % (used / total). */
  mem_used_pct: number;
}

export async function getHostMetrics(): Promise<HostMetrics> {
  let disk_used_pct: number | null = null;
  try {
    const s = await statfs('/');
    // bavail = blocks available to unprivileged users — the number that actually
    // matters for "will writes start failing". total from `blocks`.
    if (s.blocks > 0) {
      disk_used_pct = Math.round((1 - s.bavail / s.blocks) * 100);
    }
  } catch {
    // statfs missing/blocked (older runtime, restricted sandbox) — report null rather
    // than failing the whole health check.
  }

  const total = os.totalmem();
  const mem_used_pct = total > 0 ? Math.round((1 - os.freemem() / total) * 100) : 0;

  return { disk_used_pct, mem_used_pct };
}
