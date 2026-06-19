#!/usr/bin/env bash
#
# Migrate the self-hosted Supabase Storage file backend → Cloudflare R2,
# preserving object keys VERBATIM so existing rows in storage.objects keep
# resolving and every getPublicUrl() in the app stays valid.
#
# Runbook: docs/operations/STORAGE_R2_BACKEND.md
#
# WHY verbatim copy: storage-api uses the same logical key
# ({tenant}/{bucket}/{object}) for both the `file` and `s3` backends. The file
# backend mirrors those keys 1:1 as a directory tree, so copying the tree into
# R2 with identical keys reproduces exactly what the s3 backend expects — no
# need to understand the internal versioning layout, and no DB changes.
#
# Safety:
#   - DRY RUN by default. Pass --apply to actually transfer.
#   - COPY only. Never deletes or moves the source (no --delete, no sync).
#   - Idempotent: re-running copies only new/changed objects.
#
# Requires: rclone (https://rclone.org). Reads R2 creds from env (see below).
#
set -euo pipefail

# ---- args -------------------------------------------------------------------
SRC=""
BUCKET=""
APPLY=0
REMOTE="${RCLONE_R2_REMOTE:-}"   # optional: name of a preconfigured rclone remote

usage() {
  cat <<EOF
Usage: $0 --src <STORAGE_SRC> --bucket <R2_BUCKET> [--apply] [--remote <name>]

  --src <path>     Host path mounted to /var/lib/storage in supabase-storage
                   (find via: docker inspect supabase-storage -f '{{range .Mounts}}{{.Source}} -> {{.Destination}}{{"\\n"}}{{end}}')
  --bucket <name>  R2 bucket name (e.g. orangecat-media)
  --apply          Actually transfer (default is a dry run + count diff)
  --remote <name>  Use an existing rclone remote instead of env-configured creds

R2 credentials (when --remote is not given) are read from env:
  R2_ACCOUNT_ID, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
EOF
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --src)    SRC="${2:-}"; shift 2 ;;
    --bucket) BUCKET="${2:-}"; shift 2 ;;
    --remote) REMOTE="${2:-}"; shift 2 ;;
    --apply)  APPLY=1; shift ;;
    -h|--help) usage ;;
    *) echo "Unknown arg: $1" >&2; usage ;;
  esac
done

[[ -n "$SRC" && -n "$BUCKET" ]] || usage
command -v rclone >/dev/null 2>&1 || { echo "ERROR: rclone not installed (https://rclone.org/install/)"; exit 1; }
[[ -d "$SRC" ]] || { echo "ERROR: source dir not found: $SRC"; exit 1; }

# ---- build the rclone destination ------------------------------------------
# Two ways to point rclone at R2:
#   1) a named remote you've already `rclone config`'d  -> --remote <name>
#   2) inline creds via env (no config file needed)     -> R2_* / AWS_* env vars
if [[ -n "$REMOTE" ]]; then
  DEST="${REMOTE}:${BUCKET}"
  RCLONE_FLAGS=()
else
  : "${R2_ACCOUNT_ID:?set R2_ACCOUNT_ID (or pass --remote)}"
  : "${AWS_ACCESS_KEY_ID:?set AWS_ACCESS_KEY_ID (or pass --remote)}"
  : "${AWS_SECRET_ACCESS_KEY:?set AWS_SECRET_ACCESS_KEY (or pass --remote)}"
  DEST=":s3:${BUCKET}"
  RCLONE_FLAGS=(
    --s3-provider Cloudflare
    --s3-access-key-id "$AWS_ACCESS_KEY_ID"
    --s3-secret-access-key "$AWS_SECRET_ACCESS_KEY"
    --s3-endpoint "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
    --s3-region auto
    --s3-no-check-bucket
  )
fi

echo "Source : $SRC"
echo "Dest   : $DEST"
echo "Mode   : $([[ $APPLY -eq 1 ]] && echo APPLY || echo 'DRY RUN (pass --apply to transfer)')"
echo

# ---- pre-flight counts ------------------------------------------------------
LOCAL_COUNT=$(find "$SRC" -type f | wc -l | tr -d ' ')
echo "Local files: $LOCAL_COUNT"

# ---- run --------------------------------------------------------------------
# copy (not sync) => never deletes anything on either side.
COMMON=( "$SRC" "$DEST" --copy-links --transfers 16 --checkers 16 --progress "${RCLONE_FLAGS[@]}" )

if [[ $APPLY -eq 1 ]]; then
  rclone copy "${COMMON[@]}"
  echo
  echo "=== post-copy verification ==="
  rclone size "$DEST" "${RCLONE_FLAGS[@]}"
  R2_COUNT=$(rclone size "$DEST" "${RCLONE_FLAGS[@]}" --json | sed -E 's/.*"count":([0-9]+).*/\1/')
  echo "Local files: $LOCAL_COUNT   R2 objects: $R2_COUNT"
  if [[ "$LOCAL_COUNT" == "$R2_COUNT" ]]; then
    echo "✅ counts match"
  else
    echo "⚠️  counts differ — investigate before deleting any source data (re-run is safe/idempotent)"
  fi
else
  rclone copy "${COMMON[@]}" --dry-run
  echo
  echo "Dry run complete. Re-run with --apply to transfer."
fi
