# Database Migrations (Self-Hosted)

**SSOT script**: `scripts/apply-migrations.sh` — the only sanctioned way SQL from
`supabase/migrations/*.sql` reaches the box DB. Manual `psql` of a migration is the
drift class this exists to kill: the file runs but is never recorded, or is recorded
but never ran, and prod 500s appear weeks later.

## Where the database lives

OrangeCat's DB is the **`postgres` database inside the `supabase-db` container** on
bitbaum (`root@167.233.22.31`) — never the box-system Postgres. All access goes
through `docker exec supabase-db psql -U postgres -d postgres`.

## Tracking

Applied files are recorded in **`public.schema_migrations`**:

```sql
CREATE TABLE public.schema_migrations (
  filename   text PRIMARY KEY,          -- e.g. 20260702000000_payment_intents_lnurl_verify.sql
  applied_at timestamptz NOT NULL DEFAULT now()
);
```

There is no Supabase-CLI tracking (`supabase_migrations` schema does not exist on the
self-host); this table is ours and it is the truth. It was one-time **backfilled on
2026-06-18** with the 147 migrations that pre-dated tracking, so historical files are
never re-run. Reconciled 2026-07-03: 162 tracked rows == 162 repo files, zero pending.

## How it runs

`scripts/deploy-selfhost.sh` calls `scripts/apply-migrations.sh` **before** the
boot-test/atomic-swap, so the schema is ready before new code goes live. A migration
failure **aborts the deploy non-zero** with the failing filename — the current live
release is untouched. CD (`.github/workflows/cd.yml`) runs `deploy-selfhost.sh
--no-build`, so merged migrations auto-apply on every deploy.

Per file, the script:

1. Ensures the tracking table exists (`CREATE TABLE IF NOT EXISTS`).
2. Computes pending = repo files minus tracked filenames, in filename order.
3. Runs each pending file in a **single transaction** (`psql -1 -v ON_ERROR_STOP=1`)
   — a mid-file failure rolls back _every_ statement. (Without `-1`, a migration that
   drops a view then fails later leaves the schema half-applied; that was a real prod
   regression on 2026-06-19. Corollary: **no `CREATE INDEX CONCURRENTLY`** in
   migrations — it can't run inside a transaction.)
4. Records the filename **only after** the file succeeds.
5. Aborts on first failure, printing the failing filename.

### Safety guards (each earned by a real incident)

- **List-fetch integrity check**: the tracked list and its `count(*)` are fetched in
  one psql call and must agree, else abort. A silently-truncated list over ssh once
  made an already-applied 2025 migration look pending and re-execute against prod
  (observed 2026-07-03 during testing; harmless that time — `CREATE OR REPLACE` only).
- **Per-file recheck**: immediately before executing a file, the DB is asked again
  whether it's recorded; if yes, it's skipped. Never trust a cached list to run SQL.
- **Backfill guard**: if the tracking table is empty but core app tables
  (`profiles`/`actors`) exist, the script refuses to run and demands `--backfill` —
  replaying 160+ historical migrations against a populated DB would be catastrophic.

## Usage

```bash
scripts/apply-migrations.sh --dry-run    # list pending, change nothing
scripts/apply-migrations.sh              # apply + record pending
scripts/apply-migrations.sh --backfill   # bootstrap only: record ALL current files as
                                         # applied WITHOUT running them (fresh tracking
                                         # table on a DB that already has the schema)
```

Config via env: `OC_BOX` (default `root@167.233.22.31`), `OC_DB_CONTAINER`
(default `supabase-db`), `OC_MIGRATIONS_DIR` (default `supabase/migrations`).

## Writing migrations

- Filename: `YYYYMMDDHHMMSS_description.sql` — order is lexicographic.
- Idempotent by habit (`IF NOT EXISTS` / `OR REPLACE` / `ON CONFLICT`): the tracking
  table prevents re-runs, but idempotency is the second parachute.
- Never edit a migration after it's merged/applied — write a new one.
- No `CREATE INDEX CONCURRENTLY` (see single-transaction rationale above).
- Migrations apply on the _next deploy_. If code in the same PR needs the schema,
  that's fine — migrations run before the swap. If the schema must change _without_
  a deploy, run `scripts/apply-migrations.sh` directly from the repo.

## Known caveat: backfill lies

Backfilling marks a file applied without proof it ever ran. At least one backfilled
file (`20250130000001_add_postgis_search.sql`) had in fact never run on the box
(PostGIS RPCs; callers degrade gracefully). The schema-drift gate in
`deploy-selfhost.sh` (`scripts/db/audit-schema-drift.mjs` vs a live schema dump)
exists to catch exactly this "recorded but not real" class before a swap.
