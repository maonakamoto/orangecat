# Spec: Cat as Economic Agent — "What can I offer?"

**Status**: Proposed
**Date**: 2026-06-29

> Cat reasons over what it knows about you + live platform demand, and proposes
> grounded, spectrum-spanning, publishable ways to participate economically —
> then carries them to a real transaction. This is the core of "your AI economic
> agent," not a feature bolted onto a marketplace.

---

## 1. Why (first principles)

Most people sit on **latent economic value they can't see or won't act on** — a
skill, an asset, a network, a half-built thing. A résumé is passive; LinkedIn shows
you to recruiters for jobs. OrangeCat's promise is different and bigger: an agent
that **actively turns who you are into income, funding, and opportunity**, across
the full economic spectrum, continuously.

The value is real **only if** suggestions are grounded and specific. The failure
modes (and the guardrails that kill them) are first-class requirements, not caveats:

| Failure mode                   | Guardrail                                                                                                                                                                                                      |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Generic ("you could consult!") | Every suggestion is a **packaged offer** with title, scope, price, and a draft listing                                                                                                                         |
| Fabricated demand              | Suggestions cite **real signals** (on-platform searches/requests, comparable listings, matchable counterparties) or are flagged speculative. Never invent demand (cf. the earlier "Cat invented personas" bug) |
| Hustle-pressure                | **Opt-in**, calibrated; respects users who are here to fund/learn/govern, not sell                                                                                                                             |
| Cold-start (no buyers yet)     | Lean on **packaging + drafting** value early; matchmaking value grows with network density. Be honest about which is which                                                                                     |
| Real-identity assumption       | **Pseudonymous by default**; user chooses what becomes public                                                                                                                                                  |

## 2. What it does

A capability Cat can invoke (and offer proactively at the right moments):
**given everything it knows about you, propose concrete ways to participate
economically, ranked, grounded, and one approval from being live.**

### Inputs (Cat's world model)

- **Profile** — bio, background, skills, location, links.
- **Documents** (`document` entity = "structured context for the Cat") — e.g. a
  pasted LinkedIn/CV, portfolio, notes.
- **Memories** (`cat_memories`) — durable facts learned over time.
- **Existing entities** — what you already offer (avoid duplicates; suggest gaps).
- **Live demand signals** — recent platform searches, unmet `search_platform`
  queries, comparable active listings + their prices, open requests. _(This source
  is the main new dependency — see §4.)_

### Reasoning

1. Extract your **latent assets**: skills, experiences, assets, audiences, outputs.
2. Map each asset to the **economic spectrum** — not just "sell a service":
   - skill → `service` (for hire) · output → `product` · venture → `project` (fundable)
   - asset → `asset` (rent/sell) · expertise → `research`/`document` · capital → `investment`/`loan`
   - audience/community → `group`/`circle` · cause you care about → `cause`
3. **Ground & rank** each candidate offer against demand signals + comparables.
   Score = fit × demand × ease-to-publish. Drop the ungrounded.
4. **Package** the survivors: title, scope/what's-included, suggested price (in CHF,
   payable in Bitcoin/any currency), and a one-line rationale citing the signal.

### Output

A short, ranked set of **proposed offers**, each a reviewable card:

```
💼  "Ship-your-Next.js-app review"  ·  Service  ·  CHF 120 / 60 min
    Why: 3 people searched "next.js performance" this week; you've shipped 4 such apps.
    Confidence: grounded (real demand)        [ Edit ]  [ Publish ]
```

Each card is a `prefill_entity_form` draft → one tap publishes a real entity → it
enters search + matchmaking → you get paid. The agent **closes the loop**, it
doesn't just ideate.

## 3. UX / where it shows up

- **Explicit**: "What can I offer?" / "Help me make money with what I have" → Cat
  runs the capability and returns the ranked cards.
- **Proactive (opt-in, calibrated)**: after a profile/LinkedIn import, after adding
  a document, or as an occasional nudge — _offered_, dismissible, never pushy.
- **Honest framing**: each card shows confidence (grounded vs speculative). Cat says
  what it's unsure about rather than overselling.

## 4. Build (reuses existing primitives)

Already exist: `prefill_entity_form` (single-entity drafting), the `document` entity
type, semantic memory (`cat_memories` + pgvector), `search_platform`, the entity
registry, the payment engine.

Gaps to build:

1. **Profile/document import → world model**: an `update_profile` / enrich action
   (Cat currently can't write the profile) + auto-saving a paste as a `document`.
2. **Multi-entity prefill**: let one blob yield **several** ranked offer drafts
   (today prefill is one-at-a-time and keyword-gated).
3. **Demand-signal source**: a lightweight service exposing recent searches / unmet
   queries / comparable-listing stats for grounding (the one real new dependency).
4. **The "offer engine" handler**: a Cat capability that runs the §2 reasoning over
   inputs + signals and emits ranked offer cards.
5. **Guardrail prompts/tests**: grounded-only, confidence-flagged, opt-in — with a
   regression test that it never fabricates demand.

### Sequencing

1. Profile/document import (enrich profile + save `document`) — unlocks the world model.
2. Multi-entity prefill from a blob — immediate, packaging-led value (works pre-liquidity).
3. Demand-signal grounding + ranking — turns suggestions from plausible to evidenced.
4. Proactive, calibrated surfacing — once quality is proven.

## 5. Acceptance

- Given a populated profile/document, Cat returns ≥3 **specific, packaged,
  publishable** offers spanning more than one entity type.
- Each cites a real signal or is explicitly flagged speculative — **zero fabricated
  demand** (tested).
- One tap on a card publishes a real entity that enters search/matchmaking.
- Opt-in; never shown to a user who's signalled they don't want to sell.
- Pseudonymous-safe; user controls what's public.
