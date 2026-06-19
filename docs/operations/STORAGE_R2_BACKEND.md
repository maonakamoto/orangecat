# OrangeCat Media → Cloudflare R2 (Supabase Storage backend swap)

**Status:** prepared, not yet applied — needs box access (`supabase.orangecat.ch` on bitbaum).
**Last updated:** 2026-06-19

---

## What this is (and what it is NOT)

OrangeCat stores all media through the **Supabase Storage API** (`supabase.storage.from(...)`)
in four places: profile avatars/banners, wishlist proofs, project media, and timeline media.
Buckets (SSOT `src/config/database-tables.ts`): `avatars`, `banners`, `project-media`,
`proofs`, `documents`.

This change repoints the **storage _backend_** of the self-hosted Supabase Storage container
from the box's **local disk** to **Cloudflare R2**. The application keeps calling
`supabase.storage` exactly as today.

- ✅ **No app code changes.**
- ✅ **No DB rewrite.** `getPublicUrl()` returns
  `…/storage/v1/object/public/<bucket>/<path>` — always served _through_ Supabase Storage,
  which proxies to whatever backend is configured. Every URL already stored in the DB stays
  valid after the swap.
- ✅ **SSOT intact** — bucket names unchanged.
- ❌ This is **not** a rewrite to call R2 directly, and **not** a per-bucket public r2.dev URL
  scheme. Those would require touching code and rewriting stored URLs. We're not doing that.

**Why:** off-box durability + free egress + a clean CDN story later, and it relieves the
shared bitbaum disk/backup burden. Doing it as a backend swap costs the same later as now, so
it's driven by the durability win, not urgency.

---

## Prerequisites (Cloudflare dashboard — founder, ~3 min)

OrangeCat gets its **own** bucket and its **own** least-privilege token — separate from
`revampit` and `fleetcrown-media`. (This is why rolling RevampIT's token does not touch OC.)

1. **R2 → Create bucket:** `orangecat-media` (or your preferred name — note it for `GLOBAL_S3_BUCKET`).
2. **R2 → Manage R2 API Tokens → Create API token:**
   - Permissions: **Object Read & Write**
   - Scope: **Apply to specific buckets only → `orangecat-media`** (least privilege)
   - Create, then copy the **Access Key ID**, **Secret Access Key**, and the
     **S3 endpoint** `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` (shown once).
3. Hand the three values to the box step below. Do **not** paste the secret into any repo.

---

## Storage container env (box: bitbaum, the self-hosted Supabase stack)

Add/merge into the **storage** service env (the `supabase-storage` container env / the stack's
`.env` consumed by it). Values verified against Supabase self-hosting docs for an
S3-compatible backend on R2.

```bash
# --- backend selection ---
STORAGE_BACKEND=s3

# --- R2 connection ---
GLOBAL_S3_BUCKET=orangecat-media
GLOBAL_S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
GLOBAL_S3_PROTOCOL=https
GLOBAL_S3_FORCE_PATH_STYLE=true     # safe/correct for R2 (S3-compatible, non-AWS)
REGION=auto                         # R2 ignores region; "auto" is the sig-calc value
AWS_DEFAULT_REGION=auto
AWS_ACCESS_KEY_ID=<R2_ACCESS_KEY_ID>
AWS_SECRET_ACCESS_KEY=<R2_SECRET_ACCESS_KEY>

# --- R2 gotcha: R2 has no S3 object tagging ---
# Without this, resumable (TUS) uploads fail with HTTP 500 mentioning x-amz-tagging.
TUS_ALLOW_S3_TAGS=false
```

### ⚠️ TENANT_ID must NOT change

Storage keys are laid out as `{TENANT_ID}/{bucket}/{object}`. The default tenant is `stub`.
The migration copies the existing tree **verbatim**, so the live `TENANT_ID` must stay exactly
what it is today. **Do not introduce a new `TENANT_ID`** — if it's currently unset (default
`stub`), leave it unset; if it's set, keep the same value. Mismatch = every existing object
404s.

Confirm the current value before flipping:

```bash
docker exec supabase-storage env | grep -E 'TENANT_ID|STORAGE_BACKEND|FILE_STORAGE_BACKEND_PATH'
```

---

## Migration order (zero stored-URL breakage)

The only window of risk is files uploaded _between_ the bulk copy and the env flip. We close
it with a second incremental pass. OC's media volume is small and traffic is low, so this is a
few minutes.

1. **Locate the live file backend** (host path behind the storage container's
   `/var/lib/storage`, default `FILE_STORAGE_BACKEND_PATH`):

   ```bash
   docker inspect supabase-storage \
     -f '{{ range .Mounts }}{{ .Source }} -> {{ .Destination }}{{ "\n" }}{{ end }}'
   ```

   The host source mapped to `/var/lib/storage` is `STORAGE_SRC` below.

2. **Bulk copy** (source stays untouched — this is a copy, never a move):

   ```bash
   scripts/storage/migrate-storage-to-r2.sh --src <STORAGE_SRC> --bucket orangecat-media
   # runs a dry-run first and prints a count diff; re-run with --apply to execute
   ```

3. **Flip env + restart** the storage container (low-traffic moment):

   ```bash
   docker compose up -d supabase-storage   # or: docker restart supabase-storage
   ```

4. **Final incremental pass** — catches anything written to disk during the flip:

   ```bash
   scripts/storage/migrate-storage-to-r2.sh --src <STORAGE_SRC> --bucket orangecat-media --apply
   ```

5. **Verify** (see below).

6. **Keep the old on-disk data** as a backup until verified for a few days. Do **not** delete
   `STORAGE_SRC` in this change.

---

## Verification

```bash
# a) container is on the s3 backend
docker exec supabase-storage env | grep STORAGE_BACKEND   # => s3

# b) object counts match (script prints this; or compare manually)
#    local: find <STORAGE_SRC> -type f | wc -l
#    r2:    rclone size r2:orangecat-media

# c) existing media still loads (URL unchanged) — pick a real avatar URL from the DB:
#    select 'https://supabase.orangecat.ch/storage/v1/object/public/avatars/'||name
#    from storage.objects where bucket_id='avatars' limit 1;
#    curl -I <that-url>   => 200

# d) NEW upload works end-to-end:
#    upload an avatar in the app, confirm it appears, and confirm a new key shows up in R2:
#    rclone lsf r2:orangecat-media/stub/avatars/ | tail
```

App smoke (any one): change profile avatar/banner, upload a wishlist proof, add project media.

---

## Rollback

The original bytes are still on disk (we only copied). To revert:

1. Restore the previous storage env (`STORAGE_BACKEND=file`, remove the `GLOBAL_S3_*` /
   `AWS_*` / `TUS_ALLOW_S3_TAGS` lines).
2. Restart `supabase-storage`.
   Stored URLs are unaffected — they always go through the Storage API.

Any media uploaded _while on R2_ would not be on disk; if you must roll back after a period on
R2, rclone those keys back to `STORAGE_SRC` first (reverse of the migration script).

---

## Sibling apps on the same shared R2 token (RevampIT, FleetCrown)

Decision (2026-06-19): one shared account-wide R2 token across `revampit-media`,
`fleetcrown-media`, `orangecat-media`. After the leaked token is **rolled** (Access Key ID
unchanged, secret changes), each app's box needs the **new secret** — replace in place and
reload, don't append duplicates.

**RevampIT** (`docker-compose.prod.yml`, service `app`, reads `S3_SECRET_ACCESS_KEY`):

```bash
ssh ubuntu@167.233.22.31
read -rsp "Paste R2 secret: " S && echo
sudo sed -i '/^S3_SECRET_ACCESS_KEY=/d' /opt/revampit/app/.env
printf 'S3_SECRET_ACCESS_KEY=%s\n' "$S" | sudo tee -a /opt/revampit/app/.env >/dev/null
unset S && echo "✓ secret replaced"
cd /opt/revampit/app && sudo docker compose -f docker-compose.prod.yml up -d app
exit
```

**FleetCrown**: same pattern — confirm its env var name + box path + restart verb, then
replace-and-reload identically. (Whoever owns the FC box has those specifics.)

Key reload rule: `docker compose restart` does **not** re-read env; use `up -d` to recreate.

## Follow-ups (optional, later)

- **Backups:** R2 gives durability, but add `orangecat-media` to the off-site backup story
  (B2 or R2-versioning) so it isn't single-copy. (Tracked alongside the box backup gap.)
- **CDN domain:** attach a custom domain to `orangecat-media` only if you ever bypass the
  Storage proxy for public assets; not needed for the proxied `getPublicUrl()` path.
