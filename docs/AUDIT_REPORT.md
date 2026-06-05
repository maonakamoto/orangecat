# OrangeCat Codebase Audit

**Date**: 2026-06-05
**Commit**: 94de8f55 (HEAD at audit time)
**Tree size**: 1,488 TS/TSX files; ~181k LOC

## Executive Summary

The codebase is in **better structural shape than the user suggests** at the macro level — SSOT for entity registry, design tokens, and validation schemas is largely respected. `tailwind.config.ts` is fully `var(--*)`-driven, hex literals in className are zero, there are only 6 TODO/FIXME comments, only 9 stray `console.*` calls, and 0 hardcoded entity `.from('user_*')` calls in route code. The architecture (domain/lib/api/components split, generic CRUD/list/post handlers, entity registry) is sound.

What's **not** in good shape is **unit discipline around Bitcoin amounts**, **a forest of premature/duplicated currency-formatting APIs**, and **one God component plus a long tail of mid-sized organic UI** that mixes mocked features with real ones. There are ≈17 likely BTC-as-sats unit confusions (T0 product correctness bug), the `useDisplayCurrency()` API has 6 overlapping format functions (`formatAmount`, `formatAmountBtc`, `formatSats`, `displayBTC`, `formatBTC`, `formatCurrency`) which is the root cause of those bugs, and `FormattedAmount` ships with a prop literally named `sats` that callers feed `*_btc` values into. The legacy `DEFAULT_CURRENCY` alias is still imported in 9 places while the "real" name `PLATFORM_DEFAULT_CURRENCY` is documented.

**Highest-ROI fixes**: (1) rename `FormattedAmount`'s `sats` prop and fix all call sites — single PR, removes a class of silent zero-amount displays; (2) collapse the currency-formatting API to two functions (sats→display, btc→display) and ban the rest; (3) decompose `ProfileOverviewTab.tsx` (536 lines, 4 mocked "support" sub-flows) and strip the "Would persist via..." toast placeholders. **Overall health: 6.5/10** — solid bones, slop on the surface, one real product-correctness bug class.

## Phase 1: Dead Code & Files

### Orphans (zero imports)

- `src/components/search/MobileSearchModal.tsx` (276 lines) — no references anywhere in src/. Pure dead weight.

### Tracked-but-empty dirs

- `src/components/debug/` — empty
- `src/components/premium/` — empty
- `src/components/mobile/` — empty
  (All referenced in CLAUDE.md project structure comment, none exist on disk → stale docs.)

### Root-level artifacts (gitignored but cluttering working dir)

- 55+ `audit-*.png`, `verify-*.png`, `tab-*.png`, `rebrand-*.png`, `final-mobile.png`, `landing-fixed-1440-fullpage.png` etc. at repo root. Confirmed gitignored but should be moved to a `.screenshots/` or `tmp/` dir for hygiene.

### Duplicated lightweight utilities

- `src/utils/monitoring.ts` (9 lines, `trackEvent`) and `src/lib/analytics.ts` (112 lines) both implement event tracking. `monitoring.ts` has 3 callers, `lib/analytics.ts` has 4. Consolidate.

### Stale TODOs / placeholder comments

- Only 6 TODO/FIXME/HACK markers in src/ — all benign string-pattern placeholders ("XXX" in phone format docs). None are real action items.
- `src/domain/commerce/service.ts:96` — `exampleTitles = ["Assassin's Creed", 'Example Service', 'Test Service', 'Sample Service']` hardcoded filter ("FUTURE: Add is_example boolean column"). Hacky but documented.

### Commented-out code

- 0 real commented-out code blocks found. Clean.

## Phase 2: SSOT Violations

### Entity-registry violations (route/component code)

- `src/app/api/stakeholders/route.ts:162` — `.from('projects')` hardcoded instead of `ENTITY_REGISTRY.project.tableName`.
- `src/scripts/setup-subscription-funding.js:72,99,126` — `.from('projects')` hardcoded (legacy script, but lives in `src/`).
- `src/lib/api/entityListHandler.ts:170` — `table as 'user_products' | 'user_services' | 'user_causes'` — string-union narrowing hardcodes table names that should be derived from `ENTITY_REGISTRY`.
- `src/types/database.ts:3663, 3674, 3686` — typed aliases `UserProduct`, `UserService`, `UserCause` reference `user_products` etc. as string literals. Acceptable as schema-derived types, but flagged.

### Design-token violations

- `grep '\[#' src/`: **0 hits**. Clean.
- `grep "style={{.*#" src/`: **0 hits**. Clean.
- Hex literals in `tailwind.config.ts`: **0**. Clean.
- 29 hex literals in `.ts` data files (`src/config/tasks.ts:20-26`, `src/lib/email/templates/layout.ts:30-36`, `src/lib/og/branding.tsx:28-40`, `src/app/(authenticated)/dashboard/analytics/components/AnalyticsInsights.tsx:88-92,140`, `src/config/brand.ts:26`). These are:
  - **email templates / OG images**: legitimately can't use CSS vars (run in Node/edge runtime without DOM CSS). Keep but consolidate to one palette object.
  - **`src/config/tasks.ts:19-27`**: `TASK_COLORS` hardcodes `#6B7280` etc. with comment "needed for inline style opacity tricks (${color}20)". This IS a violation — could use Tailwind opacity utility classes. **T2 fix.**
  - **`src/app/layout.tsx:58-59`**: `themeColor` meta — fine, browser metadata.
  - **`src/app/(authenticated)/dashboard/analytics/components/AnalyticsInsights.tsx:88-92`**: chart bar colors. Charts/Recharts need raw values; pattern from CLAUDE.md says use `lib/tokens.ts` re-exports. Currently inline. **T2.**

### Bitcoin Orange (#f7931a) used on non-Bitcoin UI

This is the biggest SSOT-style discipline gap. 126 total usages; the following are not Bitcoin-related:

- `src/components/profile/components/ProfileFormActions.tsx:47` — **profile "Save Profile" CTA**, not Bitcoin. **T1 violation.**
- `src/components/profile/ProfileProjectsTab.tsx:270` — generic project stat label.
- `src/components/stories/StoriesPageClient.tsx:81,94` — story filter ring/active button.
- `src/components/discover/DiscoverHero.tsx:47` — discovery metric color.
- `src/components/project/ProjectUpdatesTimeline.tsx:104,164` — timeline dot color.
- `src/components/wishlist/WishlistDonationTiers.tsx:98,127,129,136` — donation tier UI (this IS funding-related so debatable).
- `src/components/project/ProjectContent.tsx:112,150` — project progress bar / funding stats (also debatable but uses Bitcoin Orange for fiat-aware funding amounts).
- `src/app/(public)/study-bitcoin/ResourceCard.tsx:21-26` — fine, Bitcoin-related.

### Types defined separately from Zod schemas

- `src/types/funding.ts:3` — `FundingPage` interface, 23 fields, manually maintained, NOT derived via `z.infer`. Used in 9 places. Also includes `currency?: 'BTC' | 'SATS' | 'CHF' | 'USD' | 'EUR'` — violates "BTC is canonical" rule (SATS as user-facing currency option).
- `src/types/timeline.ts` — 18 standalone `export type/interface` declarations. Likely many of these duplicate DB types.
- `src/app/wishlists/[id]/page.tsx:24-48` — `interface WishlistItem` + `interface Wishlist` defined inline in a page component instead of derived from the DB types. Same pattern in other entity detail pages.

### Currency / Default constants duplicated

- `src/config/currencies.ts:32` — `DEFAULT_CURRENCY` kept as "Legacy alias" for `PLATFORM_DEFAULT_CURRENCY` but still actively imported in **9 places** (`components/loans/*`, `components/loans/validation.ts`). YAGNI/SSOT violation — kill the alias and migrate the 9 callers.

## Phase 3: God Components / SoC Violations

### Components > 300 lines

| Lines | File                                                                           | Issue                                                                                                                                                                                                                   |
| ----: | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   536 | `src/components/profile/ProfileOverviewTab.tsx`                                | 4 inline "support" sub-flows (subscribe, lend, invest, donate) all mocked with `toast.success("(Would persist via...)")`. Mixes UI + state + mocked business logic. **Split into 4 sub-components or move to dialogs.** |
|   426 | `src/components/entity/EntityDashboardPage.tsx`                                | Generic entity dashboard; review for sub-component extraction.                                                                                                                                                          |
|   403 | `src/components/search/CommandPalette.tsx`                                     | Large but single-purpose; lower priority.                                                                                                                                                                               |
|   369 | `src/components/groups/GroupWallets.tsx`                                       | Likely fetch + filter + render mix.                                                                                                                                                                                     |
|   351 | `src/components/dashboard/TasksSection.tsx`                                    | Tasks list with inline status logic.                                                                                                                                                                                    |
|   338 | `src/app/(public)/faq/page.tsx`                                                | Mostly content data; acceptable.                                                                                                                                                                                        |
|   303 | `src/app/(public)/docs/page.tsx`                                               | Same — content page.                                                                                                                                                                                                    |
|   302 | `src/app/(public)/blog/[slug]/page.tsx`                                        | MDX wrapper, acceptable.                                                                                                                                                                                                |
|   302 | `src/app/(authenticated)/dashboard/analytics/components/AnalyticsInsights.tsx` | Chart container + hardcoded colors.                                                                                                                                                                                     |
|   301 | `src/app/profiles/[username]/page.tsx`                                         | Detail page; acceptable.                                                                                                                                                                                                |

### API routes > 150 lines (should delegate to `domain/`)

| Lines | Route                                                 | Reason it's bloated                                                                                                              |
| ----: | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
|   344 | `src/app/api/cat/chat/route.ts`                       | Action execution + provider resolution + streaming + rate-limit + tool-use all inline. Move `runExecActions` to `services/cat/`. |
|   207 | `src/app/api/stakeholders/route.ts`                   | Hardcodes `.from('projects')` (see SSOT).                                                                                        |
|   198 | `src/app/api/groups/[slug]/events/[eventId]/route.ts` | RSVP + event update logic in route.                                                                                              |
|   194 | `src/app/api/invitations/[id]/route.ts`               | Accept/decline state machine in route.                                                                                           |
|   192 | `src/app/api/groups/[slug]/events/route.ts`           | Pair with above — move to `domain/groups/events/`.                                                                               |
|   189 | `src/app/api/groups/[slug]/invitations/route.ts`      | Same pattern.                                                                                                                    |
|   183 | `src/app/api/research/[id]/route.ts`                  | Likely could use `createEntityCrudHandlers`.                                                                                     |
|   177 | `src/app/api/ai-assistants/route.ts`                  | Hand-rolled list+create; could use entity handlers.                                                                              |

### Hooks doing too much

- All hooks under `src/hooks/` are within the 200-line budget. The largest are `usePostSubmission.ts` (200), `useNavigation.ts` (200), `useMessageSubscription.ts` (196) — borderline but each has a coherent responsibility.

### Components doing direct DB access

- 0 `.tsx` files import `createServerClient` or `supabase.from`. Layer discipline is intact.

## Phase 4: DRY Violations

### Currency formatting (BIGGEST DRY OFFENDER)

Six overlapping APIs for "show an amount":

- `useDisplayCurrency().formatAmount(sats)` — takes sats
- `useDisplayCurrency().formatAmountBtc(btc)` — takes BTC, converts
- `formatSats(sats)` (services/currency) — sats only
- `formatCurrency(amount, code)` (services/currency)
- `displayBTC(btc)` (services/currency/formatting) — used 14× including server pages
- `currencyConverter.formatBTC(btc)` (services/bitcoin/index.ts:406-line file) — used in `BTCAmountDisplay.tsx`

Result: 17 sites pass `*_btc` values to `formatAmount` (which expects sats), silently rendering ~zero values. See Phase 6.

### Entity detail pages

`src/app/{wishlists,investments,assets,loans,causes,events,services,ai-assistants}/[id]/page.tsx` — 8 files each ~150–300 lines, each redefining `interface XYZ` inline and re-implementing fetch-by-slug + render layout. These should share a generic `<PublicEntityDetailPage entityType={...} />` (and one such file exists at `src/components/public/PublicEntityDetailPage.tsx` — under-used).

### WalletCard

Three `WalletCard.tsx` files (49 + 107 + 194 lines = 350 LOC). Different domains (selector, wallet manager, public guide) so partial dedup at best, but the naming collision creates grep ambiguity.

### Analytics event tracking

- `src/utils/monitoring.ts` (`trackEvent`) vs `src/lib/analytics.ts` (also `trackEvent`). Collapse to one.

## Phase 5: KISS / YAGNI Violations

### `DEFAULT_CURRENCY` legacy alias

`src/config/currencies.ts:32` — `export const DEFAULT_CURRENCY: CurrencyCode = PLATFORM_DEFAULT_CURRENCY` kept "for backward compatibility" but 9 active imports use it. YAGNI: either migrate callers and delete, or pick one as canonical.

### `SATS` as a first-class currency option

- `src/config/currencies.ts:21` lists `'SATS'` in `CURRENCY_CODES`. CLAUDE.md explicitly says "Don't mention or use SATS as a product concept (Lightning protocol only)." Currently 8 components branch on `currency === 'SATS'` (CurrencyInput, CurrencyDisplay, WalletForm). **Either commit to deprecating SATS or update CLAUDE.md.**

### Escape-hatch density

- 208 `any` / `as any` occurrences (worst: `lib/api/entityCrudHandler.ts` with 14, `features/messaging/service.server.ts` with 13).
- 251 `eslint-disable` directives across 112 files. Many are legit (`no-img-element` for dynamic Avatar), but `entityCrudHandler.ts` and `entityListHandler.ts` use `as any` to dodge Supabase's table-name string union — the workaround is correct but the disables proliferate.
- 2 `@ts-ignore` in `src/hooks/useMediaQuery.ts:64,66` — legacy browser `addListener`. Acceptable.

### `useMediaQuery` legacy fallbacks

- `src/hooks/useMediaQuery.ts:64,66` — IE/old-Safari `addListener`/`removeListener` shims. Last user of these is browsers from 2018. YAGNI given Next.js 15 + modern browser support.

## Phase 6: Critical Bugs (T0)

### BTC values passed to a sats-typed formatter — silent zero displays

`useDisplayCurrency().formatAmount(sats: number)` expects sats; passing `0.001` (BTC) is interpreted as 0.001 sat ≈ 0 CHF. The commit log includes `94de8f55 fix(currency): drain SATS-stale display + WishlistDonationTiers unit bug` — confirms this class of bug is real and being whack-a-moled.

**Remaining sites (sample, total ≈17 confirmed + more likely):**

- `src/components/ui/FormattedAmount.tsx:17,21,24` — prop named `sats`, used by:
  - `src/app/(authenticated)/dashboard/wishlists/items/[itemId]/page.tsx:114,118` — passes `item.target_amount_btc`, `item.funded_amount_btc`. **Both render as ≈0.**
- `src/components/entity/variants/InvestmentCard.tsx:39,97` — `formatAmount(investment.target_amount)` (units of `target_amount` ambiguous; needs verification).
- `src/components/groups/GroupWallets.tsx:334` — `formatAmount(wallet.current_balance_btc)`.
- `src/components/profile/ProfileWalletSection.tsx:89,99` — `formatAmount(wallet.balance_btc)`.
- `src/components/ai/AICreditsPricing.tsx:39,42,69` — `formatAmount(tier.price_btc)`, etc.
- `src/components/project/ProjectUpdatesTimeline.tsx:165` — `formatAmount(update.amount_btc)`.
- `src/components/create/collateral/CollateralSelector.tsx:81` — `formatAmount(w.balance_btc)`.
- `src/components/bitcoin/BitcoinPaymentModal.tsx:151` — `formatAmount(paymentRequest.amount_btc)`.
- `src/app/(authenticated)/dashboard/bookings/[id]/page.tsx:189,195,208` — three BTC-named fields.
- `src/app/(authenticated)/dashboard/bookings/components/BookingCard.tsx:108` — `formatAmount(booking.price_btc)`.
- `src/app/(authenticated)/dashboard/research/page.tsx:132,251` — `formatAmount(entity.funding_raised_btc || 0)`.
- `src/components/payment/PaymentQRCode.tsx:93` — `formatAmount(amountBtc)`.

### `actor_id` vs `user_id`

- `src/app/page.tsx:32` — queries `projects` by `user_id` (column exists, so not a runtime bug, but inconsistent with CLAUDE.md rule "use `actor_id`"). Not a bug today; flag as drift.
- 139 total `.eq('user_id', ...)` calls; most are on legitimate user-scoped tables (`wallets`, `profiles`, `notification_preferences`, `user_settings`). No found case where an entity table's `actor_id` is queried with the wrong column on a table that lacks `user_id`.

### Missing auth

- All `route.ts` files that don't directly grep for `withAuth|getUser` delegate to `createEntityListHandler`/`createEntityPostHandler`/`createEntityCrudHandlers`, which apply `withAuth` internally. Spot-checked `products/route.ts`, `causes/route.ts`, `products/[id]/route.ts` — all properly wrapped. No exposed routes found.
- Cron routes use `Bearer ${CRON_SECRET}` (`api/cron/cleanup/route.ts:39-40`). OK.

### Console.log in production

- 9 occurrences; 7 are in `utils/logger.ts` itself or doc-comment examples. 1 legitimate `console.warn` in `hooks/useProfileTheme.ts:52`. Effectively clean.

### Hardcoded secrets

- 0. `sk-or-` references are example prefixes in `data/aiProviders.ts` for UI guidance.

## Prioritized Fix List (TOP 20)

| #   | T   | Effort | Single-commit | Path:line                                                                                                                                                                | Fix                                                                                                                                                                                                                      |
| --- | --- | ------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------- | ------------------------------------------------------------------- |
| 1   | T0  | M      | yes           | `src/components/ui/FormattedAmount.tsx:17,21,24` + 2 call sites in `dashboard/wishlists/items/[itemId]/page.tsx:114,118`                                                 | Rename prop `sats` → `btc`, switch to `formatAmountBtc()`. Stops 2 silently-zero amount displays.                                                                                                                        |
| 2   | T0  | L      | no            | All 17 sites listed in Phase 6 passing `*_btc` to `formatAmount`                                                                                                         | Audit each, swap to `formatAmountBtc()` (or add explicit `bitcoinToSats()` conversion). Likely 6–8 commits.                                                                                                              |
| 3   | T0  | M      | yes           | `src/components/payment/PaymentQRCode.tsx:93`                                                                                                                            | `formatAmount(amountBtc)` → `formatAmountBtc(amountBtc)`. Customer-facing payment confirmation, highest blast radius.                                                                                                    |
| 4   | T1  | M      | yes           | `src/hooks/useDisplayCurrency.ts:68`                                                                                                                                     | Rename `formatAmount` → `formatSats` and promote `formatAmountBtc` to default. Forces every callsite to declare unit.                                                                                                    |
| 5   | T1  | S      | yes           | `src/config/currencies.ts:32`                                                                                                                                            | Delete `DEFAULT_CURRENCY` alias; replace 9 imports with `PLATFORM_DEFAULT_CURRENCY`.                                                                                                                                     |
| 6   | T1  | S      | yes           | `src/components/profile/components/ProfileFormActions.tsx:47`                                                                                                            | Replace `bg-bitcoinOrange` Save button with `variant="accent"` (warm accent, not Bitcoin Orange).                                                                                                                        |
| 7   | T1  | S      | yes           | `src/components/profile/ProfileProjectsTab.tsx:270`, `discover/DiscoverHero.tsx:47`, `stories/StoriesPageClient.tsx:81,94`, `project/ProjectUpdatesTimeline.tsx:104,164` | Replace Bitcoin Orange with `text-accent-warm` / `bg-accent` for non-Bitcoin UI.                                                                                                                                         |
| 8   | T1  | S      | yes           | `src/components/search/MobileSearchModal.tsx` (276 lines)                                                                                                                | Delete orphan file.                                                                                                                                                                                                      |
| 9   | T1  | M      | yes           | `src/app/api/stakeholders/route.ts:162`                                                                                                                                  | Replace `.from('projects')` with `ENTITY_REGISTRY.project.tableName`.                                                                                                                                                    |
| 10  | T1  | L      | no            | `src/components/profile/ProfileOverviewTab.tsx` (536 lines)                                                                                                              | Extract `SubscribeFlow`, `LendFlow`, `InvestFlow`, `DonateFlow`; replace mocked `toast.success("(Would persist via...)")` with real handlers or remove until backend exists.                                             |
| 11  | T2  | S      | yes           | `src/types/funding.ts:23`                                                                                                                                                | Drop `'SATS'` from `currency` union (BTC canonical rule).                                                                                                                                                                |
| 12  | T2  | M      | yes           | `src/types/funding.ts`                                                                                                                                                   | Replace hand-written `FundingPage` interface with `Database['public']['Tables']['projects']['Row']` or `z.infer<typeof fundingPageSchema>`.                                                                              |
| 13  | T2  | M      | yes           | `src/app/wishlists/[id]/page.tsx:24-48` (+ 7 sibling entity detail pages)                                                                                                | Move inline `interface Wishlist`/`WishlistItem` to derived types; or refactor all 8 detail pages to use a single `<PublicEntityDetailPage entityType="wishlist" />` (the component already exists).                      |
| 14  | T2  | S      | yes           | `src/utils/monitoring.ts` + `src/lib/analytics.ts`                                                                                                                       | Merge `trackEvent` implementations into one file (pick `lib/analytics.ts`). Delete `utils/monitoring.ts`.                                                                                                                |
| 15  | T2  | M      | yes           | `src/app/api/cat/chat/route.ts:43-97`                                                                                                                                    | Extract `runExecActions` to `src/services/cat/exec-action-runner.ts` (route is 344 lines; target ≤150).                                                                                                                  |
| 16  | T2  | M      | no            | `src/app/api/ai-assistants/route.ts` (177 lines) + `[id]/route.ts`                                                                                                       | Refactor to use `createEntityCrudHandlers` per `ai-assistants` entity registry entry.                                                                                                                                    |
| 17  | T2  | S      | yes           | `src/config/tasks.ts:19-27` `TASK_COLORS` hex literals                                                                                                                   | Replace with Tailwind opacity utility classes (`bg-gray-500/20`) instead of `${color}20` string concatenation.                                                                                                           |
| 18  | T2  | S      | yes           | `src/lib/api/entityListHandler.ts:170`                                                                                                                                   | Replace `'user_products'                                                                                                                                                                                                 | 'user_services' | 'user_causes'`literal cast with type derived from`ENTITY_REGISTRY`. |
| 19  | T2  | S      | yes           | `src/domain/commerce/service.ts:96`                                                                                                                                      | Replace `exampleTitles` title-blacklist with the planned `is_example` column migration.                                                                                                                                  |
| 20  | T2  | S      | yes           | `src/components/ai-chat/AIChatPanel.tsx` + `useAIChatPanel.ts`                                                                                                           | Verify whether old `AIChatPanel` is still used after `ModernChatPanel` migration (only used in one legacy route `(authenticated)/ai-chat/[assistantId]/[conversationId]/page.tsx`). If route is dead, delete both files. |

---

**Audit complete.** No T0 findings outside the BTC/sats unit-confusion family. The codebase has good guardrails (entity registry, design tokens, validation schemas, withAuth wrappers); the slop is in the user-facing layer where mocked features, currency-formatter sprawl, and a handful of organic god-components live. Fix #1–#3 in a single sprint to extinguish the worst silent-data bug class.
