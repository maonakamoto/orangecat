# Platform Lightning Wallet Runbook — provision `PLATFORM_NWC_URI` → first payment

**Owner:** Founder (this involves a real wallet + its secret — an agent must not do it).
**Why it matters:** This one env var is the single blocker gating **Cat Credit top-ups** and **paid AI assistants**. Both are code-complete. Until it's set, OrangeCat has processed **0 payments ever**. Setting it → the platform can receive its first real Lightning payment.

---

## How it works (30-second version)

- OrangeCat receives credit purchases into **a wallet it controls** (OC's own revenue wallet — _not_ a user wallet; users stay non-custodial).
- That wallet is configured via **one NWC connection string**: `PLATFORM_NWC_URI`.
- NWC ([Nostr Wallet Connect](https://nwc.dev)) is an abstraction, so this can point at a hosted wallet (Alby Hub) now and a self-hosted LNbits/BTCPay node later **with zero code change**.
- Code path: `src/lib/bitcoin/platform-wallet.ts` reads the env → `initiateTopUp()` issues a Lightning invoice via `makeInvoice` → settlement is detected by polling `lookupInvoice` (same pattern OC already uses for seller payments).
- When unset, top-up reports "not enabled" and everything else (balance, history, metering) is unaffected. **It fails safe.**

---

## Step 1 — Get an NWC connection string

Recommended source: **Alby Hub** (self-custodial, gives you a real Lightning node you control).

1. Go to **https://albyhub.com** → create a hub (or use an existing one).
2. In the hub, open **Connections → App → Add Connection** (a.k.a. "Connect app").
3. Name it `orangecat-platform`. Grant these permissions: **make invoice**, **lookup invoice**, **get balance** (read + receive; it does _not_ need send/pay for top-ups).
4. Copy the generated **NWC URI**. It looks like:
   ```
   nostr+walletconnect://<64-char-hex-pubkey>?relay=wss://relay.getalby.com/v1&secret=<64-char-hex-secret>&lud16=you@getalby.com
   ```
   Validation OC applies (`isValidNWCUri`): must start with `nostr+walletconnect://` and carry `relay=` and `secret=`.

> Any NWC-capable wallet works (Alby, Mutiny, self-hosted LNbits with the NWC extension). Alby Hub is the fastest path to a node you actually own.

## Step 2 — Set it on the production box

Production env lives at **`/opt/orangecat/app/.env`** on the Hetzner box (`bitbaum`). The app runs as systemd unit **`orangecat-app.service`**.

Run these (paste your real URI). You can run them from your machine — in this session, prefix with `!` to run inline:

```bash
ssh root@167.233.22.31

# 1. Back up the env first (never edit prod env without a backup)
cp /opt/orangecat/app/.env /opt/orangecat/app/.env.bak.$(date +%Y%m%d%H%M%S)

# 2. Append the platform wallet URI (quote it — it contains & and ?)
printf '\nPLATFORM_NWC_URI="nostr+walletconnect://<pubkey>?relay=<relay>&secret=<secret>&lud16=<lnaddr>"\n' \
  >> /opt/orangecat/app/.env

# 3. Restart the app so it picks up the new env
systemctl restart orangecat-app.service

# 4. Confirm it booted
systemctl status orangecat-app.service --no-pager | head -5
curl -s -o /dev/null -w '%{http_code}\n' https://orangecat.ch/api/health   # expect 200
```

**Security:** the NWC secret is a spending/receiving credential. Keep it only in `/opt/orangecat/app/.env` (git-ignored, box-only). Never paste it into chat, a PR, or a client-visible (`NEXT_PUBLIC_*`) var. If it ever leaks, revoke that connection in Alby Hub and mint a new one.

## Step 3 — One live top-up test (this is the "first payment")

**No code change needed to test.** The Settings → AI top-up button auto-enables
from the env: `GET /api/cat/credits` returns `topupEnabled = platformReceiveEnabled()`
(true the moment `PLATFORM_NWC_URI` is set), and `CatCreditsPanel` enables "Top up"
off that server flag — it does **not** wait on `CAT_CREDITS_LIVE`. So right after
Step 2's restart:

1. Log in at **https://orangecat.ch** → **Settings → AI** → the **Cat Credits** panel.
   The **Top up** button is now enabled (it was "Top up (soon)" before). _(The
   pricing-page "credits card" still says "Activating" until Step 4 — that one is
   cosmetic; use the Settings → AI panel to test.)_
2. Request the **minimum** top-up: **0.00001 BTC (1,000 sats)** — bounds are `MIN_TOPUP_BTC=0.00001`, `MAX_TOPUP_BTC=0.01` (`src/services/cat/credit-topup.ts`).
3. Scan/pay the invoice from any Lightning wallet.
4. Within a few seconds the balance credits and a ledger entry appears in the same
   panel (the client polls `lookupInvoice`). ✅ **That is OrangeCat's first real payment** —
   and you can watch for it right there (balance + per-message ledger).

If it doesn't credit: check `journalctl -u orangecat-app.service -n 100 --no-pager` for `CatCredits` log lines (`initiateTopUp` / `checkTopUp`), and confirm the Alby connection has invoice + lookup permissions.

## Step 4 — Flip the marketing card to "Live" (cosmetic — I do this after)

`src/config/cat-plans.ts` has `export const CAT_CREDITS_LIVE = false;`. This flag ONLY
controls the pricing-page card's badge/CTA ("Activating" + "Back us…" → "Live" + "Top
up credits"). It does **not** gate the actual top-up (Step 3 works without it). Once
you confirm the top-up credited, ping me and I'll flip it to `true` and ship (small PR

- CD deploy). Safe to flip any time after Step 2, but doing it after Step 3 keeps the
  public "Live" badge honest.

---

## Verification checklist

- [ ] `curl https://orangecat.ch/api/health` → 200 after restart
- [ ] Cat Credits top-up issues a real invoice (no "not enabled")
- [ ] Paying the invoice credits the balance (first payment ✅)
- [ ] `CAT_CREDITS_LIVE = true` shipped after the live test
- [ ] `.env.bak.*` backup exists on the box

## Rollback

Remove the `PLATFORM_NWC_URI` line (or restore `.env.bak.*`) and `systemctl restart orangecat-app.service`. Top-up returns to "not enabled"; nothing else is affected. Revert the `CAT_CREDITS_LIVE` flip if it was shipped.

---

_Related: `docs/business/executive/master-plan-2026-07.md` (step 0.1), `src/lib/bitcoin/platform-wallet.ts`, `src/app/api/cat/credits/topup/route.ts`, `src/services/cat/credit-topup.ts`._
