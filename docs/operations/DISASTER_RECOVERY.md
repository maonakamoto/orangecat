# OrangeCat — Disaster Recovery Runbook

**Scenario:** `bitbaum` (the Hetzner box) is lost or corrupted and OrangeCat must be
restored onto a fresh box. Last verified topology: 2026-06-18.

> ⚠️ Restore is only as good as the backups. See "Backup reality" below — as of
> 2026-06-18 backups are **local-only** (no off-site) and the **stack configs/secrets
> are not yet backed up**. Both are gaps to close before this runbook is fully reliable.

---

## The topology you must know

OrangeCat is **not** a standalone DB. The box runs **two separate Postgres**:

| Instance                                                   | Access                                     | Holds                                                        |
| ---------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------ |
| **Box-system Postgres**                                    | `sudo -u postgres psql`                    | fleetcrown, revampit, datacat, … (each own DB)               |
| **Supabase container** (`supabase-db`, host port **5433**) | `docker exec supabase-db psql -U postgres` | **OrangeCat** — in the `postgres` DB (~25 MB), + `_supabase` |

There is **no DB named `orangecat`** — OrangeCat lives in the Supabase container's
`postgres` DB. Always use the container path. (See `bug_orangecat_unbacked_two_postgres`.)

**Other moving parts on the box:**

- App: `/opt/orangecat/app` — systemd unit `orangecat-app` (User=ubuntu,
  ExecStart=`/opt/orangecat/app/launch.sh`, EnvironmentFile=`/opt/orangecat/app/.env`), port **4003**.
- Supabase stack: `/opt/supabase/docker/docker-compose.yml` (+ overrides).
- Reverse proxy: Caddy, `/etc/caddy/Caddyfile` (terminates TLS, routes orangecat.ch +
  supabase.orangecat.ch → the box).
- Backups: `/opt/backups/pg/` (daily, systemd `pg-backup.timer` 02:30 UTC) — now includes
  `supabase-postgres-*.dump`.
- DNS: `orangecat.ch` and `supabase.orangecat.ch` A-records → box IP.
- Deploy: GitHub Actions **CD** (`.github/workflows/cd.yml`) builds off-box + deploys.

---

## Restore procedure (fresh box)

### 0. Prerequisites you need in hand

- The latest `supabase-postgres-*.dump` (OrangeCat data) and `globals-*.sql.gz`.
- The Supabase stack `.env` (JWT_SECRET, ANON_KEY, SERVICE_ROLE_KEY, DB password) **and**
  the app `/opt/orangecat/app/.env`. ⚠️ **If these secrets are lost, the restored Supabase
  generates NEW keys and the app's keys won't match → auth breaks.** Keep them with the
  backups (encrypted). _(This config backup is the open gap — see below.)_
- The `Caddyfile`.

### 1. Provision + base

Order a Hetzner box (match specs: 8 vCPU / ≥16 GB / Ubuntu, ≥40 GB disk). Install Docker +
Docker Compose, Caddy, Node 20. Point DNS A-records at the new IP (orangecat.ch +
supabase.orangecat.ch).

### 2. Bring up the Supabase stack

Restore `/opt/supabase/docker/` (compose + overrides + **the same `.env`**), then:

```
cd /opt/supabase/docker && docker compose up -d
```

Wait for `supabase-db` healthy: `docker exec supabase-db pg_isready -U postgres`.

### 3. Restore OrangeCat data

```
# globals (roles/grants) first
gunzip -c globals-STAMP.sql.gz | docker exec -i supabase-db psql -U postgres
# the database
docker exec -i supabase-db pg_restore -U postgres -d postgres --clean --if-exists \
  < supabase-postgres-STAMP.dump
```

Verify: `docker exec supabase-db psql -U postgres -At -c "select count(*) from profiles"`.

### 4. Deploy the app

Easiest: trigger CD — `gh workflow run cd.yml --ref main` (it builds off-box + deploys to
the new box, **after** you restore `/opt/orangecat/app/.env` and the SSH deploy key in
`~/.ssh/authorized_keys`). Manual fallback: `scripts/deploy-selfhost.sh` from a dev machine.
The deploy auto-applies any pending migrations (`schema_migrations` table).

### 5. Caddy + verify

Restore `/etc/caddy/Caddyfile`, `systemctl reload caddy`. Then:

```
curl -s https://orangecat.ch/api/health   # expect {"status":"healthy"}
```

Smoke-test: load a profile, discover, log in.

---

## Backup reality & gaps (close these to make DR real)

1. **Off-site** — backups are LOCAL on the box (a disk loss loses them too). Free fix:
   Backblaze B2 10 GB free tier + restic (`/opt/backups/restic.env`). 1.5 MB fits trivially.
2. **Config/secret backup** — only DB dumps are backed up; the Supabase `.env` (JWT/service
   keys), app `.env`, Caddyfile, and compose are **not**. Add them (encrypted) to the backup
   set, or step 0/2/4 above can't be completed from backups alone.
3. **Versioned source** — `pg-backup.sh` lives in fleetcrown's `scripts/hetzner/`; the
   container-dump fix must be mirrored there or a reinstall reverts it.

## Quick reference

```
# Inspect OrangeCat data (ALWAYS the container, not sudo -u postgres):
ssh root@167.233.22.31 "docker exec supabase-db psql -U postgres -c '\dt'"
# Latest OrangeCat backup:
ssh root@167.233.22.31 "ls -lt /opt/backups/pg/supabase-postgres-*.dump | head -1"
# Run a backup now:
ssh root@167.233.22.31 "sudo /opt/backups/pg-backup.sh"
```
