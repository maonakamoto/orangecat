# Codebase Audit Report

**Date**: 2026-06-29
**Auditor**: Claude Code (3 parallel agents)
**Branch**: main
**Scope**: Next-tier review after a 13-change session (Cat chat/memory, ai_assistant chat + Cat Credits, schema-drift gate, 14-table drift remediation, audit logging, post_to_timeline, circle entity, mobile fixes) — confirm no regressions + surface new high/medium findings.

## Executive Summary

The session's work holds up well. Build gates are clean (`tsc --noEmit` → **0 errors**, `npm run lint` → clean, **0 `console.*` in any session file**), the design-token SSOT is still pristine (0 hex violations), both previously-flagged registry duplications are confirmed fixed, and mobile-first held across all new UI (circle pages + the public AI-assistant chat inherit the generic mobile-first components cleanly).

The audit found **no HIGH-severity issues** but four genuine MED/LOW defects introduced this session — one of them a security gap (public-table RLS too permissive). All four were fixed in the corrective change accompanying this report. The remaining findings are SSOT-discipline debt on _newer_ (mostly pre-session) code and service-file size — tracked as roadmap, not regressions.

## Health Score

| Area                   | Score    | Notes                                                                                      |
| ---------------------- | -------- | ------------------------------------------------------------------------------------------ |
| First Principles       | 8/10     | Strong SSOT spine; discipline slipped on some new code (raw table literals)                |
| Best Practices         | 9/10     | 0 console/any in session code; gates green; standard response shapes                       |
| SSOT / DRY / SoC       | 7/10     | Tokens 0/0; dupes fixed; but ~27 tables missing from DATABASE_TABLES + 7 services >500 LOC |
| Functional Correctness | 8/10     | 4 real defects (now fixed); auth/RLS otherwise sound                                       |
| UI/UX & Responsive     | 9/10     | Mobile-first held; 1 LOW (long-token wrap in chat bubble)                                  |
| **Overall**            | **8/10** | Healthy; the gap is SSOT discipline on new code + a few service god-files                  |

## Fixed in this corrective change

| Sev        | Finding                                                                                                                                                                                  | Fix                                                                                                                  |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **MED 🔒** | `project_updates` INSERT RLS was `WITH CHECK (auth.uid() IS NOT NULL)` on a public-read table → any authed user could inject fake updates into ANY project's timeline (`20260627000002`) | Migration `20260629000000`: INSERT scoped to the project's owner (`projects.actor_id → actors.user_id = auth.uid()`) |
| **MED**    | `sendMessage.fetchAssistant` SELECT omitted `allowed_models`/`min_model_tier` → creator's model allow-list silently ignored for BYOK routing (`sendMessage.ts:296`)                      | Added both columns to the SELECT                                                                                     |
| **MED**    | `timeline_events.subject_type` CHECK (`20260627000003`) omitted `circle` (added a day later) → Cat promoting a circle would fail the constraint                                          | Migration adds `'circle'` to the CHECK                                                                               |
| **LOW**    | `audit_logs` INSERT `WITH CHECK (true)` via user-scoped client → spoofable rows                                                                                                          | Migration: `WITH CHECK (user_id = auth.uid() OR auth.uid() IS NULL)`                                                 |

## Roadmap (not regressions — pre-existing / tracked)

### Quick wins (mechanical, zero behavior change)

- **Backfill `DATABASE_TABLES`** for ~27 raw `.from('literal')` tables not in the SSOT: `oauth_*` (4), `user_nudges`, `content_embeddings`, `project_roles`, `user_plans`, etc. Plus ~18 literals where the const already exists (`profiles`, `actors`, `follows`, `stakeholder_relationships`) — swap them in.
- Route ~14 hardcoded `fetch('/api/...')` strings through `API_ROUTES`.
- `AIChatMessage.tsx:72` — add `break-words` so a long unbroken token (URL/hash) can't overflow on a 360px screen (LOW).

### Medium effort (SoC)

- 7 service files exceed the 500-LOC limit: `system-prompt.ts` (655), `context-string-builder.ts` (605), `chat-orchestrator.ts` (597), `timeline/mutations/events.ts` (588), `ai/sendMessage.ts` (559), `cat/tool-use.ts` (545), `timeline/processors/socialInteractions.ts` (524). Decompose the prompt/context builders especially.
- `reindex-embeddings/route.ts` (418 LOC) — extract embedding/reconcile logic to `src/services/search/`; route becomes a thin trigger.
- Hand-written `Create*Input` interfaces (groups, contracts, bookings) → derive from Zod (`z.infer`).
- `assistant-charge.bumpAssistantRevenue` — non-atomic read-modify-write of `total_revenue` (lost-update race; documented best-effort, ledger is SSOT). Convert to an atomic SQL increment.

### Strategic / owner

- Provision `PLATFORM_NWC_URI` on the box — unblocks paid ai_assistants + Cat Credits top-up (and relieves the free-tier 429s). Highest-leverage item.
- Disk at 91% on bitbaum.
- Messaging E2E/Nostr — product decision (docs already corrected to "roadmap, not shipped").

## Regression check (per session feature)

- **circle entity** — correct; now also linkable as a timeline subject (fixed).
- **ai_assistant chat** — correct; `allowed_models` now fetched (fixed).
- **audit logging** — correct, non-blocking; spoof gap tightened (fixed).
- **Cat post_to_timeline** — correct; circle subject now allowed (fixed).
- **schema-drift gate + migrations** — sound, idempotent, fresh-box-safe.
- **drift remediation (14 tables)** — holds; allowlist empty; gate green.
- **mobile fixes / PageHeading / selects** — all held.
- **Cat recall parallelization** — shipped (PR #305).

## Verification

- `tsc --noEmit --incremental false`: 0 errors · `npm run lint`: clean · 0 `console.*` in session files
- Schema-drift gate: green against the box · design-token hex: 0/0
