# OrangeCat — Deep-Research Findings + Handoff (2026-07-08)

**Why this doc exists:** a research pass over OrangeCat's open external-technology decisions was started but hit the **session usage limit** (resets ~15:50 Europe/Zurich). This captures what's done, what's directional, and a precise handoff so a fresh agent can finish it. Author: prior agent session.

**Status legend:**

- `[VERIFIED]` — web-researched + adversarially verified by the deep-research harness (cited).
- `[SOURCED]` — gathered from primary sources, but adversarial verification was cut off by the limit; trust as "well-sourced, not independently cross-checked."
- `[ANALYSIS]` — my own reasoning from the code review; **not web-verified**. Directional only.

---

## How we got here

A 4-agent code review surfaced **31 open decisions** across payments / infra / AI / security (grounded in file paths). Those were consolidated into **10 research questions**. Deep-research runs are **very heavy** (~9M tokens, ~75 min each) and MUST run **one at a time** — firing 5 in parallel tripped a global rate limit and returned empty shells. Completed: Q1 (verified) + Q2 (sourced, verification cut off). The session limit then stopped the rest.

---

## COMPLETED RESEARCH

### Q1 — 2026-H2 LLM roster + pricing `[VERIFIED]`

Our `src/config/ai-models.ts` `AI_MODEL_REGISTRY` is **stale** (lists claude-opus-4, gpt-4o, gemini-2.0-pro, grok-2). Current Pareto frontier (verified vs live Groq/OpenRouter):

- **Frontier:** Claude **Opus 4.8** ($5/$25, 1M ctx). **Fable 5** ($10/$50) now sits above it.
- **Capable / agentic tool-use:** Claude **Sonnet 5** ($2/$10 intro → $3/$15 after 2026-08-31, 1M ctx); **Groq GPT-OSS 120B** ($0.15/$0.60, native tools) — best cheap-agentic.
- **Cheap chat:** Groq **Llama 3.1 8B** ($0.05/$0.08); **DeepSeek V4 Flash** ($0.09/$0.18, 1M ctx, MIT); Gemini Flash-Lite (~$0.10/$0.40).
- **Free pool:** Groq Free Plan (gpt-oss-120b/20b, llama-3.3-70b, llama-3.1-8b, llama-4-scout, qwen3-32b, compound); OpenRouter free collection / `openrouter/free` meta-router.
- **Key fact for metering:** OpenRouter passes provider pricing through with **no markup**.
- Full cited report: `tasks/wy8phyeom.output` (this session's scratch).
- **Action:** rewrite `AI_MODEL_REGISTRY` to the above; re-map the 3 capability tiers + free pool.

### Q2 — Which NWC wallet to provision for `PLATFORM_NWC_URI` `[SOURCED]` (verification cut off)

Primary sources: getAlby/hub, albyhub.com, LNbits nwcprovider (riccardobl), getAlby/awesome-nwc, Alby guides.

- **Recommendation: Alby Hub.** Self-custodial (the _platform_ holds keys — good, it's OC's own revenue wallet), supports the required `make_invoice` + `lookup_invoice` **plus payment-notification events** (`nwc_payment_received/sent`) — which means we can move settlement detection off polling (see payments finding #2). **LSPS2 just-in-time channels** solve inbound liquidity (fee deducted from the incoming payment). No KYC. Open-source, self-hostable; Alby also offers a hosted option + a capabilities-discovery endpoint (`api.getalby.com/nwc/nip47/info`).
- **Alternatives:** **LNbits + NWCProvider extension** if already running LNbits (supports make/lookup_invoice, per-connection permissions + budgets → can mint a _receive-only, non-spending_ credential; depends on a Nostr relay + LNbits uptime you maintain). **Coinos** = zero-ops but **custodial** (provider holds funds — conflicts with the "never hold funds" ethos).
- **⚠️ Re-verify** the NIP-47 method support + notification events (the value claim; verification didn't complete). Then wire the chosen URI into `src/lib/bitcoin/platform-wallet.ts`.

---

## DIRECTIONAL SYNTHESES (`[ANALYSIS]`, not web-verified — confirm before acting)

### Warm-standby / HA for self-hosted Supabase (infra#2,7)

IaC the box first (cloud-init/Ansible) — biggest RTO win per €. Then a cold nightly-restore standby. Streaming-replication HA only if an RTO target demands it; failover must handle GoTrue signing keys + Kong + Realtime (Storage already on R2 = stateless, good). **>1 instance forces self-hosted Valkey/Redis** (in-memory rate-limit fallback is single-instance-only) — bundle Valkey before any standby work.

### LLM gateways + embeddings (AI#2,4,5,8)

Highest-value: **fix Cat-Credits metering** — bill off OpenRouter's real per-request cost (it returns generation cost; no markup) instead of the stale hardcoded table in `ai-models.ts`/`credit-metering.ts` (today, models absent from the table bill **$0** = revenue leak). Evaluate a self-hosted **LiteLLM proxy** to replace hand-rolled `provider-resolver.ts` + `auto-router.ts` (routing + failover + budgets + cost-tracking in one, sovereign). Embeddings: only move off OpenAI if sovereignty is hard-required; pick a **1536-dim** open model to avoid a `vector(1536)` reindex of `cat_memories`.

### Sovereign ops (infra#3,4,5,6)

B2 Object-Lock: restic `prune` conflicts with append-only → canonical pattern is **no-delete key on the box + delete-capable key on a separate host running `forget --prune`** (web-verify the exact restic+object-lock interaction). Secrets: **SOPS + age** encrypted `.env` in the config backup, age key in ≥2 offline copies (no daemon = no DR chicken-and-egg). Cloudflare: values call — buys origin-hiding + edge DDoS/WAF + lets you drop the HTTP/3 kill-guard, costs TLS-termination sovereignty; sovereign middle path = Caddy rate-limit + self-hosted WAF (Coraza/Anubis) or bunny.net. Defer CF until bot/DDoS pressure is real.

### Nostr E2E messaging + OIDC hardening (sec#4,5)

E2E DMs: modern path is **NIP-44 v2 + NIP-17 gift-wrap** (not legacy NIP-04); hard part is per-user Nostr key management vs Supabase-auth identity + migrating existing plaintext threads — a real project, scope deliberately. **OIDC hardening to do regardless of research:** JWKS **key rotation with overlap** (single key today = can't rotate without breaking live tokens), a **consent-revocation** endpoint, **refresh-token reuse detection**, and fix the `[INSERT SECURITY EMAIL]` placeholder in `docs/security/SECURITY.md`.

---

## REMAINING DEEP-RESEARCH QUEUE (for the next agent)

Run **ONE AT A TIME** (see operational lessons). Framed questions:

1. **Self-hosted error tracking** — GlitchTip vs Sentry-self-hosted vs Bugsink vs Loki log-shipping on a capacity-constrained shared Hetzner box (footprint/retention/setup); is a Sentry-SDK-compatible receiver the right coupling for the existing `setErrorSink()` hook in `src/utils/logger.ts`?
2. **Compliance** — under Swiss FINMA/DLT-Act, EU MiCA, FATF Travel Rule: does non-withdrawable single-purpose prepaid Bitcoin service credit stay outside VASP/e-money licensing, and what non-custodial/progressive-KYC patterns keep pseudonymous P2P `loan`/`investment` entities lawful? (payments#4 + sec#3)
3. **Agentic prompt-injection defense + agent eval harness (2026)** — for a tool-using agent that reads untrusted web/user content and drafts economic entities (AI#3,6).
4. **Supabase authz + Next.js 15 security** — RLS-as-enforced-defense vs compile-enforced app-layer scoping when the server uses the service-role key; Next.js App Router auth post-CVE-2025-29927; strict enforcing CSP (nonce vs hash) for a UGC site (sec#1,2,6).
5. **Re-run Q2 (NWC)** to complete adversarial verification, OR the settlement-reliability question (NIP-47 notifications vs polling, NIP-04→NIP-44, LUD-21 verify coverage — payments#2,3,8).

(Lower priority, already covered by directional syntheses above: warm-standby, LLM-gateways, sovereign-ops, Nostr/OIDC — deep-research them only if a decision needs citations.)

---

## ⚠️ OPERATIONAL LESSONS FOR THE NEXT AGENT

1. **Run deep-research workflows strictly ONE AT A TIME.** Each fans out ~100 agents / ~9M tokens. 5 in parallel = global rate-limit → empty results.
2. **Resume, don't restart:** a run that failed on rate/session limits can be resumed — `Workflow({scriptPath: "<the deep-research-wf_*.js path from the launch output>", resumeFromRunId: "wf_..."})` — completed agents return cached, only failed searches/fetches re-run. Script paths + run IDs are in this session's launch outputs.
3. **Watch the session usage limit**, not just per-minute rate limits — it's a hard daily wall (this pass hit it mid-Q2).
4. Invoke via the skill: `Workflow({ name: "deep-research", args: "<question>" })`.

---

## IMMEDIATELY ACTIONABLE — no research needed

- ✅ **DONE 2026-07-08** — **Update `AI_MODEL_REGISTRY`** to the Q1-verified 2026 roster; consolidated the two registries so `model-registry.ts` is now a generated projection of `ai-models.ts` (one SSOT).
- ✅ **DONE 2026-07-08** — **Fix Cat-Credits metering** to bill off OpenRouter's real per-request `usage.cost` (registry estimate is the fallback); the "$0 for unknown model" leak is guarded and pinned by tests (`__tests__/unit/cat/credit-metering.test.ts`, `__tests__/unit/services/ai/openrouter.test.ts`).
- **OIDC:** JWKS rotation-with-overlap; real security contact in `SECURITY.md`. _(still open)_
- **GlitchTip hook** is already in place (`setErrorSink`) — only needs a provider + DSN (pending Q-error-tracking). _(still open)_

---

_Full code-review reports (31 findings, file-cited) are in this session's agent transcripts; the four subsystem reviews (payments/infra/AI/security) each returned a ranked list. Re-run them if this doc lacks a needed detail._
