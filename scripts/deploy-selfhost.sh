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

echo "=== boot-test + atomic swap + health-check (with rollback) ==="
ssh "${SSH_OPTS[@]}" "$OC_BOX" \
  "BASE='$OC_APP_BASE' SVC='$OC_SERVICE' PORT='$OC_PORT' BOOT='$OC_BOOT_PORT' HEALTH='$OC_HEALTH' bash -s" <<'REMOTE'
set -euo pipefail
: "${BASE:?}" "${SVC:?}" "${PORT:?}" "${BOOT:?}" "${HEALTH:?}"

# carry over runtime config the staging tree intentionally excludes
cp "$BASE/app/.env" "$BASE/app-next/.env"
[ -f "$BASE/app/launch.sh" ] && cp "$BASE/app/launch.sh" "$BASE/app-next/launch.sh"
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

echo "=== verify public ==="
pub="$(curl -sL -o /dev/null -w '%{http_code}' --max-time 20 "$OC_PUBLIC" || echo 000)"
echo "public $OC_PUBLIC → $pub"
[ "$pub" = "200" ] || { echo "WARN: public health != 200 (Caddy/DNS?)" >&2; exit 1; }
echo "✅ deployed and live"
