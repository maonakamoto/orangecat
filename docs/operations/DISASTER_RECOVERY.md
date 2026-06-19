# OrangeCat — Disaster Recovery Runbook

**Scenario:** `bitbaum` (the Hetzner box) is lost or corrupted and OrangeCat must be
restored onto a fresh box. Last verified topology: 2026-06-19.

> ✅ As of 2026-06-19 the two historical gaps are CLOSED: backups are pushed **off-site**
> (encrypted, restic → Backblaze B2 `b2:orangecat-restic:bitbaum-pg`) **and** the stack
> **configs/secrets are now in the backup set** (`/opt/backups/config` → same B2 snapshot:
> Supabase `.env`, app `.env`, Caddyfile, all `docker-compose*.yml`). A from-scratch restore
> is now possible from the off-site backup alone.

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

### 0. Prerequisites — pull everything from the off-site (B2) backup

Everything needed is in the encrypted restic repo `b2:orangecat-restic:bitbaum-pg`. You need
the `restic.env` values (RESTIC_PASSWORD + the B2 key) — keep a copy somewhere OUTSIDE the box
(password manager). With those, restore the whole set to a scratch dir:

```
# On any machine with restic + the restic.env values exported:
restic restore latest --target /restore        # pulls /opt/backups/{pg,config}
ls /restore/opt/backups/pg                      # *.dump + globals-*.sql.gz
ls /restore/opt/backups/config                  # supabase.env, orangecat-app.env, Caddyfile, docker-compose*.yml
```

- DB: latest `supabase-postgres-*.dump` (OrangeCat data) + `globals-*.sql.gz` (under `pg/`).
- Secrets/config (under `config/`): `supabase.env`, `orangecat-app.env`, `Caddyfile`, and all
  `docker-compose*.yml`. ⚠️ **These secrets MUST be the originals** — if lost, a fresh Supabase
  mints NEW keys that won't match the restored app → auth breaks. (Now backed up; see below.)

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

## Backup reality & status

1. ✅ **Off-site** — restic → Backblaze B2 (`b2:orangecat-restic:bitbaum-pg`), nightly, encrypted.
2. ✅ **Config/secret backup** (closed 2026-06-19) — `pg-backup.sh` now stages the Supabase `.env`,
   app `.env`, Caddyfile and all `docker-compose*.yml` into `/opt/backups/config` (600 root) and
   restic pushes it in the same snapshot. **Restore mapping** (where each staged file goes back):
   `supabase.env → /opt/supabase/docker/.env`, `orangecat-app.env → /opt/orangecat/app/.env`,
   `Caddyfile → /etc/caddy/Caddyfile`, `docker-compose*.yml → /opt/supabase/docker/`.
3. ⏳ **Versioned source (still open)** — `pg-backup.sh` lives in fleetcrown's `scripts/hetzner/`;
   BOTH the container-dump fix AND this config-backup block are box-local edits that a fleetcrown
   `install-backups.sh` reinstall would revert. Mirror them into that installer (cross-project).

## Quick reference

```
# Inspect OrangeCat data (ALWAYS the container, not sudo -u postgres):
ssh root@167.233.22.31 "docker exec supabase-db psql -U postgres -c '\dt'"
# Latest OrangeCat backup (local):
ssh root@167.233.22.31 "ls -lt /opt/backups/pg/supabase-postgres-*.dump | head -1"
# Run a backup now (DB dumps + config/secrets → B2):
ssh root@167.233.22.31 "sudo /opt/backups/pg-backup.sh"
# Verify the off-site snapshot includes configs:
ssh root@167.233.22.31 "set -a; . /opt/backups/restic.env; set +a; restic snapshots --latest 1; restic ls latest | grep /opt/backups/config/"
```
