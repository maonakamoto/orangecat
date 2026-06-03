# Codebase Audit Report

**Date**: 2026-06-03 (revised end-of-session)
**Auditor**: Claude (Opus 4.7, 1M context)
**Branch**: main
**Status**: current — supersedes all prior `AUDIT_REPORT.md` / `CODEBASE_EVALUATION_REPORT.md` / `DOCUMENTATION_AUDIT_*.md` files (now under `docs/archive/2026-h1/`).

This document is the **single source of truth** for the platform's current state. Update it after substantive work; do not write parallel "audit" / "evaluation" / "report" files alongside it.

---

## Executive summary

This session delivered **12 commits across two repos** that took OrangeCat from "internal entity registry with a Cat UI" to "platform with a versioned public API, integration keys, OpenAPI spec, TypeScript SDK, idempotency dedup, and a first cross-product integration with FleetCrown." The contract design is Silicon-Valley-grade; operational maturity (tests, observability, webhooks) is a known follow-up.

The 14-dormant-Next.js-apps observation in the prior audit is still true; the recommendation to archive them under `~/dev/archive/` is now noted as a separate portfolio-level move.

---

## Health score

| Area                                |    Score | Notes                                                                                                                                                                              |
| ----------------------------------- | -------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| First Principles (SSOT propagation) |     7/10 | Brand, layout, routes, public API, integration keys all flow from explicit SSOTs. Two model registries still coexist (P2 follow-up).                                               |
| API contract design                 |     9/10 | Versioning, OpenAPI generation from Zod, error catalogue, idempotency contract, SDK guidance — all in place.                                                                       |
| API operational maturity            | **3/10** | **Zero tests on the new API surface; no observability; no webhooks; concurrency race in idempotency under heavy parallel retry.** Fine for one consumer, needs work before second. |
| Mobile UX (action-first)            |     6/10 | Cat hub responsive, mobile FAB neutralised, dashboard greeting fixed. "Your Impact" mobile redesign still pending.                                                                 |
| Chat parity with Grok/x.ai          |     8/10 | One brand mark per chrome zone, model picker prominent, secondary panels as `?tab=`. Polish + sparse tiffany audit remain.                                                         |
| Repo hygiene                        |     6/10 | 99 stale docs archived this commit. 14 dormant Next.js apps in `~/dev/` still pending move to `archive/`. SDK vendored as tarball (publish to npm when ready).                     |
| **Overall**                         | **7/10** | Strong contract design + working SDK + first integration. Two clear gaps: operational maturity and portfolio attention.                                                            |

---

## What shipped this session (chronological)

| Commit     | Repo       | Outcome                                                                                           |
| ---------- | ---------- | ------------------------------------------------------------------------------------------------- |
| `096d6b9c` | orangecat  | Geometric brand mark + neutral primary palette + brand SSOT (`src/config/brand.ts`, `BrandMark*`) |
| `6380a145` | orangecat  | Chat-first `/dashboard/cat` + responsive toolbar + `layout-chrome.ts` SSOT                        |
| `e9393cc6` | orangecat  | Shell P0 fixes: neutral mobile FAB, bottom-nav padding, dashboard greeting skeleton kill          |
| `b17b2534` | orangecat  | "Create as personal/group" actor switcher in entity wizards                                       |
| `57838cad` | orangecat  | `integration_keys` table + service (mint, verify, list, revoke)                                   |
| `f634cc1d` | orangecat  | `X-OrangeCat-Key` auth path + key management API                                                  |
| `99df914c` | orangecat  | `/settings/integrations` UI to mint/view/revoke keys                                              |
| `f54acf9a` | orangecat  | `/api/v1/*` versioned public surface                                                              |
| `b6eecbea` | orangecat  | OpenAPI 3.1 spec generated from Zod schemas + `docs/api/CONVENTIONS.md`                           |
| `85116742` | orangecat  | `@orangecat/sdk@0.1.0` workspace package — ESM, retries, idempotency, typed errors                |
| `1e96998`  | fleetcrown | Loop A: subscriptions mirror into OrangeCat via the SDK                                           |
| `126f731b` | orangecat  | Idempotency-Key dedup on `/api/v1` POSTs                                                          |
| `01285ed2` | orangecat  | GET via integration-key auth + SDK 0.2.0 `.list()`                                                |
| `acb8148`  | fleetcrown | Persist `orangecat_service_id` + render "OC ✓" badge on `/money`                                  |

`tsc` ✓ + `eslint` ✓ on every commit. 12 OrangeCat commits ahead of `origin/main`; 0 FleetCrown commits ahead (already pushed by user).

---

## Active SSOT files (the ones to update when state changes)

| Concern                                             | File                                             | Notes                                                                   |
| --------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------- |
| Brand strings (name, tagline, accent)               | `src/config/brand.ts`                            | Imported across header, OG, og image, integrations page                 |
| Brand mark geometry                                 | `src/components/shell/BrandMarkIcon.tsx`         | Matches `public/favicon.svg` + `public/images/orange-cat-logo.svg`      |
| Layout chrome (header height, content height class) | `src/config/layout-chrome.ts`                    | `APP_CONTENT_HEIGHT_CLASS` is the canonical "below the header" sizing   |
| Routes                                              | `src/config/routes.ts`                           | `ROUTES.*`. `getRouteChrome()` decides sidebar/bottom-nav per route.    |
| Cat copy + tabs                                     | `src/config/cat-hub.ts`                          | `CAT_AGENT`, `CAT_HUB_TAB_HREFS`, `CAT_HUB_COPY`                        |
| Entity registry                                     | `src/config/entity-registry.ts`                  | The big one — table names, paths, schemas, metadata                     |
| Public API surface (what's in v1)                   | `src/config/public-api.ts`                       | `PUBLIC_API_VERSION`, `PUBLIC_API_ENTITY_TYPES`                         |
| Public API conventions                              | `docs/api/CONVENTIONS.md`                        | Versioning, errors, idempotency, rate limits, SDK guidance              |
| API contract (machine-readable)                     | `GET /api/v1/openapi.json` (generated)           | Generator at `src/lib/openapi/registerV1Routes.ts`                      |
| Integration key service                             | `src/services/auth/integrationKeys.ts`           | Mint / verify / list / revoke. `ock_<48-hex>` plaintext, sha256 storage |
| Actor resolution                                    | `src/services/actors/resolveCreationActor.ts`    | Used by entity create + key mint — same authority gate                  |
| Idempotency dedup                                   | `src/services/idempotency/idempotencyResults.ts` | 24h TTL, canonical-json sha256, server-managed                          |
| Database tables                                     | `src/config/database-tables.ts`                  | All non-entity table names                                              |

---

## Known gaps (prioritized for next sessions)

### P0 — blocks ramping past one external customer

1. **Tests** — zero coverage on the new API surface, idempotency, integration keys, SDK. Even 10 high-signal tests would change the math. Suggest Vitest + msw against the OpenAPI spec.
2. **Concurrency race in idempotency** — two parallel requests with the same key both miss the cache, both execute, the second hits the unique constraint cleanly but has already created a duplicate row. Fix: `SELECT FOR UPDATE` or pg advisory lock keyed on `(user_id, key, path)`.
3. **No webhooks** — Loop C (OrangeCat payment received → FleetCrown settlement) is blocked on this. Conventions doc declares the HMAC-SHA-256 contract; implementation is missing. Single biggest gap for SV-grade reliability.
4. **No observability** — `console.log` throughout. No structured logging, metrics, or tracing. Once any production traffic exists, this is the highest-leverage missing layer.

### P1 — operational maturity

5. **API key scopes** — all keys have full create/read authority on the bound actor. Granular scopes (e.g. `entities:write`, `entities:read`, `wallets:read`) require a `scopes JSONB` column on `integration_keys` + a middleware check.
6. **Per-key rate limits + usage UI** — currently per-user only. Show on `/settings/integrations` so users can see what an integration is actually doing.
7. **Key rotation** — only mint and revoke today. SV pattern: "rotate" issues a new key, grace-periods the old, sends a deprecation warning.
8. **Sandbox / test mode** — `ock_test_…` keys hitting a separate dataset. Without this, integrators write tests against production.
9. **Idempotency cleanup cron** — table grows forever without one. Scheduled function to prune `expires_at < NOW()`.

### P2 — known SSOT debt (already documented in `docs/architecture/CAT_AND_DESIGN_SSOT.md`)

10. **Two model registries** — `src/config/ai-models.ts` (13+ importers) vs `src/config/model-registry.ts` (1 importer). Collapse into one.
11. **Two chat panels** — `ModernChatPanel` (Cat) vs `AIChatPanel` (monetized assistants) — separate `MessageBubble`, `ChatInput`, `ModelSelector`. Extract shared primitives.
12. **GET-by-id via integration-key auth + SDK `.get()`** — list works; per-id read doesn't yet.
13. **Path-only API versioning** — no date-pinned variants à la `Stripe-Version: 2024-04-10`. Adequate for now.

### P3 — pure hygiene

14. **Mobile dashboard redesign** — "Your Impact" placeholder stats card still leads the mobile fold. Conventions doc says "first thing the user sees should be actionable" — this isn't yet.
15. **`BitBaumLogo.tsx`** is in OrangeCat's source tree. Likely belongs in bitbaum repo or removed.
16. **Publish `@orangecat/sdk` to npm** — currently vendored as tarball in FleetCrown. Works for one consumer; second consumer will want a real install.
17. **14 dormant Next.js apps in `~/dev/`** — portfolio hygiene; move to `~/dev/archive/`. Not OrangeCat-specific.

---

## Production credentials / deploy steps you (not the bot) need to do

1. **Mint the production `ORANGECAT_API_KEY`** at `orangecat.ch/settings/integrations`. Pick the FleetCrown group actor at mint time. Copy the `ock_…` plaintext (shown once).
2. **Set `ORANGECAT_API_KEY` + `ORANGECAT_API_BASE`** in FleetCrown's Vercel env vars.
3. **Apply FleetCrown's drizzle migration** `drizzle/0021_subscriptions_orangecat_service_id.sql` against prod DB: `cd ~/dev/fleetcrown && npm run migrate`.
4. **(optional) `npm publish` `@orangecat/sdk`** if/when you want public distribution. Requires `npm login` once and `npm publish --access public` from `packages/sdk/`.

---

## Architecture references

- `docs/api/CONVENTIONS.md` — the public API rulebook
- `docs/architecture/CAT_AND_DESIGN_SSOT.md` — Cat + design system audit
- `docs/branding-design.md` — brand direction + design SSOT
- `src/app/api/v1/README.md` — v1 contract + endpoint inventory
- `packages/sdk/README.md` — SDK consumer documentation

Old audit/eval/report/plan snapshots are under `docs/archive/2026-h1/` — preserved for git-history parity but no longer authoritative.
