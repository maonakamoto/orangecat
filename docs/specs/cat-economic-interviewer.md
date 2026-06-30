# Spec: Cat as Economic Interviewer & Growth Agent

**Status**: Proposed
**Date**: 2026-06-30
**Builds on**: `economic-agent-capability.md` (the offer engine, shipped slices 1–2)

> The offer engine answers "what can I offer?" from what Cat already knows. But for
> most users Cat knows almost nothing — the profile is two free-text fields and the
> engine never learns anything new. The bottleneck isn't reasoning; it's **data**.
> This spec is how Cat _earns_ that data: by interviewing the user the way a great
> coach does, persisting what it learns, and turning gaps into the smallest next step.

---

## 1. The problem (first principles)

An economic agent is only as good as its model of you. Today:

- **The offer engine is read-only.** `generateOffers()` reads context + proposes; it never extracts or saves anything it learns (`src/services/cat/offer-engine.ts`).
- **The profile is thin.** `fetchProfileForCat` surfaces 7 fields; only `bio` + `background` are "who you are." Skills, goals, assets, constraints, motivation — and the single richest signal, _"what do people come to you for?"_ — have **nowhere to be stored** (`document-context.ts:116`, `document-context-types.ts:9`).
- **Everything valuable degrades to prose.** "Skills"/"goals" exist only as free-text `document` blobs or `cat_memories` — great for LLM grounding, useless for querying ("users with skill X and no service"), gap-detection, or pricing.
- **Interviewing is actively forbidden.** The system prompt says "NEVER open with a list of questions… at most ONE, optional" (`system-prompt.ts:92`). There is no proactive discovery capability — it's suppressed by design.

So the agent can't see most of the user's value, can't learn it, and isn't allowed to ask.

## 2. The methodology — how Cat should interview (grounded research)

Eight principles (sources in the blog post and research notes):

1. **Evoke, don't extract.** Ask the question that makes the _user_ name their value; self-generated claims are believed, assigned ones resisted (Motivational Interviewing).
2. **The best assets are invisible to their owner.** The _curse of expertise_ — people discount what's easy for them. Treat "oh, that's nothing / it's just a hobby / everyone can do that" as a **high-priority asset flag**, and reflect it back.
3. **Effortlessness, yearning, rapid learning** are better talent probes than "what are you good at?" (CliftonStrengths). Ask _what do people come to you for, what do you lose track of time doing, what did you learn faster than peers._
4. **Stories in, assets out.** Never ask users to self-assess. Ask for episodes ("tell me about a time someone thanked you"); Cat mines the story for the asset (Appreciative Inquiry + STAR). Also pseudonymity-safe — a story about _what you did_ needs no real identity.
5. **Ladder up and down.** From "I fix bikes" → "I get people back on the road cheaply" → _who else needs that_ (a market); and from a value back down to a concrete offer (means-end / JTBD).
6. **One question at a time, branch on the answer.** A tree, not a form. Narrate _why_ you're asking. Stop when a pattern repeats, not when a checklist completes.
7. **What/how to gather, a single well-placed "why" to reach value.** Overusing "why" makes people defensive.
8. **Twelve forms of value, not two.** Map the user onto all of them (Personal MBA): your spare room is a _lease_, your following is _audience aggregation_, your savings is _capital_, your time is an _option_. OrangeCat already has an entity type for each — the unfair advantage.

### Question taxonomy (entity-mapped)

| Probe (Cat's voice)                                                  | Signal to listen for                                 | Entity                                          |
| -------------------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------- |
| "What do people come to you for help with?"                          | recurring unpaid help; "that's easy"                 | `service`                                       |
| "What do you make — even occasionally — that people ask about?"      | an artifact + an unsolicited "where'd you get that?" | `product`                                       |
| "What did you learn the hard way that could save someone months?"    | 1,000s of hours the user discounts                   | `research` / `document` / teaching              |
| "What do you own that mostly sits unused?"                           | any low-utilization durable good                     | `asset` (rent/sell)                             |
| "Savings you'd put to work — lend back, or back for a share?"        | capital + a strings preference                       | `loan` / `investment`                           |
| "Do people already gather around you for anything?"                  | an existing convening role                           | `circle` / `group`                              |
| "What do you wish existed — or what makes you angry no one's fixed?" | affect (anger, longing)                              | `cause` (no strings) / `project` (soft strings) |
| "Is there a gathering you could run once and see who shows?"         | "I've always wanted to host…"                        | `event` (the cheapest live MVP)                 |

## 3. Gap-filling — detect, propose the smallest step, close the loop on-platform

1. **Detect by adjacency, not deficiency.** "You're 80% of the way there," never "you lack Y." Compare the user's surfaced assets against the requirements of the next-higher-value entity they could plausibly create.
2. **Size the prescription to the gap.** Credential/proof gap → a _micro-credential_ (10–40h), not a degree. Demand/confidence gap → an _experiment_ (list one service slot, run one event), not a course.
3. **Always pair a gap with a same-platform stepping stone.** Never end on advice; end on a **draft entity** the user can publish in two clicks. The loop that identifies the gap also hosts the fix — OrangeCat's structural advantage.

## 4. The data model — the keystone (internal analysis)

**The single highest-leverage move: a structured economic-profile store.** Cat already has write-paths (`update_profile`, `add_context`, memory auto-extraction) and a read-path (`fetchFullContextForCat`). What's missing is a _queryable home for latent economic value_.

- **P1 (structural, keystone):** `actor_economic_profile` — typed rows for `skills[]` (name, level, years), `assets[]`, `goals[]` (text + kind: earn/fund/learn/connect), `constraints[]`, `what_people_ask_me_for[]`, `motivation`, `stage`. Migration under `supabase/migrations/`; extend `ProfileContext` + `fetchProfileForCat` + `renderProfile`. _Structural, not documents,_ because gap-detection / matchmaking / pricing must **query** these, not parse prose.

## 5. Roadmap (small vs structural)

| Improvement                                                               | Type                                                     |
| ------------------------------------------------------------------------- | -------------------------------------------------------- |
| Structured economic-profile store                                         | **Structural (keystone)**                                |
| `interview` / `discover_value` tool + `save_economic_profile` handler     | Small (prompt + handler, once store exists)              |
| Anti-interrogation prompt carve-out, gated on profile completeness        | Small (prompt)                                           |
| Structured + profile-backfilling passive extraction (upgrade `memory.ts`) | Medium                                                   |
| Onboarding launches the interview (`IntelligentOnboarding`)               | Small                                                    |
| Economic-completeness score + `renderEconomicGaps` context section        | Small (derived)                                          |
| `nudges.ts` reads the full picture + a new `growth` nudge type            | Medium                                                   |
| Growth/learning schema                                                    | Structural — **defer** (YAGNI until the nudge proves it) |

## 6. Guardrails (non-negotiable)

- **Opt-in / anti-hustle.** Ask permission before exploring monetization; honor "this is just for me." A Cat that honestly says "I don't see paying demand for this yet — here's what would change that" is _more_ trusted than one that hypes everything.
- **Pseudonymous-safe.** The story-based method needs no real identity.
- **Never fabricate demand or flatter.** Evoke the user's own reasons; ground in real signals only.

## 7. Acceptance (first slice)

Given a near-empty profile, Cat runs a short adaptive interview (2–3 questions/round, one economic dimension at a time), and what it learns is **saved durably** to the structured store — so the next "what can I offer?" is materially better. Every gap surfaced ends in a publishable draft entity. Opt-in; nothing saved without consent.
