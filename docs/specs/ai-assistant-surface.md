# AI Assistant Surface — Product Spec

**Status:** In progress (2026-07-02)
**Trigger:** Founder review — breadcrumb misalignment, "page looks bad and is not really working".

## Product thesis (why this exists at all)

An `ai_assistant` is packaged expertise as a chat agent: a creator writes the
system prompt, sets a per-message price, and anyone on earth can talk to it.
The GPT Store already exists — our wedge is what it structurally cannot copy:

1. **Per-message Bitcoin micropricing.** Card rails make sub-franc payments
   impossible (fixed fees eat them). Lightning + prepaid Cat Credits make
   "0.00000200 BTC per message" viable. Micropriced expertise is the product.
2. **Pseudonymous creators, 95% revenue share, no geographic payout gates.**
   GPT Store pays a US-centric trickle; we pay 95% to any actor with a wallet.
3. **The assistant is an OrangeCat entity** — it has a wall, an owner, a
   wallet; the Cat can recommend it in matchmaking.

The buyer-side product in one sentence: **the assistant's page IS the
conversation** — like a person's chat window, not a database record.

## Diagnosis (2026-07-02, verified live)

| Problem                                                       | Root cause                                                                                                                       |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Discover "No AI Assistants Yet"                               | Not a bug — **zero published assistants ever** (5 rows: 4 drafts, 1 archived test; 2 owned by a literal test user)               |
| Breadcrumb "Home / X" misaligned (label floats above the row) | `Breadcrumb.tsx` nests each item in its own `span.flex`, a second flex context that breaks cross-alignment                       |
| Detail page = stacked unrelated cards                         | Detail config renders leftover Pricing / Welcome Message / Details cards below the chat; welcome text duplicated; pricing buried |
| Chat feels like a widget, not the product                     | `max-h-[28rem]` box in the middle of a document-style page                                                                       |
| Filter sidebar irrelevant                                     | Discover shows project-status/categories filters for assistants                                                                  |

## Design (this iteration)

1. **Breadcrumb (global fix):** flatten items to siblings of ONE flex row
   (Fragment, not nested `span.flex`). Every page inherits the fix.
2. **Assistant detail page = chat-first product page:**
   - Header: avatar · name · price chip ("Free" or "≈ CHF x / message") ·
     category. No separate Pricing card, no Welcome Message card (the chat
     renders the welcome as the first assistant message).
   - Chat takes the main column at conversation height (`~70vh`), composer
     always visible.
   - Compact meta row (tags + personality) under the chat, single line style.
3. **Supply:** publish one flagship free assistant ("OrangeCat Guide" — helps
   visitors use the platform; owned by the founder account). Real, useful,
   demonstrates the loop; Discover stops being empty.
4. **Follow-ups (not this iteration):** per-type Discover filters (hide
   project-only facets for assistants), creator analytics on the dashboard
   card (revenue/messages), Cat-assisted assistant creation, guest trial
   messages (3 free before sign-in), paid loop activation (needs
   PLATFORM_NWC_URI).

## Definition of done (this iteration)

- Breadcrumb visually aligned on entity detail pages (verified in prod).
- Assistant page renders chat-first with price chip (verified in prod).
- ≥1 published assistant visible on Discover and answerable in prod chat.
