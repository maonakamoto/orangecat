# Decommission the Managed Supabase Cloud Project

**Goal:** retire the managed Supabase Cloud project and make the self-hosted
Supabase on Hetzner (`https://supabase.orangecat.ch`) the only database.

**Status of the repo side (done in code, 2026-06-15):**

- `.env.local` repointed to `supabase.orangecat.ch` (cloud + Vercel/Turbo cruft dropped; backup in `.env-backups/`)
- `next.config.js` image host = self-host only (cloud host removed)
- `.claude/CLAUDE.md` + `.claude/rules/domain-specific.md` rewritten: self-host is SSOT, **do not use the Supabase MCP** (it only reaches the managed cloud)
- Active docs under `docs/` updated; `docs/archive/**` left as history

**What remains is the founder's to run** (this agent has no SSH to the box and
cannot reach `supabase.orangecat.ch`; it can only reach the managed cloud, so it
must NOT be the one to delete it).

---

## Managed project being retired

| Field       | Value                              |
| ----------- | ---------------------------------- |
| Project ref | `ohkueislstxomdjavyhs`             |
| Host        | `ohkueislstxomdjavyhs.supabase.co` |
| Org         | `conkscndiljdvkhvwbpo`             |

---

## Step 1 — Confirm the self-host is authoritative (DO NOT SKIP)

Do **not** pause or delete the cloud until parity is proven. Run the same query
on **both** the cloud and the self-host and compare.

```sql
-- Run on cloud (Supabase SQL editor for ohkueislstxomdjavyhs)
-- AND on self-host: psql "$POSTGRES_URL" on the Hetzner box.
select 'profiles' t, count(*) from profiles
union all select 'notifications', count(*) from notifications
union all select 'transactions', count(*) from transactions
union all select 'actors', count(*) from actors;

-- Auth users
select count(*) from auth.users;

-- Freshness: latest activity should be on the SELF-HOST, not the cloud
select max(created_at) from notifications;
select max(created_at) from profiles;
```

✅ Proceed only if the self-host counts are **>=** cloud and its `max(created_at)`
is **newer**. If the cloud is still fresher, production traffic is still hitting
the cloud — stop and fix the cutover first.

## Step 2 — Take a final cloud backup (safety net)

```bash
# From any machine with the cloud DB connection string:
pg_dump "postgresql://postgres:<pw>@db.ohkueislstxomdjavyhs.supabase.co:5432/postgres" \
  --no-owner --format=custom -f cloud-final-$(date +%Y%m%d).dump
# Store off-box (e.g. encrypted in the founder's backup location). Keep >= 90 days.
```

Also export Storage buckets and any Auth settings/SMTP/OAuth provider config you
still need, since those don't come through `pg_dump`.

## Step 3 — Confirm no app points at the cloud anymore

```bash
# On the Hetzner box, the running app env must show the self-host:
grep SUPABASE_URL /path/to/orangecat/.env*   # -> supabase.orangecat.ch
# Optional: watch the cloud project's API logs for ~24–48h; traffic should be ~0.
```

## Step 4 — Pause first (reversible), observe, then delete

1. **Pause** the project in the Supabase dashboard
   (`Settings → General → Pause project`). Pausing is reversible.
2. Watch the app for 24–48h. If anything breaks, it was still depending on the
   cloud — resume and re-do Step 1/3.
3. When confident, **delete** the project
   (`Settings → General → Delete project`).

## Step 5 — Revoke cloud-only credentials

These only mattered for the managed cloud and must be rotated/revoked:

- **`SUPABASE_ACCESS_TOKEN`** (Management API / MCP token) — revoke at
  `supabase.com/dashboard/account/tokens`. It was dropped from `.env.local`
  during cutover; ensure it's gone from any CI/secrets store too.
- The cloud `anon` / `service_role` keys die with the project, but scrub them
  from any password manager / CI that referenced the cloud explicitly.
- Remove the managed project from the Supabase **MCP** configuration so no agent
  accidentally reaches it again.

## Step 6 — Final repo sweep (optional tidy)

Historical references intentionally remain under `docs/archive/**` and inside the
banner-marked `docs/workflows/*MIGRATION*` tutorials. If you want them gone too:

```bash
grep -rIn 'ohkueislstxomdjavyhs' . | grep -v node_modules | grep -v '/.next/'
```

---

## Rollback

Until Step 4's delete, rollback is: resume the cloud project, then
`cp .env-backups/.env.local.pre-selfhost-cutover.* .env.local` (and revert
`next.config.js`). After deletion, rollback means restoring the Step 2 dump into
a new project — so do not delete until Step 4's observation window is clean.
