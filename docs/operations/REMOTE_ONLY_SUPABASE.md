# Self-Hosted Supabase (Hetzner) — SSOT

The single source of truth for OrangeCat's database is the **self-hosted Supabase at `https://supabase.orangecat.ch`**, running on the Hetzner box. Do not run a separate local Supabase/Postgres against app code.

> ⚠️ **Managed Supabase Cloud retired 2026-06.** The managed-cloud guidance below (`supabase link --project-ref`, `db push`/`db dump` against the cloud project) is RETIRED. Schema work now happens against the self-hosted instance via SQL migrations + `psql` (access via the box / founder). Kept for reference.

- No `supabase start`, `supabase db start`, or Docker services for app development.
- Manage schema with migrations + `psql` against the self-hosted instance, or Studio SQL on the box.

Retired managed-cloud workflow (historical):

1. Link once
   SUPABASE_ACCESS_TOKEN=… supabase link --project-ref <ref> --workdir supabase

2. Create a migration (remote-intended)
   supabase migration new <name> --workdir supabase

3. Apply to remote
   SUPABASE_ACCESS_TOKEN=… supabase db push --workdir supabase --include-all

4. Verify
   SUPABASE_ACCESS_TOKEN=… supabase db dump --schema public --workdir supabase -f /tmp/public.sql

If CLI refuses due to history mismatches, prefer running SQL once in Studio, then align migrations in Git.
