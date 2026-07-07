import { statfs, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
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
 * Percentages / ages only — no paths, sizes, or anything sensitive — so this is safe
 * on the public health endpoint.
 */
export interface HostMetrics {
  /** Root filesystem usage %, or null if statfs is unavailable on this runtime. */
  disk_used_pct: number | null;
  /** RAM usage % (used / total). */
  mem_used_pct: number;
  /**
   * Hours since the most recent local DB backup file was written, or null when
   * the backup dir is absent/unreadable/empty (e.g. dev, CI, or a perms issue on
   * the box). Lets the off-box monitor alert if backups silently stop — a broken
   * pg-backup timer otherwise surfaces only when a restore is attempted.
   */
  last_backup_age_hours: number | null;
}

// Where the box's local Postgres dumps land (restic then ships these off-site to
// B2). Overridable so the box can point elsewhere without a code change. The app
// process only needs read+traverse on this dir; if it lacks that, the metric is
// null (no false "stale" alert — absence of signal, not a bad signal).
const BACKUP_DIR = process.env.OC_BACKUP_DIR || '/opt/backups/pg';

async function getLastBackupAgeHours(): Promise<number | null> {
  try {
    const entries = await readdir(BACKUP_DIR);
    let newestMtimeMs = 0;
    for (const name of entries) {
      try {
        const st = await stat(join(BACKUP_DIR, name));
        if (st.isFile() && st.mtimeMs > newestMtimeMs) {
          newestMtimeMs = st.mtimeMs;
        }
      } catch {
        // Unreadable entry — skip it, don't fail the whole scan.
      }
    }
    if (newestMtimeMs === 0) {
      return null; // dir exists but holds no backup files yet
    }
    return Math.round((Date.now() - newestMtimeMs) / 3_600_000);
  } catch {
    // Dir missing/unreadable (dev, CI, restricted perms) → unknown, not stale.
    return null;
  }
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

  const last_backup_age_hours = await getLastBackupAgeHours();

  return { disk_used_pct, mem_used_pct, last_backup_age_hours };
}
