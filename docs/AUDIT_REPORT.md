# Codebase Audit Report

**Date**: 2026-07-09
**Auditor**: Claude (3 parallel deep-dive agents + remediation pass)
**Branch**: main
**Commit**: post-PR #395 (Cat Credits metering + 2026 model roster)

## Executive Summary

A full-codebase SSOT / SoC / DRY / design-system audit found **strong spine infrastructure** (`entity-registry.ts`, `api-routes.ts`, `ai-models.ts`, `standardResponse`, generic entity handlers) undermined by **duplicate constants**, **phantom API paths**, **legacy UI primitives**, and **parallel data-access paths** (browser Supabase vs API).

This pass **fixed 30+ concrete violations** in config, discover tabs, payment presets, AI provider wiring, UI primitives, integration scopes, and documentation. Remaining work is **structural** (DB type migration, loan dual-path, browser-supabase deprecation, FleetCrown emit loop) and tracked in phased roadmap below.

## Health Score

| Area                            | Score    | Notes                                                                      |
| ------------------------------- | -------- | -------------------------------------------------------------------------- |
| First Principles (SSOT/DRY/SoC) | 7/10     | Spine strong; duplicate registries consolidated; env/features SSOT added   |
| Best Practices                  | 8/10     | Gates green; phantom routes removed; research POST fixed                   |
| Systems / Integration           | 6/10     | `timeline.write` scope mintable; FC emit/SDK gaps remain                   |
| Design System                   | 7/10     | 0 className hex; Card/Badge migrated; semantic tier ~95% on surfaces       |
| Functional Correctness          | 8/10     | Money-path tests pinned; loan dual-path still open                         |
| **Overall**                     | **7/10** | Healthy core; largest debt is data-access layering + customer API contract |

---

## Fixed in this remediation pass (2026-07-09)

| Area                     | Fix                                                                                                                   |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| **Phantom routes**       | Removed `/api/payments/send` and `/api/posts` from `api-routes.ts` / `cat-actions.ts` (handlers are in-process)       |
| **CAT_FREE_DAILY_LIMIT** | Single constant in `cat-plans.ts`; `getUserPlan` + `api-key-service` import it                                        |
| **WIRED providers**      | `WIRED_PROVIDER_IDS` + `wiredProviders` exported from `aiProviders.ts`; `cat-plans` + `AIKeyAddForm` derive from SSOT |
| **Credits markup label** | `CAT_CREDITS_MARKUP_LABEL` derived from `CREDIT_USAGE_MARKUP`                                                         |
| **Payment presets**      | New `config/payment-presets.ts`; PublicPayPanel, ProjectDonationSection, ContributionAmountInput, PaymentDialog       |
| **Discover tabs**        | New `config/discover-tabs.ts`; DiscoverTabs, DiscoverEmptyState, discoverConstants deduplicated                       |
| **Waitlist schema**      | Shared `waitlistSchema` in `lib/validation/social.ts`                                                                 |
| **Research POST**        | Passes `parsed.data` to `createResearch` after Zod validation                                                         |
| **API_ROUTES gap**       | `WALLETS.ENTITY_VISIBILITY` added; WalletVisibilityToggle uses it                                                     |
| **Integration scopes**   | `timeline.write` added to `PUBLIC_API_SCOPE_TOKENS` (mint UI can offer it)                                            |
| **Model selector**       | `ModelSelector` reads `AI_MODEL_REGISTRY` directly (not legacy adapter)                                               |
| **UI primitives**        | `Card` title/description + `Badge` variants migrated to semantic tokens                                               |
| **Feature flags**        | New `config/features.ts`; voice input gated via `FEATURES.voiceInput`                                                 |
| **Env SSOT**             | New `config/env.ts` for `SITE_URL` / `APP_URL` canonicalization                                                       |
| **Responsive pay grids** | PublicPayPanel + ProjectDonationSection: `grid-cols-1 sm:grid-cols-3`                                                 |
| **Design docs**          | `docs/design-system/README.md` reconciled with semantic-tier direction                                                |

---

## Phase 1: SSOT / DRY violations (remaining)

### Critical (next PRs)

1. **Dual `Database` types** — `types/database.ts` (~3.7k lines) vs orphaned `database.generated.ts`. Regenerate and switch Supabase clients.
2. **Loan dual create path** — `domain/loans/service.ts` (API) vs `services/loans/mutations` (browser Supabase). UI must call `/api/loans`.
3. **~80 browser-supabase consumers** — groups, timeline, projectStore bypass API validation/audit.

### High

4. **Two `EntityConfig` type names** — rename to `EntityDisplayConfig` vs `EntityFormConfig`.
5. **Model ID sprawl** — `platform-providers.ts`, `form-prefill-service.ts`, `groq.ts` still hold default strings; import from `ai-models.ts`.
6. **Auth route lists** — `middleware.ts` `REQUIRES_AUTH_PREFIXES` vs `routes.ts` `ROUTE_CONTEXTS`; derive one from the other.
7. **~70 scattered `process.env`** — migrate to `config/env.ts` + zod validation incrementally.

### Medium

8. **Contribution presets** — consolidated; wishlist tiers may still have local amounts.
9. **`entity-configs` imports UI templates** — move to `config/entity-templates/`.
10. **`PublicEntityDetailPage` god component** — extract `loadPublicEntity` service.
11. **14× `entity-guidance/*.ts`** — factory + content maps.
12. **Notifications dual stack** — `lib/services/notifications.ts` vs `services/notifications/`.

---

## Phase 2: Design system (remaining)

| Item                               | Status                                                                              |
| ---------------------------------- | ----------------------------------------------------------------------------------- |
| `[#` in className                  | ✅ 0 violations                                                                     |
| Legacy shadcn tokens in `ui/*`     | ⏳ Card/Badge done; dialog/select/dropdown still on `bg-background`                 |
| Chromatic Tailwind in config       | ⏳ `badge-colors.ts`, `entity-registry` THEME_COLORS, `contextual-loader-config.ts` |
| Raw `<button>` vs `<Button>`       | ⏳ ~130 files; chat/timeline worst                                                  |
| `text-[10px]` arbitrary micro-type | ⏳ ~25 files; use `text-2xs`                                                        |
| Chart/email hex                    | ⏳ AnalyticsInsights, email templates, OG                                           |
| Display typography                 | ⏳ `font-heading` only ~14 files                                                    |

**Recommended next design pass:** migrate `dialog`, `select`, `dropdown-menu` internals to semantic tokens (unlocks all consumers in one PR).

---

## Phase 3: FleetCrown / customer integration (remaining)

| Gap                                                | Status                                                             |
| -------------------------------------------------- | ------------------------------------------------------------------ |
| OC ingest (`/api/v1/timeline/publish`)             | ✅ Live                                                            |
| `timeline.write` in mint UI scopes                 | ✅ Fixed                                                           |
| FC emit build events                               | ❌ Unbuilt                                                         |
| Stakeholders in v1 API + SDK                       | ❌ Not exposed                                                     |
| OIDC on FC side                                    | ❌ Unbuilt                                                         |
| Stakeholder management UI                          | ❌ API/seed only                                                   |
| Hardcoded `ORANGECAT_FLEETCROWN_INTEGRATION` UUIDs | ⏳ Dogfood OK; needs `platform_customers` table for multi-customer |

See `docs/architecture/PLATFORM_AND_COLLABORATION.md` for north star.

---

## Phased roadmap

### Phase A — Quick wins (done this pass)

Config SSOT consolidation, phantom routes, UI primitive migration start, integration scope fix.

### Phase B — Correctness (1–2 weeks)

- Loan UI → API-only path
- Regenerate DB types; eliminate `as any` on oauth/cat_credit/stakeholder tables
- Middleware auth prefixes derived from `routes.ts`
- `config/env.ts` zod validation + CI `validate-env.js` alignment

### Phase C — Design system completion (1–2 weeks)

- shadcn primitives → semantic tier
- `badge-colors.ts` → status semantic tokens
- Chat/timeline raw button purge
- Remove tiffany/orange from globals/tailwind when consumers = 0

### Phase D — Platform integration (2–4 weeks)

- v1 API + SDK: `stakeholders.read/write`, `timeline.publish`
- FC emit checklist + OIDC relying party
- Customer registry DB table (move hardcoded UUIDs out of code)

### Phase E — Data access unification (ongoing)

- Deprecate browser writes in `services/loans`, `projectStore`, `services/groups`
- Rule: UI → `API_ROUTES` → route → domain/service → supabase

---

## Verification

Run after each phase:

```bash
npm run type-check
npm test -- --testPathPatterns=__tests__/unit
grep -rn '\[#' src/    # design token audit — expect 0
```

---

## Action items (prioritized)

1. **[B1]** Fix loan dual-path — UI calls `/api/loans` only
2. **[B2]** Regenerate `database.generated.ts` and migrate Supabase client imports
3. **[C1]** Migrate dialog/select/dropdown to semantic tokens
4. **[D1]** Add stakeholders + timeline to v1 SDK
5. **[E1]** Inventory browser-supabase write sites; migrate loans first
