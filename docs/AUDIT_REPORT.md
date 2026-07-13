# Codebase Audit Report

**Date**: 2026-07-13
**Auditor**: Claude Code (5 parallel subagents + synthesis)
**Branch**: main
**Commit**: 326bfbf9
**Previous audit**: 2026-07-09 (overall 7/10) — see "Delta since last audit" below.

## Executive Summary

OrangeCat is a **structurally healthy, well-disciplined codebase** whose real gaps are in _product surface area_ (what actually transacts) rather than engineering hygiene. The hard SSOT wins are genuinely done and enforced: **0** hardcoded route strings, **0** leaked entity-table strings, **0** raw-hex design-token violations, a respected entity registry, and only **1.09%** code duplication across ~200k lines. Type-check (non-incremental) and lint are clean; **1018 of 1019 tests pass**.

The debt that exists is bounded and mechanical: a dead 7,468-line generated types file, three status-config files that re-declare the same labels, ~189 `as any` (many avoidable), an unfinished design-token migration (112 legacy refs), and a handful of god files. None of it is architectural rot.

The **most important findings are two live correctness/security bugs** surfaced by the functional audit — a partial-PUT "silent unpublish" in several entity update builders (same class fixed all week), and a public profile endpoint that returns the entire `profiles` row — plus the strategic reality that **the platform has never processed a payment**: several entity types are economically inert, and the one blocker (a platform Lightning wallet) gates the entire value proposition.

## Health Score

| Area                   | Score      | Notes                                                                                              |
| ---------------------- | ---------- | -------------------------------------------------------------------------------------------------- |
| First Principles       | 7.5/10     | SSOT/registry excellent; dead generated types, 3 status files, `as any`, a few god files           |
| Best Practices         | 9/10       | type-check + lint clean, 1018/1019 tests; 1 stale (feature-gated) test, minor console/helper drift |
| Mission Alignment      | 6/10       | Cat strong, entities mostly work; **payments never happen**, investment/group/circle hollow        |
| Functional Correctness | 8/10       | Auth/actor/RLS strong; 1 PII-exposure + 1 unpublish-on-partial-PUT bug class                       |
| UI/UX & Responsive     | 8/10       | No breakage, good touch/async/a11y; token migration unfinished, god components                     |
| **Overall**            | **7.7/10** | Ship-quality engineering; product depth + payments are the frontier                                |

## Delta since last audit (2026-07-09 → 2026-07-13)

- ✅ **Loans hardened** — 5 prod bugs fixed via live testing (edit no-op, display_name drift, `loan_offers` RLS recursion, entity-wallets refetch loop, `show_on_profile` no-op).
- ✅ **`show_on_profile` silent-drop fixed across all 6 affected entities** + a new CI guard (`__tests__/unit/config/entity-form-schema-drift.test.ts`) that fails on form-field↔schema drift.
- ✅ **Stale "sats" guidance copy removed** (SATS was retired as a currency code) → CHF/BTC.
- ⏳ **Still open from 2026-07-09:** dual `Database` types (`database.generated.ts` confirmed **dead** — safe to delete), loan dual create-path, ~80 browser-supabase consumers, FleetCrown emit loop.
- ℹ️ The failing `FormField.voice.test.tsx` is a consequence of the 2026-07-09 change gating voice input behind `FEATURES.voiceInput` — the test wasn't updated to the flag. Not a regression.

---

## Phase 1: First Principles — 7.5/10

**Strong (no action):** `ROUTES` (0 hardcoded route strings in components), `DATABASE_TABLES` (673 refs, 0 leaked `user_*` strings), `entity-registry.ts`. jscpd duplication **1.09%**. Factories earn their place. No premature abstraction.

- 🔴 **Dead 7,468-line `src/types/database.generated.ts`** — zero importers; `src/types/database.ts` (36 importers) is canonical. Delete it (or make it canonical and delete the other).
- 🟠 **Three overlapping status-config files** re-declare the same labels: `config/status-config.ts:54`, `config/entity-status.ts:60`, `config/project-statuses.ts:25`. Collapse to one `STATUS_META` label SSOT.
- 🟠 **Duplicated `AiService` interface** — `services/ai/platform-providers.ts:35` and `services/cat/provider-resolver.ts:35`. Extract one shared contract.
- 🟠 **`as any` = 189, `: any` = 26, `eslint-disable` = 248** (211 suppress `no-explicit-any`). Concentrated in Supabase code; `services/cat/nudges.ts` has 7 `supabase: any` params — type them `SupabaseClient`.
- 🟢 **God files (logic):** `services/cat/chat-orchestrator.ts` (690), `services/ai/context-sections.ts` (634), `services/ai/openrouter.ts` (528), `lib/api/entityCrudHandler.ts` (531).

## Phase 2: Best Practices — 9/10

- `npm run type-check` (non-incremental) — **CLEAN**; `npm run lint` — **CLEAN**; `npm test` — **1018/1019 pass**.
- 🟠 **Failing test:** `__tests__/create/FormField.voice.test.tsx:37` — voice-input button not found because voice is feature-gated off (`FEATURES.voiceInput`). Update or gate the test. (Not in the pre-push `__tests__/unit` path.)
- 🟢 **~4 `console.*` in app code** → route through `src/lib/logger` (`hooks/useProfileTheme.ts:53` + `lib/validation`, `lib/crypto`).
- 🟢 **5 routes skip `apiSuccess`/`apiError`** but keep the correct shape.
- ✅ 0 hex, 0 hardcoded table strings, no SQL injection, naming conventions intact.

## Phase 3: Mission Alignment — 6/10

| Pillar                     | Rating                | Evidence / biggest gap                                                                                                                                                                                                                                                         |
| -------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Cat-first interface        | **Implemented**       | Cat Tiers 1/2/3 (memory, matchmaking, offers, entity creation). Gap: lives alongside nav, not the default surface.                                                                                                                                                             |
| Pseudonymous participation | **Partial**           | Anonymous auth exists; real-identity coupling in places.                                                                                                                                                                                                                       |
| **Any currency**           | **Partial → Not-yet** | Bitcoin/Lightning native; **fiat rails (PayPal/Twint/bank) are not real** in code.                                                                                                                                                                                             |
| Full economic spectrum     | **Partial**           | **Functional:** product, service, project, cause, event, loan, research, ai_assistant(free). **Partial-transact:** investment (funding UI works, no equity/settlement), asset (collateral-only), wishlist (thin). **Inert:** group, circle (no payment UI, no domain service). |
| **Payments reality**       | **Not-yet (blocked)** | **0 payments ever.** NWC top-up + paid Cat/assistants code-complete but blocked on platform Lightning wallet (`PLATFORM_NWC_URI`). Highest-leverage gap.                                                                                                                       |
| OC↔FC integration          | **Implemented**       | OIDC live; shared spine; timeline/publish bus wired.                                                                                                                                                                                                                           |

**Structural:** only **7/14 entities have a dedicated domain service** — business-rule consistency varies. **Top gaps:** (1) first real payment, (2) fiat rails, (3) investment settlement + live group/circle treasuries.

## Phase 4: Improvement Roadmap

**Quick wins (<1h):** fix/gate `FormField.voice.test.tsx`; route stray `console.*` through logger; delete dead `database.generated.ts`; **F2 unpublish fix** (remove `default:'draft'` from 4 builders).

**Medium (1–5h):** **S1 PII fix** (profile field allowlist); collapse 3 status files; extract shared `AiService`; type `supabase: any`; finish token migration (112 refs); split top god components; add schema↔builder CI guard.

**Strategic:** provision platform Lightning wallet → **first payment**; real fiat rails; investment settlement; live group/circle treasuries; make the Cat the default surface.

## Phase 5: Functional Correctness — 8/10

Auth centralized + RLS-first; **0 mutating routes missing auth**; actor system clean; no SQL injection; errors never leak internals; only 2 (benign) `@ts-ignore`; zero TODO/FIXME/HACK.

- 🔴 **S1 — Public profile returns entire `profiles` row.** `app/api/profile/[identifier]/route.ts:39,73,96,126` — `select('*')` on a public route incl. email-lookup; row holds `email`/`phone`/`bitcoin_address`/`privacy_settings`. Leak depends solely on RLS/column grants. **Fix:** public-field allowlist (mirror `PUBLIC_WALLET_FIELDS`, `wallets/route.ts:19`) + verify RLS.
- 🟠 **F2 — `status:{default:'draft'}` in update builders → partial PUT silently unpublishes.** `events/[id]/route.ts:58` already fixed it; NOT propagated to `products/[id]:34`, `investments/[id]:28`, `causes/[id]:31`, `ai-assistants/[id]:48` (and `circles/[id]:21` defaults `'active'`). **Fix:** `{ from: 'status' }` (no default).
- 🟠 **S3 — RLS-only authz (no in-app guard):** group proposals (`groups/[slug]/proposals/*`), `stakeholders/[id]` PATCH/DELETE, `tasks/[id]` PATCH. Add defense-in-depth or verify policies.
- 🟢 **F1 — Update-builder silent-drop** is a standing class (the `show_on_profile` bug); add a schema↔builder CI guard.
- ✅ Cleared: `messages/[conversationId]` (sender verified), `projects/[id]/support` (attribution from session).

## Phase 6: UI/UX & Responsive — 8/10

No 375px breakage, no touch-target failures, no missing async states, 0 hex, no Bitcoin-orange misuse. Touch targets enforced at token level; skeletons in 114 files; 149 `aria-label`s; centralized focus states.

- 🟠 **Token migration unfinished — 112 legacy refs:** `tiffany` 58 (config files), `text-foreground` 38 (→ `text-fg-primary`), `bg-card` 21 (→ `bg-surface-base`), `bg-orange` 0.
- 🟠 **17 UI files > 300 lines:** `CommandPalette` 460, `PublicEntityDetailPage` 459, `EntityDashboardPage` 432, `GroupWallets` 377, `TasksSection` 373.
- 🟢 a11y sweep of icon-only raw `<button>`s outside the (clean) timeline module.

---

## Action Items (prioritized)

1. **[Strategic]** Provision platform Lightning wallet → land the **first payment** (unblocks NWC top-up + paid Cat/assistants).
2. **[Security]** S1 — allowlist public fields on `GET /api/profile/[identifier]`; verify `profiles` RLS.
3. **[Bug]** F2 — remove `status` defaults from products/investments/causes/ai-assistants/circles update builders.
4. **[Quick]** Gate/fix `FormField.voice.test.tsx`; delete dead `database.generated.ts`; route stray `console.*` through logger.
5. **[Guard]** Add schema↔update-builder CI coverage test (extends the form↔schema guard added 2026-07-13).
6. **[Mission]** Fiat rails (Twint/PayPal); investment settlement; live group/circle treasuries.
7. **[Quality]** Collapse 3 status-config files; extract shared `AiService`; type `supabase: any`; finish token migration; split top god components.

_No code was modified during the audit itself. The `show_on_profile` bug class (F1) and stale sats guidance were fixed separately in commits b1ab442f, a97ffedc, 326bfbf9._
