#!/usr/bin/env bash
#
# OrangeCat self-host deploy — atomic swap + boot-test + rollback.
#
# OrangeCat is one of the four hand-rolled "snowflake" services on bitbaum
# (not managed by fleetcrown/scripts/hetzner/sync-infra.sh, not in apps.conf):
# it keeps its own systemd unit + Caddy block and uses this safer deploy than
# the fleet's in-place `deploy.sh` (which rsyncs over the live tree with no
# rollback). The flow, proven in the runbook:
#
#   build standalone (off-box) → assemble static+public → rsync to a STAGING
#   dir → boot-test on a scratch port → atomic swap live↔staging (keep backup)
#   → restart service → health-check → auto-rollback on failure → verify public.
#
# The box build OOMs, so we always build locally / in CI and ship the artifact.
#
# Usage:
#   scripts/deploy-selfhost.sh              # build, then deploy
#   scripts/deploy-selfhost.sh --no-build   # deploy an already-built .next/standalone (CI)
#
# Config (env, with proven defaults):
#   OC_BOX        SSH target              (default root@167.233.22.31)
#   OC_APP_BASE   app dir on box          (default /opt/orangecat)
#   OC_SERVICE    systemd unit            (default orangecat-app)
#   OC_PORT       live port               (default 4003)
#   OC_BOOT_PORT  scratch boot-test port  (default 4099)
#   OC_HEALTH     health path             (default /api/health)
#   OC_PUBLIC     public health URL       (default https://orangecat.ch/api/health)
set -euo pipefail

OC_BOX="${OC_BOX:-root@167.233.22.31}"
OC_APP_BASE="${OC_APP_BASE:-/opt/orangecat}"
OC_SERVICE="${OC_SERVICE:-orangecat-app}"
OC_PORT="${OC_PORT:-4003}"
OC_BOOT_PORT="${OC_BOOT_PORT:-4099}"
OC_HEALTH="${OC_HEALTH:-/api/health}"
OC_PUBLIC="${OC_PUBLIC:-https://orangecat.ch/api/health}"
SSH_OPTS=(-o StrictHostKeyChecking=no -o BatchMode=yes -o ServerAliveInterval=15 -o ServerAliveCountMax=4)

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if [ "${1:-}" != "--no-build" ]; then
  # Fail fast: a ~30s type-check before the ~7-min build, so a type error never
  # costs a full build+rsync cycle to discover. (next build type-checks too, but
  # only after compiling.) type-check is non-incremental → deterministic.
  echo "=== type-check (fail fast) ==="
  npm run type-check
  echo "=== build (SELF_HOST=1) ==="
  SELF_HOST=1 npm run build
fi

ST="$REPO_ROOT/.next/standalone"
[ -d "$ST" ] || { echo "ERROR: no .next/standalone — build with SELF_HOST=1 first" >&2; exit 1; }

echo "=== assemble standalone (static + public) ==="
cp -r "$REPO_ROOT/.next/static" "$ST/.next/static"
[ -d "$REPO_ROOT/public" ] && cp -r "$REPO_ROOT/public" "$ST/public"

echo "=== rsync → $OC_BOX:$OC_APP_BASE/app-next ==="
for attempt in 1 2 3; do
  rsync -a --delete --no-perms --no-owner --no-group --omit-dir-times \
    -e "ssh ${SSH_OPTS[*]}" \
    "$ST"/ "$OC_BOX:$OC_APP_BASE/app-next/" && break
  echo "rsync attempt $attempt failed; retrying…" >&2
  [ "$attempt" = 3 ] && { echo "ERROR: rsync failed after 3 attempts" >&2; exit 1; }
done

echo "=== apply pending DB migrations → box ==="
# The self-host has no Supabase-CLI migration tracking, so the box silently drifted
# from supabase/migrations/* (the root cause of a whole class of prod 500s — a missed
# migration). Applied files are recorded in public.schema_migrations (one-time
# backfilled with the 147 pre-existing migrations on 2026-06-18, so only NEW files
# run). Apply any *.sql not yet recorded, in filename order, BEFORE the boot-test so
# the schema is ready before the new code runs. ON_ERROR_STOP + abort-on-fail leaves
# the current live release untouched, and we record a file only after it succeeds
# (re-runs stay safe because new migrations are written idempotently — IF NOT
# EXISTS / OR REPLACE).
#
# `-1` (single-transaction) is CRITICAL: it wraps each migration in BEGIN/COMMIT so a
# mid-file failure ROLLS BACK every statement. Without it, a migration that drops a
# view early then fails later (e.g. a stale out-of-order migration referencing a
# since-renamed column) leaves the schema half-applied — it dropped a live view the
# app needs but never recreated it (a real prod regression on 2026-06-19). No
# migration uses CREATE INDEX CONCURRENTLY (verified), so single-txn mode is safe.
applied="$(ssh "${SSH_OPTS[@]}" "$OC_BOX" "docker exec supabase-db psql -U postgres -tAc 'SELECT filename FROM public.schema_migrations'" 2>/dev/null || true)"
for mig in supabase/migrations/*.sql; do
  fn="$(basename "$mig")"
  printf '%s\n' "$applied" | grep -qxF "$fn" && continue
  echo "  → applying $fn"
  if cat "$mig" | ssh "${SSH_OPTS[@]}" "$OC_BOX" "docker exec -i supabase-db psql -U postgres -1 -v ON_ERROR_STOP=1 -q"; then
    ssh "${SSH_OPTS[@]}" "$OC_BOX" \
      "docker exec supabase-db psql -U postgres -q -c \"INSERT INTO public.schema_migrations(filename) VALUES ('$fn') ON CONFLICT DO NOTHING\"" >/dev/null
  else
    echo "ERROR: migration $fn failed — aborting deploy (live release untouched)" >&2
    exit 1
  fi
done
echo "  migrations up to date"

echo "=== schema-drift gate (deployed code vs LIVE box schema) ==="
# Migrations applying is necessary but not sufficient: the box can still lack an
# object the code needs — e.g. a migration that was backfilled-as-applied but never
# actually ran (the ai_conversations outage), or a manual DB change. Dump the box's
# REAL post-migration schema and fail the deploy if the code references a table/
# column that isn't there, BEFORE the swap — turning silent prod 500s into a loud
# deploy-time stop. Known pre-existing gaps are allowlisted in audit-schema-drift.mjs
# so this only blocks on NEW drift. A dump failure is non-fatal (don't block deploys
# on an ssh hiccup).
LIVE_SCHEMA_TMP="$(mktemp)"
if OC_BOX="$OC_BOX" bash scripts/db/dump-live-schema.sh > "$LIVE_SCHEMA_TMP" 2>/dev/null && [ -s "$LIVE_SCHEMA_TMP" ]; then
  if ! LIVE_SCHEMA_PATH="$LIVE_SCHEMA_TMP" node scripts/db/audit-schema-drift.mjs; then
    rm -f "$LIVE_SCHEMA_TMP"
    echo "ERROR: schema drift — deployed code references DB objects missing from the box (above)." >&2
    echo "       Add the missing migration (or allowlist if intentional). Aborting deploy; live release untouched." >&2
    exit 1
  fi
  rm -f "$LIVE_SCHEMA_TMP"
else
  rm -f "$LIVE_SCHEMA_TMP"
  echo "WARN: could not dump live schema for the drift gate — skipping (non-fatal)." >&2
fi

echo "=== boot-test + atomic swap + health-check (with rollback) ==="
ssh "${SSH_OPTS[@]}" "$OC_BOX" \
  "BASE='$OC_APP_BASE' SVC='$OC_SERVICE' PORT='$OC_PORT' BOOT='$OC_BOOT_PORT' HEALTH='$OC_HEALTH' bash -s" <<'REMOTE'
set -euo pipefail
: "${BASE:?}" "${SVC:?}" "${PORT:?}" "${BOOT:?}" "${HEALTH:?}"

# carry over runtime config the staging tree intentionally excludes
cp "$BASE/app/.env" "$BASE/app-next/.env"
[ -f "$BASE/app/launch.sh" ] && cp "$BASE/app/launch.sh" "$BASE/app-next/launch.sh"

# Ensure Node accepts large request headers. Default cap is 16KB; a browser with
# many accumulated sb-* auth cookies sends a Cookie header past that and gets a
# hard 431 (Request Header Fields Too Large) — "won't open in Brave". Raise to
# 64KB. Idempotent, so re-running / a freshly-regenerated launch.sh self-heals.
LSN="$BASE/app-next/launch.sh"
if [ -f "$LSN" ] && ! grep -q "max-http-header-size" "$LSN"; then
  sed -i 's#/usr/bin/node "#/usr/bin/node --max-http-header-size=65536 "#' "$LSN"
fi

chown -R ubuntu:ubuntu "$BASE/app-next"

# boot-test the staged build on a scratch port before touching the live tree
LOG="$(sudo -u ubuntu mktemp /tmp/oc-boottest.XXXX.log)"
( cd "$BASE/app-next" && sudo -u ubuntu env PORT="$BOOT" sh -c 'node server.js > '"$LOG"' 2>&1 &' )
ok=000
for _ in $(seq 1 20); do
  code="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$BOOT$HEALTH" || echo 000)"
  [ "$code" = "200" ] && { ok=200; break; }
  read -t 1 _ </dev/zero 2>/dev/null || true
done
pkill -f 'app-next/server.js' 2>/dev/null || true
[ "$ok" != "200" ] && { echo "BOOT-TEST FAILED ($ok)"; tail -25 "$LOG"; exit 1; }
echo "boot-test: OK"

# atomic swap: live → app-old, staging → live (keep app-old for rollback)
rm -rf "$BASE/app-old"
mv "$BASE/app" "$BASE/app-old"
mv "$BASE/app-next" "$BASE/app"
chown -R ubuntu:ubuntu "$BASE/app"

systemctl restart "$SVC"
live=000
for _ in $(seq 1 20); do
  code="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT$HEALTH" || echo 000)"
  [ "$code" = "200" ] && { live=200; break; }
  read -t 1 _ </dev/zero 2>/dev/null || true
done

if [ "$live" != "200" ]; then
  echo "HEALTH FAILED ($live) — ROLLING BACK"
  mv "$BASE/app" "$BASE/app-broken"
  mv "$BASE/app-old" "$BASE/app"
  systemctl restart "$SVC"
  exit 1
fi

rm -rf "$BASE/app-old"
echo "DEPLOY_OK (local health 200)"
REMOTE

echo "=== ensure Caddy kills HTTP/3 (Brave/QUIC self-heal) ==="
# Root cause this guards against: Caddy defaults to HTTP/3, advertising
# `alt-svc: h3` for 30 days. Brave honours that cached alt-svc aggressively and
# hangs when QUIC is in any way flaky (SSE/streaming over h3 timed out on this
# box) — so the site "won't open in Brave" while Chrome silently falls back to
# h2. Two complementary guards, both idempotent, both re-asserted every deploy
# because the box Caddyfile is hand-maintained and these get dropped on rewrite:
#   1. global `{ servers { protocols h1 h2 } }` — stops NEW h3 advertising.
#   2. `header Alt-Svc "clear"` in the orangecat.ch block — actively EVICTS h3
#      entries already cached in a visitor's Brave (protocols-only can't undo a
#      cache that was set before h3 was disabled; this is why Brave kept hanging).
# (install -m 644: the file MUST stay readable by the caddy service user, or
# `systemctl reload caddy` fails with permission-denied.)
ssh "${SSH_OPTS[@]}" "$OC_BOX" 'bash -s' <<'CADDY_GUARD' || echo "WARN: caddy h3-guard step failed (non-fatal)" >&2
set -e
CF=/etc/caddy/Caddyfile
changed=0
backup_once() { [ "$changed" = 0 ] && cp "$CF" "$CF.bak.$(date +%Y%m%d-%H%M%S)"; changed=1; }

# Guard 1: global protocols h1 h2 (no new h3 advertising)
if grep -q "protocols h1 h2" "$CF"; then
  echo "caddy h3-guard(protocols): already present — ok"
else
  echo "caddy h3-guard(protocols): MISSING -> prepending global protocols h1 h2"
  backup_once
  TMP=$(mktemp)
  printf '{\n\tservers {\n\t\tprotocols h1 h2\n\t}\n}\n\n' > "$TMP"
  cat "$CF" >> "$TMP"
  mv "$TMP" "$CF"
fi

# Guard 2: Alt-Svc: clear in the orangecat.ch block (evict already-cached h3)
if awk '/^orangecat\.ch, www\.orangecat\.ch \{/{f=1} f{print} /^\}/{if(f)exit}' "$CF" | grep -qi "Alt-Svc"; then
  echo "caddy h3-guard(alt-svc): already present — ok"
else
  echo "caddy h3-guard(alt-svc): MISSING -> adding header Alt-Svc clear to orangecat.ch"
  backup_once
  TMP=$(mktemp)
  awk '/^orangecat\.ch, www\.orangecat\.ch \{/{print; print "\theader Alt-Svc \"clear\""; next} {print}' "$CF" > "$TMP"
  mv "$TMP" "$CF"
fi

if [ "$changed" = 1 ]; then
  if caddy validate --adapter caddyfile --config "$CF" >/dev/null 2>&1; then
    chmod 644 "$CF"; systemctl reload caddy && echo "caddy h3-guard: applied + reloaded"
  else
    echo "caddy h3-guard: validate FAILED — restoring backup" >&2
    cp "$(ls -t "$CF".bak.* | head -1)" "$CF"
  fi
else
  echo "caddy h3-guard: nothing to change"
fi
CADDY_GUARD

echo "=== verify public ==="
pub="$(curl -sL -o /dev/null -w '%{http_code}' --max-time 20 "$OC_PUBLIC" || echo 000)"
echo "public $OC_PUBLIC → $pub"
[ "$pub" = "200" ] || { echo "WARN: public health != 200 (Caddy/DNS?)" >&2; exit 1; }
echo "✅ deployed and live"
