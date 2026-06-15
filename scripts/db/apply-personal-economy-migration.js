#!/usr/bin/env node

/**
 * Apply Personal Economy Migration — RETIRED
 *
 * This script applied a migration through the managed Supabase Cloud workflow,
 * which was removed 2026-06. The database is now self-hosted at
 * supabase.orangecat.ch on the Hetzner box. Apply SQL directly instead:
 *   psql "$POSTGRES_URL" -f supabase/migrations/20251202_create_personal_economy_tables.sql
 * See docs/operations/DECOMMISSION-CLOUD.md.
 */

console.error(
  'RETIRED: this script used the managed Supabase Cloud workflow (removed 2026-06). ' +
    'The DB is now self-hosted (supabase.orangecat.ch). Apply SQL via: ' +
    'psql "$POSTGRES_URL" -f supabase/migrations/20251202_create_personal_economy_tables.sql. ' +
    'See docs/operations/DECOMMISSION-CLOUD.md.'
);
process.exit(1);
