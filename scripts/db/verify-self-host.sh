#!/usr/bin/env bash
#
# Verify auth + registration against the self-hosted Supabase (Hetzner).
#
# Runs from any machine that can reach the HTTPS API (supabase.orangecat.ch:443
# via Caddy) — no Postgres/SSH access required. It exercises the REAL signup
# path and confirms a new user gets profile + actor + plan rows, i.e. that the
# auth.users bootstrap (migration 20260615000003) is live.
#
# Usage:
#   ./scripts/db/verify-self-host.sh            # uses .env.local
#   ENV_FILE=.env.production ./scripts/db/verify-self-host.sh
#
# Exit code 0 = all green; non-zero = something is broken (details printed).
# The throwaway test user is always deleted, even on failure.
set -uo pipefail

ENV_FILE="${ENV_FILE:-.env.local}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "✗ $ENV_FILE not found (run from repo root or set ENV_FILE)" >&2
  exit 2
fi
set -a; source "$ENV_FILE"; set +a

URL="${NEXT_PUBLIC_SUPABASE_URL:-}"
ANON="${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}"
SRK="${SUPABASE_SERVICE_ROLE_KEY:-}"

for v in URL:"$URL" ANON:"$ANON" SRK:"$SRK"; do
  if [[ -z "${v#*:}" ]]; then echo "✗ missing ${v%%:*} in $ENV_FILE" >&2; exit 2; fi
done

command -v python3 >/dev/null || { echo "✗ python3 required" >&2; exit 2; }

HOST="$(echo "$URL" | sed -E 's#https?://([^/]+).*#\1#')"
echo "=== verify-self-host → $HOST ==="
PASS=0; FAIL=0
ok()   { echo "  ✓ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ✗ $1"; FAIL=$((FAIL+1)); }
jget() { python3 -c "import sys,json;d=json.load(sys.stdin);print(eval('d'+sys.argv[1]) if d else '')" "$1" 2>/dev/null; }

# --- 1. reachability + auth config --------------------------------------------
echo "[1] reachability & GoTrue config"
SET=$(curl -sS -m 12 -H "apikey: $ANON" "$URL/auth/v1/settings" 2>/dev/null)
if [[ -z "$SET" ]]; then bad "GoTrue /settings unreachable"; else
  DSIGN=$(echo "$SET" | python3 -c "import sys,json;print(json.load(sys.stdin).get('disable_signup'))" 2>/dev/null)
  [[ "$DSIGN" == "False" ]] && ok "signups enabled (disable_signup=false)" || bad "disable_signup=$DSIGN"
fi
RC=$(curl -sS -m 12 -o /dev/null -w "%{http_code}" -H "apikey: $ANON" "$URL/rest/v1/" 2>/dev/null)
[[ "$RC" == "200" ]] && ok "REST reachable (200)" || bad "REST returned $RC"

# --- 2. signup (the real registration path) -----------------------------------
echo "[2] signup"
TS=$(date +%s)
EMAIL="selfhost-verify+${TS}@orangecat.test"
PW="Verify-${TS}-Aa1!"
SU=$(curl -sS -m 20 -X POST "$URL/auth/v1/signup" \
      -H "apikey: $ANON" -H "Content-Type: application/json" \
      -d "{\"email\":\"$EMAIL\",\"password\":\"$PW\"}" 2>/dev/null)
NEWID=$(echo "$SU" | python3 -c "import sys,json;print(json.load(sys.stdin).get('user',{}).get('id',''))" 2>/dev/null)
TOKEN=$(echo "$SU" | python3 -c "import sys,json;print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)
if [[ -z "$NEWID" ]]; then
  bad "signup did not return a user id: $(echo "$SU" | head -c 200)"
  echo; echo "RESULT: $PASS passed, $FAIL failed"; exit 1
fi
ok "signup created user ${NEWID:0:8}…"
[[ -n "$TOKEN" ]] && ok "session returned (autoconfirm on)" || bad "no session token (email confirm required?)"

cleanup() {
  curl -sS -m 15 -o /dev/null -X DELETE "$URL/auth/v1/admin/users/$NEWID" \
    -H "apikey: $SRK" -H "Authorization: Bearer $SRK" 2>/dev/null
  echo "  (cleaned up test user ${NEWID:0:8}…)"
}
trap cleanup EXIT

# --- 3. login -----------------------------------------------------------------
echo "[3] login"
LRC=$(curl -sS -m 15 -o /dev/null -w "%{http_code}" -X POST "$URL/auth/v1/token?grant_type=password" \
      -H "apikey: $ANON" -H "Content-Type: application/json" \
      -d "{\"email\":\"$EMAIL\",\"password\":\"$PW\"}" 2>/dev/null)
[[ "$LRC" == "200" ]] && ok "password login (200)" || bad "login returned $LRC"

# --- 4. bootstrap rows (service role → bypasses RLS) ---------------------------
echo "[4] registration bootstrap (profile / actor / plan)"
sleep 1
check_row() {  # $1 table  $2 filter  $3 label
  # Exact count via Content-Range header — table-agnostic (no column assumptions)
  local n
  n=$(curl -sS -m 15 -I -H "apikey: $SRK" -H "Authorization: Bearer $SRK" \
        -H "Prefer: count=exact" "$URL/rest/v1/$1?$2&select=*&limit=1" 2>/dev/null \
        | tr -d '\r' | sed -nE 's#^[Cc]ontent-[Rr]ange: .*/([0-9]+)$#\1#p')
  if [[ "${n:-0}" -ge 1 ]] 2>/dev/null; then ok "$3 created (rows=$n)"; else
    bad "$3 MISSING (rows=${n:-0}) — apply migration 20260615000003 on the box"
  fi
}
check_row profiles   "id=eq.$NEWID"                  "profile"
check_row actors     "user_id=eq.$NEWID&actor_type=eq.user" "actor"
check_row user_plans "user_id=eq.$NEWID"             "plan"

# --- summary ------------------------------------------------------------------
echo
echo "RESULT: $PASS passed, $FAIL failed"
[[ "$FAIL" -eq 0 ]] && echo "✅ self-host auth + registration GREEN" || echo "❌ see ✗ above"
exit $(( FAIL > 0 ? 1 : 0 ))
