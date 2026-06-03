# Codebase Audit Report

**Date**: 2026-06-03
**Auditor**: Claude (Opus 4.7, 1M context) acting as a cross-functional review (product, UI/UX, engineering)
**Branch**: main
**Commit**: 652bb865 (with 30 uncommitted changes — in-progress rebrand/SSOT pass)
**Trigger**: User-reported "unresponsive across screens; random/spaghetti files; hardcoded SoC/SSOT/DRY violations all over user-facing pages."

This report supersedes the prior `docs/AUDIT_REPORT.md` (2026-04-15) which itself was one of ~6 competing audit/evaluation files in `docs/`.

---

## Product direction this audit measures against

> Mirror **x.ai / Grok** end-to-end: dark, near-monochrome, hairline borders, one geometric mark, warm orange only for rare CTAs. Chat is the primary surface. On mobile, the interface should be **fun and action-oriented, not content-heavy**. On every page, the first thing a user sees must be **something they can do**, not metadata about themselves ("Your Impact", stats cards, empty timeline blocks). Apply best practices per page; optimize each page for the right thing.

These principles change what "fixed" means for several of the findings below. They are not theoretical — they invalidate the current dashboard hero, the public landing, and parts of the Cat hub as user-first surfaces.

---

## Executive Summary

The rebrand pass produced **clean new SSOT files** (`src/config/brand.ts`, `src/config/layout-chrome.ts`, `src/components/shell/BrandMark*`) and a chat-first `/dashboard/cat`. It **did not propagate**:

1. Two brand marks render at the same horizontal position on `/dashboard/cat` ≥ 768 — `AppShell.BrandMark` and `CatChatToolbar` identity collide ("Cat" visibly overlaps "OrangeCat").
2. At 375, the Cat toolbar isn't responsive — "Private · not saved" truncates to "Pri…", Context/Controls labels disappear, and a **stray old kawaii-cat FAB lingers bottom-left**.
3. The dashboard at 375 is **the opposite of action-first**: skeleton bar under "Welcome back", a "Your Impact" card with `0 Projects | 0.00 CHF Raised | 0 Supporters` placeholders, and the fixed bottom nav whose Bitcoin-Orange `+` FAB overlaps both content and its own tab labels.
4. **25 user-facing components** hand-format Bitcoin with `.toFixed(8) + ' BTC'`, bypassing `useDisplayCurrency()`. Visible to every user, in their wallet, on every entity page.
5. **8 files** still hardcode `calc(100dvh-Nrem)` — the exact magic that `layout-chrome.ts` was created to retire.
6. **Two model registries, two chat panels**, **one re-export shim** — already documented as P0 in `docs/architecture/CAT_AND_DESIGN_SSOT.md`; not started.
7. Repo silt: **341 .md files** in `docs/`, **205 ad-hoc scripts** (186 untouched in 6 months), **9.2M / 216 files in `.playwright-mcp/`**, **5 `verify-*.jpeg` in repo root** (from my own prior run, not gitignored), duplicate `CLAUDE.md` at root and `.claude/`.

Beyond mechanical SSOT drift, the deeper finding is **product direction**: the dashboard, public landing, and several entity pages are designed around showing the user their data, not giving them their next action. That doesn't match x.ai / Grok.

---

## Health Score

| Area                                |    Score | Notes                                                                                                                      |
| ----------------------------------- | -------: | -------------------------------------------------------------------------------------------------------------------------- |
| First Principles (SSOT propagation) |     5/10 | New SSOT files clean; consumers ignore them                                                                                |
| Best Practices (typecheck/lint/hex) |     8/10 | `tsc` + ESLint clean; zero `bg-[#hex]` in `src/`.                                                                          |
| **Mobile UX (fun, action-first)**   | **2/10** | Dashboard mobile leads with skeleton + stats; bottom-nav covers content; Bitcoin Orange used for generic CTA.              |
| **Chat parity with Grok / x.ai**    | **5/10** | Chat-first layout shipped; mark collides; toolbar not responsive; stray FAB; secondary panels not yet symmetric with Grok. |
| Functional correctness              |     7/10 | Sessions/routes work. "Welcome back, [skeleton]" is a visible defect.                                                      |
| Repo hygiene                        |     3/10 | 341 docs, 205 scripts, 9.2M playwright snapshots, duplicate CLAUDE.md                                                      |
| **Overall**                         | **5/10** | Strong intent + tooling, weak follow-through. Dangerous to commit the rebrand as-is.                                       |

---

## Phase 1 — Action-first product audit (per-page, x.ai/Grok lens)

What the user sees first on each surface, and whether it's actionable.

### `/` (logged out, public landing)

- Current: not visually verified this audit; prior knowledge says it's hero + feature copy + cards.
- **x.ai/Grok parity**: x.ai lands you straight on the chat composer. Grok mirrors. OrangeCat should land logged-out users in a **demo Cat composer** they can immediately type into (with a soft sign-in wall on send), not on a marketing fold.

### `/onboarding` step 1 at 375

- Current: progress bar + welcome card + a "Tell Cat what you need" button + bottom nav obscuring the "Next" area.
- **Action-first check**: the action _is_ present ("Tell Cat what you need"). But the bottom-nav FAB partially covers the CTA. Fix the chrome, keep the page.

### `/dashboard` at 375 — **biggest violation**

Order seen by the user, top to bottom:

1. Header (7 icon buttons crammed in)
2. **"Welcome back" with an unresolved skeleton bar where the username should be**
3. **"Your Impact" stats: 0 Projects | 0.00 CHF Raised | 0 Supporters** — vanity metrics with placeholder zeros
4. "Ready to Start Fundraising?" → "Create Project" button
5. Recent activity skeleton block that never resolves
6. "Projects" card (empty state)
7. "Invite friends to OrangeCat" card

The user's first 3 vertical screens are **about them, not actionable for them**. Per the directive: this is wrong. Mobile dashboard should be:

- Header: brand mark only, no kicker, 2–3 actions max
- Hero: one-line greeting (no skeleton, fall back to `@username` if name unset) + **a single Cat composer pinned at top** — "What do you want to do today?" — Grok-style
- Below the fold: suggested next action (1 card, not 5), then activity feed
- **Kill the "Your Impact" placeholder stats card on mobile entirely.** Move to a "/dashboard/impact" page or show it only when there's real data.

### `/dashboard/cat` (Cat hub)

- Default chat-only view ✅ (matches x.ai/Grok pattern)
- Empty state with "What can Cat help you with?" + 4 suggestion cards ✅
- Toolbar identity duplicate of AppShell brand mark ❌ (collision at 768)
- Toolbar not responsive ❌ ("Pri…" truncation at 375)
- Stray kawaii-cat FAB ❌
- Model picker prominent ✅ (Grok parity)
- "Context" / "Controls" as ?tab= links ✅ — but on mobile they need to be a single overflow menu, not two icons

### `/discover`, `/timeline`, `/messages`

- Not visually audited this pass; same chrome problem applies (bottom-nav FAB color, header crowding).
- **Action-first check**: `/discover` should land on a search composer + 3 hot picks. `/timeline` is fine being a feed. `/messages` is fine being a list.

### Public marketing pages (`docs/branding-design.md` checklist item)

- Not yet built to x.ai parity. Listed in the rebrand checklist as a follow-up.

---

## Phase 2 — Responsive design (visually confirmed)

Dev server `:3020`, Playwright at 375 / 768 / 1280. Screenshots in `.playwright-mcp/audit-*.jpeg`.

### `/dashboard/cat` at 375 (`audit-cat-375.jpeg`)

- "Private · not saved" → "Pri…" truncation
- Model picker takes ~50% of toolbar width; Context/Controls become unlabelled icons (no `aria-label` text in the rendered snapshot either)
- Header crams 6 icon buttons + brand mark — touch targets under 44 px
- **Stray kawaii-cat FAB at bottom-left** — old mark, not the new `BrandMarkIcon`. Source: somewhere outside the migrated `CatIcon.tsx` shim, likely a leftover floating-button in the route shell.

### `/dashboard/cat` at 768 (`audit-cat-768.jpeg`)

- **"Cat" overlaps "OrangeCat"** in the top-left because AppShell.BrandMark and CatChatToolbar identity both render at the same horizontal position
- Empty state renders correctly: "What can Cat help you with?" + 4 suggestions ✅
- Kawaii FAB still present at bottom-left

### `/dashboard` at 375 (`audit-dashboard-375.jpeg`)

- Username skeleton bar never resolves
- "0.00 CHF" ordering — Swiss-French, not Swiss-German "CHF 0.00" (consistent with `useDisplayCurrency()` not being used here either)
- Bottom-tab nav (`Cat | Dashboard | + | Timeline | Profile`) overlaps the "Create Project" CTA
- **The `+` FAB is Bitcoin Orange `#F7931A` for a generic Create action** — direct violation of CLAUDE.md domain rule ("Bitcoin Orange ONLY for Bitcoin UI")
- The orange FAB visually clips the "Cat" tab label to "C…"
- A second skeleton block ("Recent Activity / Recommended Next Steps") never resolves

### `/onboarding` at 375 (`audit-onboarding-375.jpeg`)

- Bottom-nav FAB partially covers the "Tell Cat what you need" CTA
- "Cat" tab label clipped by the same orange `+` FAB

### `/dashboard/cat` at 1280 — works (verified previously)

### Components with zero responsive classes (`sm:`/`md:`/`lg:`)

Sample (not exhaustive): `src/components/ui/ProfileCard.tsx`, `src/components/ui/Card.tsx`, `src/components/ui/Textarea.tsx`, `src/components/ui/BottomSheet.tsx`, `src/components/Loading.tsx`.

### Hardcoded font sizes (use Tailwind scale)

- `src/components/profile/ProfileOverviewTab.tsx:127,135,143,151,200,252` — `text-[10px]` (6x)
- `src/components/messaging/ConversationListItem.tsx:179` — `text-[11px]`
- `src/components/timeline/PostContent.tsx:71` — `text-[15px]`

---

## Phase 3 — SSOT propagation failures (concrete file:line)

### `layout-chrome.ts` ignored

`APP_CONTENT_HEIGHT_CLASS = 'h-[calc(100dvh-3.5rem)] sm:h-[calc(100dvh-4rem)]'` exists but:

- `src/components/messaging/MessagePanel.tsx:269` — `h-[calc(100dvh-4rem)]` (drops mobile breakpoint)
- `src/components/messaging/MessagePanelLoading.tsx:35` — same
- `src/components/ai-chat/ModernChatPanel/index.tsx:163` — `h-[calc(100dvh-15.5rem)] sm:h-[calc(100dvh-13rem)]` (different magic; undocumented)
- `src/components/timeline/ProjectSelectionModal.tsx:59` — `max-h-[calc(100dvh-60px)]`
- `src/app/(authenticated)/ai-chat/[assistantId]/[conversationId]/page.tsx:23` — `h-[calc(100vh-4rem)]` (uses `vh` not `dvh` — mobile-broken)

### `brand.ts` ignored

- `src/app/layout.tsx:71,91,100` — `'OrangeCat'` 3x (page title + OG + Twitter)
- `src/components/layout/Footer.tsx:52` — full tagline string
- `src/components/sharing/ProfileShare.tsx:39`, `EntityShare.tsx:33`, `ProjectShare.tsx:44` — brand fragments
- `src/components/messaging/MessagePanel.tsx:101` — `"Reach anyone on OrangeCat"`

### `ROUTES` ignored

- `dashboard/bookings/[id]/page.tsx:53,61,133` — `'/dashboard/bookings'` (3x)
- `dashboard/bookings/page.tsx:157`, `dashboard/tasks/page.tsx:275`, `dashboard/tasks/[id]/page.tsx:132` — template paths
- `dashboard/people/components/PersonCard.tsx:34,53,95` — `/profiles/${id}` (3x)
- `dashboard/wishlists/[id]/_components.tsx:56,124,136` — manual base-path concat

### `useDisplayCurrency().formatAmount()` bypassed — 25 hits, leading offenders

- `src/components/wallets/WalletManager/components/WalletCard.tsx:143` — `{wallet.balance_btc.toFixed(8)} BTC` (wallet balance, every user)
- `src/components/profile/ProfileOverviewTab.tsx:381` — `₿{stats.totalRaised.toFixed(8)}`
- `src/components/ai-chat/AIChatMessage.tsx:74` — `Cost: {message.cost_btc.toFixed(8)} BTC`
- `src/components/create/DynamicSidebar.tsx:88` — `₿ {btc.toFixed(8)}`
- `src/app/wishlists/[id]/page.tsx:191,192,249,250` — 4 hits
- `src/app/(authenticated)/dashboard/wishlists/[id]/page.tsx:100,101` — 2 hits
- `src/app/(authenticated)/dashboard/wishlists/[id]/_components.tsx:98,99` — 2 hits

These display raw BTC regardless of CHF preference — defeating the entire multi-currency stack you built.

### Two model registries, two chat panels (P0 from `docs/architecture/CAT_AND_DESIGN_SSOT.md`)

- `src/config/ai-models.ts` (15K, 13+ importers) vs `src/config/model-registry.ts` (11K, 1 importer)
- `src/data/aiProviders.ts` (13K) — third overlap
- `src/components/ai-chat/ModernChatPanel/` (Cat) vs `src/components/ai-chat/AIChatPanel*` (assistants) — separate MessageBubble / ChatInput / ModelSelector each
- `src/components/ai-chat/ModernChatPanel.tsx` — 13-line re-export shim, single importer

---

## Phase 4 — Repo hygiene

### Repo root (committable, NOT gitignored)

- `verify-brandmark.jpeg` 2.4K
- `verify-cat-identity.jpeg` 2.8K
- `verify-dashboard-hero.jpeg` 6.8K
- `verify-header-left.jpeg` 13K
- `verify-onboarding-header.jpeg` 13K

These are my prior verify run. Delete + gitignore `verify-*.jpeg`.

### `.playwright-mcp/`

9.2M / 216 files since April 2026. Not gitignored. Prune or ignore.

### `logs/`

60K of `mcp-puppeteer-*` logs from Dec 2025 – Jan 2026.

### `docs/` — 341 markdown files, competing audits

- `docs/AUDIT_REPORT.md` (Apr 15) — this file overwrites it
- `docs/CODEBASE_EVALUATION_REPORT.md` (Feb 25)
- `docs/development/CODEBASE_AUDIT_REPORT.md` (Jan 4)
- `docs/DATABASE_IMPROVEMENT_PROPOSAL.md` vs `docs/DATABASE_IMPROVEMENTS_IMPLEMENTED.md`
- `*_AUDIT.md` scattered across `docs/`, `docs/analysis/`, `docs/development/`, `docs/architecture/`

Target structure: ~30 living docs at the root of `docs/`, an `archive/` subdir for the rest.

### `scripts/` — 205 ad-hoc scripts

- 186 untouched since Nov 2025; only 5 modified since Mar 2026
- Multiple versions of same operation: `apply-rls-fix.js`, `apply_rls_fix.sh`, `apply_rls_fix_node.js`, `apply_rls_via_api.js`
- Stale one-shots: `apply-social-features.sh`, `apply-timeline-migration.js`, `apply-messaging-fix.sh`, `fix-profile-bootstrap.js`

### Two `CLAUDE.md` files

- `/CLAUDE.md` (root, current — `@`-imports inner)
- `/.claude/CLAUDE.md` (9.6K, May 16)

Intentional, but verify no contradictions.

---

## Phase 5 — SoC violations (god components ≥ 300 LOC)

| File                                            | LOC | Mixed concerns                                       |
| ----------------------------------------------- | --: | ---------------------------------------------------- |
| `src/components/profile/ProfileOverviewTab.tsx` | 534 | Profile stats fetch + 5 form-state vars + UI         |
| `src/components/entity/EntityDashboardPage.tsx` | 426 | Per-entity conditional render + state + API          |
| `src/components/groups/GroupWallets.tsx`        | 369 | Wallet CRUD flows + state + UI                       |
| `src/components/dashboard/TasksSection.tsx`     | 301 | Recommendation engine + filter + completion + render |
| `src/components/discover/DiscoverResults.tsx`   | 296 | Filter + pagination + search state + render          |

Each violates the 300-LOC component limit in `.claude/rules/code-quality.md`.

---

## Phase 6 — DRY violations

- **Priority/status color triples** reimplemented:
  - `src/components/dashboard/TasksSection.tsx:35-46` (`getPriorityColor`)
  - `src/components/dashboard/AnalyticsInsights.tsx:59-81` (`COLOR_CLASSES`)
  - No shared `PRIORITY_STYLES` / `STATUS_COLORS` SSOT
- **Tiffany pill badge** styling repeated:
  - `src/components/ui/ProfileCard.tsx:24` — `bg-tiffany-100 text-tiffany-700 border border-tiffany-200`
  - `src/components/layout/UserProfileDropdownPanel.tsx:103-140` — same combo
  - No `<Badge variant="tiffany">` primitive
- **Share-modal scaffolds** repeated in `ProjectShare.tsx`, `ProfileShare.tsx`, `EntityShare.tsx`
- **Onboarding step numbering** — `text-orange-600` for step badges in `WalletSetupStep.tsx` (lines 53, 58, 65, 71, 122, 131, 140) — 7x

---

## Phase 7 — Color SSOT — orange/tiffany still used as generic accents

`grep -rn '\[#' src/` is zero (good — no arbitrary hex). But the `tiffany-*` / `orange-*` palette is used as the de-facto accent system, contradicting the rebrand thesis ("primary = neutral, tiffany/orange = sparse Bitcoin/status accents only"):

- `src/components/onboarding/GetStartedStep.tsx:70,71` — `bg-orange-100`, `text-orange-600` (generic CTA)
- `src/components/onboarding/OnboardingFlow/components/GetStartedStep.tsx:60,64,65` — `bg-orange-500`, `text-orange-900`, `text-orange-800`
- `src/components/dashboard/TasksSection.tsx:40` — `bg-orange-500/10 text-orange-700` (task priority — also a DRY violation)
- `src/components/ui/ProfileCard.tsx:24` — `bg-tiffany-100 ...` (TypeBadge)
- `src/components/payment/PaymentQRCode.tsx:86,87` — `#FFFFFF`/`#000000` for QR fg/bg (technical contrast, acceptable, but should still be `var(--background)` / `var(--foreground)`)
- `src/components/layout/BitBaumLogo.tsx:30-41` — SVG fills `#8B4513`, `#228B22`, `#32CD32`, `#90EE90`, `#F7931A`. **And BitBaum is a sibling product, not OrangeCat — why is its logo in this src tree at all?**

---

## Phase 8 — Bottom navigation + Bitcoin-Orange FAB

`src/components/layout/MobileBottomNav.tsx` renders `Cat | Dashboard | + | Timeline | Profile`.

1. **Overlaps content** — `fixed bottom-0` without `pb-` safe-area on AppShell main; primary content scrolls behind it.
2. **The `+` FAB is Bitcoin Orange** for a generic Create action — direct CLAUDE.md violation.
3. **The FAB visually clips the "Cat" tab label** to "C…".
4. Cat hub's route chrome (via `getRouteChrome()` in `routes.ts`) should hide the mobile bottom nav on `/dashboard/cat` per the chat-first claim — but the FAB and the stray kawaii-cat element at bottom-left of Cat hub suggest something is still mounting on that route.

---

## Action Items — prioritized for an x.ai/Grok-parity, action-first product

### P0 — Visible defects that block committing the rebrand

| #   | What                                                                                                                                                                                                                           | File(s)                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| 1   | Suppress AppShell.BrandMark on `/dashboard/cat` (or remove identity from CatChatToolbar). Pick one source of identity per chrome zone.                                                                                         | `src/config/routes.ts` (getRouteChrome) + `src/components/layout/AppShell.tsx`    |
| 2   | Find + remove the stray kawaii-cat FAB on Cat hub at 375/768. Grep for any `CatIcon` import that resolves to the legacy SVG instead of `BrandMarkIcon`.                                                                        | likely a floating element in Cat layout or `MobileBottomNav`                      |
| 3   | Responsive `CatChatToolbar`: collapse "Private · not saved" tag below `sm:` (show as tooltip on icon), hide kicker, give Context/Controls real `aria-label`s and a single overflow menu on mobile                              | `src/components/ai-chat/CatChatToolbar.tsx`                                       |
| 4   | Mobile bottom-nav: add `pb-[calc(theme(spacing.16)+env(safe-area-inset-bottom))]` to the main scroll area in AppShell so content doesn't sit under the nav; **recolor the `+` FAB to neutral or tiffany — NOT Bitcoin Orange** | `src/components/layout/AppShell.tsx`, `src/components/layout/MobileBottomNav.tsx` |
| 5   | Dashboard "Welcome back" — fall back to `@username` or `email` when full name is missing, kill the persistent skeleton bar                                                                                                     | dashboard hero component (find via `Welcome back` grep)                           |
| 6   | Delete 5 `verify-*.jpeg` in repo root, add `verify-*.jpeg` + `.playwright-mcp/audit-*` to `.gitignore`                                                                                                                         | root, `.gitignore`                                                                |

### P0.5 — Product direction (x.ai/Grok parity, action-first)

| #   | What                                                                                                                                                                                                                                                               | Why                                                               |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| 7   | Redesign `/dashboard` mobile to be action-first: ONE Cat composer pinned at top, one suggested action card, then activity. **Remove "Your Impact" stats card on mobile.** Reintroduce it only when there's real data, and on a dedicated `/dashboard/impact` page. | Vanity stats violate "first thing user sees should be actionable" |
| 8   | Land logged-out `/` users on a demo Cat composer with sign-in wall on send                                                                                                                                                                                         | x.ai/Grok parity                                                  |
| 9   | Make the Cat hub mobile interface match Grok: composer-first, no chrome, suggestions appear above the composer not below. Currently the suggestion grid + composer order is already correct desktop-side; verify and tune mobile.                                  | x.ai/Grok parity                                                  |
| 10  | Public marketing pages (rebrand-checklist item) — build dark x.ai-style bands with `ui-public-*` classes (already stubbed in `globals.css` per `branding-design.md`)                                                                                               | Brand consistency                                                 |

### P1 — Migrate to SSOT files that already exist

| #   | What                                                                                                                                                                         | Count / files                                                  |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 11  | Replace all `calc(100dvh-*)` with `APP_CONTENT_HEIGHT_CLASS` (or extend `layout-chrome.ts` if `ModernChatPanel`'s `15.5rem`/`13rem` offsets are intentional — document them) | 8 files in Phase 3                                             |
| 12  | Replace `.toFixed(8) + ' BTC'` patterns with `useDisplayCurrency().formatAmount(btc)`                                                                                        | 25 files; start with WalletCard, ProfileOverviewTab, wishlists |
| 13  | Replace hardcoded `'OrangeCat'` / tagline with `APP_NAME` / `APP_TAGLINE`                                                                                                    | 6 files in Phase 3                                             |
| 14  | Replace hardcoded routes with `ROUTES.*`                                                                                                                                     | bookings/tasks/people/wishlists pages                          |

### P2 — Consolidation (already in `docs/architecture/CAT_AND_DESIGN_SSOT.md`)

| #   | What                                                                                                                                                                   |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 15  | Collapse `model-registry.ts` into `ai-models.ts`; verify `data/aiProviders.ts` necessity                                                                               |
| 16  | Build shared `<ChatShell>` + composer primitives used by both `ModernChatPanel` and `AIChatPanel`; delete duplicated `AIChatMessage` / `AIChatInput` / `ModelSelector` |
| 17  | Inline `src/components/ai-chat/ModernChatPanel.tsx` re-export shim (single importer)                                                                                   |
| 18  | Extract `<Badge variant="...">` primitive; remove `bg-tiffany-100 text-tiffany-700 ...` repetitions                                                                    |
| 19  | `PRIORITY_STYLES` / `STATUS_COLORS` SSOT — collapse `getPriorityColor` + `COLOR_CLASSES`                                                                               |

### P3 — Repo hygiene

| #   | What                                                                                                                 |
| --- | -------------------------------------------------------------------------------------------------------------------- |
| 20  | Prune `docs/` from 341 → ~30 living docs; move rest to `docs/archive/`; reconcile competing audit reports            |
| 21  | Prune `scripts/` — delete or archive scripts untouched 6+ months                                                     |
| 22  | Gitignore `.playwright-mcp/` snapshots; keep `console-*.log` only if useful                                          |
| 23  | Refactor god components ≥ 300 LOC (5 listed in Phase 5); extract data-fetching to hooks, business logic to `domain/` |
| 24  | Confirm `BitBaumLogo.tsx` belongs in this repo at all (sibling product)                                              |

---

## What's working (preserve)

- `tsc` + ESLint clean, zero arbitrary hex
- `brand.ts`, `layout-chrome.ts`, `BrandMark*` — well-scoped SSOT files
- `BrandMarkIcon` matches `public/favicon.svg` + `public/images/orange-cat-logo.svg`
- Cat empty state ("What can Cat help you with?" + 4 suggestions) renders correctly at 768/1280
- Page title sourced from brand SSOT
- `useDisplayCurrency()` hook exists and is the right place to standardize
- `ROUTES` SSOT mostly enforced (post earlier ROUTES sweep)

---

## Evidence

All in `.playwright-mcp/`:

- `audit-cat-375.jpeg` — Cat hub mobile (truncation, stray FAB, header crowding)
- `audit-cat-768.jpeg` — Cat hub tablet (brand mark collision)
- `audit-dashboard-375.jpeg` — Dashboard mobile (skeleton stuck, bottom-nav overlap, orange FAB)
- `audit-onboarding-375.jpeg` — Onboarding mobile (CTA covered by FAB)

Plus 5 stray `verify-*.jpeg` in repo root (to be deleted as P0 #6).
