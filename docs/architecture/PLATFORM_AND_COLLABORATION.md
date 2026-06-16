# OrangeCat as a Platform — and how it couples with FleetCrown

**Status:** Architecture decision / north star. Not fully built — this is the
design both products converge toward.
**Scope:** OrangeCat (this repo) + FleetCrown (separate repo,
`/home/g/dev/fleetcrown`). Cross-product.
**Companion specs:** `cross-product-identity-bridge.md` (FleetCrown repo — the
"Login with OrangeCat" / OIDC keystone).

---

## The problem

OrangeCat and FleetCrown are **both deeply collaborative, multi-tenant** products.
OrangeCat is identity + economy + communication + presence. FleetCrown is the
AI agent-fleet that builds things. But **building is itself collaborative** — teams
talk, fund, divide roles, ship updates. So FleetCrown appears to "need"
collaboration and communication too.

That creates an apparent contradiction:

- Put collaboration/comms in **both** apps → two diverging systems → **SSOT is dead**.
- Send FleetCrown users **over to** OrangeCat to collaborate → constant
  context-switching → **UX is dead**.

They may merge someday, but **not now**. So we need tight coupling and mutual
empowerment _today_, under SoC / SSOT / DRY / config-driven discipline, without a
merge and without either failure above.

## The core move

> **Separate _where state lives_ (SSOT — one home) from _where it is rendered_
> (both UIs).**

State is single-homed; presentation is dual. Every decision below derives from this
one line. It dissolves the contradiction: collaboration state lives once (in the
platform), and is rendered natively wherever it's needed.

## The reframe: OrangeCat is two things

1. **OrangeCat the _platform_** — the headless backbone: identity, social graph,
   messaging, economy, event stream, collaboration primitives. API-first.
2. **OrangeCat the _app_** — one client of that platform (the public social/economy
   product).

**FleetCrown is the second first-party client** of the same platform. Future
products — and eventually third parties via "Login with OrangeCat" — are further
clients.

So "Login with OrangeCat" is **not** an OC↔FC bridge; it is the **platform's front
door**. This is why the OIDC provider is the keystone: it's how any client adopts
the one identity + economy.

```
                 ┌───────────────────────────────────────────────┐
                 │            OrangeCat — the platform            │
                 │  actors · groups · follows · conversations ·   │
                 │  timeline_events (event bus) · wallets ·       │
                 │  payment_intents · project_roles · OIDC        │
                 └───────────────▲───────────────▲───────────────┘
                                 │ API + OIDC     │ API + OIDC
                 ┌───────────────┴──────┐  ┌──────┴────────────────┐
                 │   OrangeCat the app   │  │      FleetCrown       │
                 │ (presence + economy)  │  │ (build/execution)     │
                 └───────────────────────┘  └───────────────────────┘
                   both render the SAME shared collaboration surfaces
```

## SSOT spine — one home per concern

Neither app forks these. FleetCrown **references**, never re-implements.

| Concern              | Single source of truth                                   | Both apps        |
| -------------------- | -------------------------------------------------------- | ---------------- |
| Identity             | `actors` (OIDC `sub` = `actor_id`)                       | reference        |
| Team / org           | `groups` + `group_members` + `group_wallets` (multi-sig) | reference        |
| Social graph         | `follows`, `stakeholder_relationships`                   | read             |
| Messaging            | `conversations`                                          | render inline    |
| Activity / changelog | `timeline_events` (the event bus)                        | write + read     |
| Economy              | `wallets`, `payment_intents`, `contributions`            | surface fund/pay |
| Collaboration needs  | `project_roles` (new)                                    | surface board    |

FleetCrown owns only its domain: agents, `orchestration_runs`, repos, the build
cockpit.

## "Building is collaborative" → the team _is_ an OrangeCat group

A build team is not a FleetCrown concept. It is an **OrangeCat group** with a shared
**multi-sig `group_wallet`**:

- Membership = `group_members` (SSOT identity).
- Treasury = `group_wallets` (`required_signatures`) — funded on OC, **spent by
  FleetCrown** on behalf of the group's actors via scoped OIDC tokens.
- Comms = `conversations`, rendered **inside** FleetCrown's project view.
- Roles / needs = `project_roles`, surfaced in both.

"Pay the collaborator", "fund the milestone", "who's on this build" all resolve to
OC group / actor / wallet state. One graph, rendered in both cockpits.

## Connective tissue: an event bus, not app-to-app calls

Generalize "FleetCrown emits, OrangeCat distributes" into the architecture: **both
apps write domain events to one stream (`timeline_events`) and read the slices they
care about.**

- FleetCrown writes `milestone.shipped` → OC renders it on the public wall **and**
  FleetCrown renders it in the cockpit.
- OC writes `backer.funded` → FleetCrown shows "budget increased".

Why event-driven, not direct calls: it **decouples availability and latency** (an
app renders last-known state when the other is down) and avoids a distributed
monolith. This is DRY at the data-flow layer.

## DRY in _code_: registry + shared components

Rendering the same concern in two UIs is where duplication creeps back. Kill it the
way we already kill it for entities (`entity-registry`):

1. **Shared UI package** `@oc/collab-ui`: `MessageThread`, `ActivityFeed`,
   `CollaboratorBoard`, `FundButton`, `PresenceBar`. Both apps import; neither
   reimplements. The visual layer is already shared (OC adopted FleetCrown's
   semantic token tier), so they render identically.
2. **Config-driven surface manifest** — the entity-registry pattern applied across
   products:

```ts
export const COLLAB_SURFACES = {
  messaging: {
    source: 'oc:conversations',
    scopes: ['messages.*'],
    component: MessageThread,
    mountIn: ['fc.project', 'oc.project', 'oc.profile'],
  },
  activity: {
    source: 'oc:timeline_events',
    scopes: ['timeline.read'],
    component: ActivityFeed,
    mountIn: ['fc.project', 'oc.project', 'oc.profile'],
  },
  roles: {
    source: 'oc:project_roles',
    scopes: ['roles.*'],
    component: CollaboratorBoard,
    mountIn: ['oc.project', 'oc.discover'],
  },
  fund: {
    source: 'oc:payment_intents',
    scopes: ['wallet.read'],
    component: FundButton,
    mountIn: ['fc.project', 'oc.project'],
  },
};
```

Adding a new collaborative surface = **one config entry, mounted in both apps** —
"maximize config-driven, minimize hardcoding", and it scales to a third client for
free.

## Keeping the UX good

In priority order:

1. **One account, two modes — never "two apps".** Single login (OIDC), one
   identity, shared design tokens. The user is in _Build_ mode or _Be/Trade_ mode,
   not on a different website.
2. **Embed at the right altitude; deep-link for depth.** Inline the lightweight
   widget (chat panel, fund button, 3-line feed) so the user never leaves;
   deep-link to the full surface for the rich experience. Progressive disclosure,
   across products.
3. **The Cat is the cross-product concierge.** One assistant spanning both worlds
   hides the seam entirely ("Milestone 2 shipped, 3 backers funded it, your
   collaborator is waiting on a reply"). This is the Cat-is-the-interface principle,
   and the single biggest UX unifier.
4. **Context always travels.** Cross-product links carry the project / conversation
   id so the user never loses their place.

## Honest costs (or it becomes worse than two apps)

- **Shared code across two repos** needs a versioned package (or, eventually, a
  monorepo). Real overhead — don't pretend it's free.
- **Authz must be SSOT too** — one permission model (OIDC scopes + RLS on
  actor/project/group), expressed once. Never "FleetCrown's idea of who can post"
  _and_ "OrangeCat's".
- **Availability coupling** — embedded OC surfaces must degrade gracefully when OC
  is slow/down (the event-bus read-model makes that possible).
- **YAGNI the heavy stuff** — don't build the shared UI package + full manifest
  before the pain is real.

## Sequencing

1. **OIDC provider** (the platform's front door) — identity SSOT. _Everything is
   gated on this._
2. **Read-only event surfacing** — FleetCrown changelog/status on OC walls + the
   cockpit. Cheap, high-signal; just deep-links + a status pill, no shared package
   yet.
3. **`project_roles` collaborator primitive** — the one genuinely missing thing;
   folds into the existing `/jobs` surface.
4. **Then, when the pain is real** — extract `@oc/collab-ui` + the surface manifest,
   and embed inline messaging/fund inside FleetCrown.

**Building the seam this way _is_ the merge-later de-risk.** A real platform makes
"merging" just co-hosting two clients of one backbone. Growing two of everything
makes merging a migration. So we get tight coupling + mutual empowerment + clean
SoC now, and a free option to merge later — without committing to it.

## North star

> OrangeCat is the collaboration-and-economy **platform**; the OrangeCat app and
> FleetCrown are two purpose-built **clients** of it; collaboration state is
> **single-sourced** and rendered everywhere it's needed via **shared,
> config-driven surfaces**; and the **Cat** makes the seam invisible.
