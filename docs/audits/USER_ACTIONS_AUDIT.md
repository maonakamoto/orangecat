# OrangeCat — Comprehensive User-Actions Audit

**Generated:** 2026-06-23 · **Branch state:** `main` (PRs #245/#257/#258 merged; #259 OG cards open)

Purpose: enumerate **everything a user can do**, record **whether it works**, and
rank the **friction offenders** against the product principle — _clear CTA, fewest
clicks, least page-loads, least reading, least cognitive load; the shortest path
forward without needing to read_.

## Legend (test status)

- ✅ **verified-live** — exercised on https://orangecat.ch this audit
- 🟢 **E2E-covered** — has a Playwright/Cypress spec run in CI + pre-push (green on last push)
- ⏳ **needs-auth-test** — reachable only logged-in; not hand-tested this pass
- ⛔ **gap** — confirmed missing/incomplete (backend or UI)
- ⚠️ **friction** — works, but violates the easy-path principle

Friction = approx. clicks/steps · whether the next step is obvious · whether reading is required.

---

## 1. Coverage scorecard

| Domain                                            | ~Actions | Reachability      | Test status                                                |
| ------------------------------------------------- | -------- | ----------------- | ---------------------------------------------------------- |
| Discovery / nav / public-view / share             | ~120     | mostly logged-out | ✅ verified-live (listings, detail pages, CTAs, share)     |
| Auth / onboarding / settings                      | ~56      | logged-out + auth | 🟢 E2E (auth, onboarding) · ⏳ settings sub-pages          |
| Entity lifecycle (14 types)                       | ~90      | auth              | 🟢 E2E (project create/edit) · ⏳ other types              |
| Money: buy / book / donate / wallets              | ~80      | logged-out + auth | ✅ anon pay-direct · 🟢 donation-flow · ⛔ booking→pay     |
| Social / messaging / notifications / groups / Cat | ~110     | mostly auth       | 🟢 messaging/social E2E · ⏳ groups/Cat · ⛔ a few UI gaps |

**Verified-live this pass (HTTP 200 + primary action present):** home, discover, all 12 public listings, auth page, profile, and the share-landing detail pages for product/service/cause/loan/project (one shared `PublicEntityDetailPage` template → covers all generic types). Anonymous pay-direct panel (QR + address + open-in-wallet) confirmed on entity pages.

---

## 2. Action inventory (by domain)

### A. Discovery, navigation, public viewing, sharing — _(logged-out reachable)_

- Home hero: **Discover**, **Start Creating** CTAs · stat-card links · lazy sections — ✅ · 1 click, obvious
- Header/nav: Discover / Community / About · theme toggle · **⌘K command palette** · Sign In / Get Started — ✅ · 1 click/keystroke
- Mobile: hamburger drawer · **bottom nav** (Home/Discover/+/Login) — ✅
- Discover: type tabs (All + 13 types) · search box · sort (Newest/Relevance) · grid/list toggle · status pills · category pills · country/city/postal/radius filters · clear-all · load-more · result cards → detail — ✅
- Command palette: open (⌘K / "/"), full search (⌘↵), 11 quick-create actions, jump-to pages, async result rows — ✅ (quick-create → auth gate)
- Entity detail (generic): breadcrumb · header (title/status/category/**key-fact**) · cover hero + lightbox · description · funding/details · owner card → profile · **Share** (native + X/FB/LinkedIn/WhatsApp/Email/copy) · payment section · mobile sticky CTA — ✅
- Profile: banner · **Share** · **Follow** (auth gate) · tabs (Overview/Info/Timeline/Projects/per-type/People/Wallets) · Overview projects + **Support** deep-link · social links · copy wallet addresses — ✅

### B. Auth, onboarding, account, settings

- Auth: email login · register (pw strength, confirm, CAPTCHA-if-enabled) · OAuth (only server-enabled providers) · **anonymous sign-in** · forgot-password (3-step) · reset-password · email-verify link · sign-out — 🟢 E2E (login/auth-flows)
- Onboarding (`/onboarding/intelligent`): name + "what are you here to do" + 6 example prompts + voice (flag) → Cat — 🟢 E2E (intelligent-onboarding)
- Settings: update email · change password · **MFA enable/disable** (4-step) · recovery codes (view/copy/download/regenerate) · connect Nostr · **delete account** (confirm) — ⏳
- Notification prefs: 5 category toggles · digest frequency · **Save changes** (⚠️ no auto-save) — ⏳
- AI settings: managed mode · BYOK key add/delete/reorder · local mode (coming-soon) — ⏳
- Integrations: mint/revoke integration keys · webhook endpoints + deliveries drawer — ⏳
- Profile edit: avatar/banner upload · username/name/bio/location · website/social links (max 5) · contact email/phone · **currency preference** · save/cancel · completion meter — 🟢 E2E (profile-info-workflow)

### C. Entity lifecycle — all 14 types _(auth)_

Per type (product, service, project, cause, research, wishlist, event, loan, asset, ai_assistant, group, investment; + document, wallet special):

- **Create** via wizard (`/dashboard/<type>/create`) — ⚠️ multi-step (actor → template → form → review)
- **Create via Cat** (chat → suggestion → confirm → prefilled form) — ⏳
- **Edit / Delete (confirm) / Publish / Pause / Resume / Archive / toggle profile-visibility** — 🟢 (project) · ⏳ (others, generic status API)
- Dashboard: list / filter-by-status / search / bulk-select+delete / pagination — ⏳
- Type-specific: project updates + favorite · wishlist items + proof upload · loan offers (make/accept/reject) · group members/roles/proposals/votes/events · asset→loan collateral link · event RSVP
- Coverage notes: templates for project/product/service/ai/event/research/wishlist/asset; **document** = no publish (Cat context only); **wallet** = link-only (no CRUD).

### D. Money — buy / book / donate / wallets

- **Buy product** (fixed price): PaymentButton → PaymentDialog (QR → "I've paid") — 🟢 (donation-flow E2E) ; anonymous pay-direct ✅
- **Donate/support** (project/cause/research/investment/wishlist-tier): amount picker (5 presets + custom) → message → anonymous toggle → pay — ✅ anon · ⚠️ 5–6 steps
- **Anonymous pay-direct**: on-chain BIP21 / Lightning URI, QR, copy, open-in-wallet — ✅
- **Auth invoice flow**: initiate → poll (NWC 3s / LN 5s / on-chain 30s) → success/expire/error — ⏳
- **Book a service**: BookEntityDialog (time + notes) → request — ⏳ ; **⛔ pay-after-confirm NOT wired**
- Wallets: add (category/name/address/lightning/goal) · set primary · refresh balance (5-min cooldown) · edit · delete (confirm) · up to 10 · **⛔ wallet→wallet transfer API exists, no UI**
- Owner collect panel: receiving address · copy link · QR · manage wallets — ✅ (owner)
- Event ticket (if priced) / group-event RSVP (free) — ⏳

### E. Social / messaging / notifications / groups / Cat

- Timeline: create post (visibility, project-tag) · edit · delete (confirm) · **like / dislike (scam-signal)** · reply · repost / quote-repost · share · view thread — 🟢 (social-and-messaging E2E)
- Follow / unfollow · followers/following (People tab) — ✅ (view) / ⏳ (action)
- Messaging: new DM (search → start) · send (optimistic, read receipts) · edit/delete message · delete conversation (bulk) · All/Requests tabs · summary — 🟢 (messaging E2E) · ⚠️ offline queue is placeholder
- Notifications: bell → center · tabs (All/Unread/Payments/Social/Messages) · mark read / mark-all-read / delete · load more · click-through — ⏳
- Groups: view/list · **join** (✅ service) · **⛔ leave (service exists, no UI)** · members/roles (⏳/partial) · group wallets (create/refresh/copy) · **proposals** (create/vote/breakdown) · **events** (create/RSVP) · activity feed — ⏳
- Cat: open chat · send (streamed) · **voice dictation** · model selector (tiers) · BYOK manage · clear chat · history · **context tab** (+completeness) · **create-entity action** · **pending actions confirm/reject** (✅ wired) — ⏳

---

## 3. Confirmed gaps (fix correctness — a path that dead-ends is the worst UX)

| #   | Gap                                                                  | Evidence                                                                                | Impact                                                                  |
| --- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| G1  | **Service booking has no pay step**                                  | `api/bookings` has no payment wiring; money-flow agent confirms booking is request-only | A buyer books but cannot pay in-app — broken commerce path for services |
| G2  | **Group "leave" has no UI**                                          | `services/groups/mutations/members.ts:leaveGroup` exists; no button found               | Members can join but not leave                                          |
| G3  | **Wallet→wallet transfer has no UI**                                 | `api/wallets/transfer/route.ts` exists; no component uses it                            | Dormant feature                                                         |
| G4  | Group member role-change / remove / invite, proposal activate/cancel | flagged "not visible"; members API dir exists — **needs runtime verification**          | Group admin UX likely incomplete                                        |
| G5  | "Who reacted" list, group search, failed-message retry               | flagged missing                                                                         | Minor polish                                                            |

> G4/G5 are static-analysis flags — verify in a logged-in session before fixing.

---

## 4. Friction backlog (the "shortest path / least cognitive load" queue) — ranked

| Rank | Flow                                    | Problem                                                                                                                                   | Fix direction                                                                                                                                                         |
| ---- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1   | **Entity creation (all types)**         | Multi-step wizard (actor → template → form → review); research = 6+ field groups. Heaviest cognitive load, and it's the core value action | Smart defaults, defer all-optional fields behind "advanced", single-screen for simple types, Cat-first create with prefill; cut steps to "name + one field → publish" |
| F2   | **Sign-up → email-verify → onboarding** | 3 hops before any value                                                                                                                   | Lead with anonymous-first / instant value; defer verification                                                                                                         |
| F3   | **Donate/contribute**                   | 5–6 steps (amount → message → anonymous → review → pay)                                                                                   | Collapse to amount→pay; message/anonymous as optional inline; remember last amount                                                                                    |
| F4   | **Notification prefs no auto-save**     | Silent data loss if you leave without "Save"                                                                                              | Auto-save on toggle (optimistic)                                                                                                                                      |
| F5   | **AI model selection**                  | Requires understanding 4 tiers to act                                                                                                     | Strong "Auto" default; hide tiers behind "advanced"                                                                                                                   |
| F6   | **Booking**                             | datetime-local + notes before knowing if slot is free                                                                                     | Show availability up front; one-tap slot pick                                                                                                                         |

---

## 5. Recommended next steps (in order)

1. **G1 booking→payment** — close the broken service-commerce path (correctness).
2. **F1 simplify create** — biggest cognitive-load win; start with the simplest types (product/service/cause) collapsing to one screen.
3. **F4 notification auto-save** + **G2 leave-group button** — quick wins.
4. Verify G4 group-admin actions in a logged-in session; fix what's missing.

> Re-run this audit after each batch; keep the scorecard honest.
