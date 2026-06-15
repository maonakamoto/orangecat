# CI/CD Pipeline

Since the 2026-06-12 Hetzner migration, CI verifies but does not deploy.
Production deploys happen on the box — see `docs/deployment/DEPLOYMENT_PROCESS.md`.

Workflows (both trigger on push to `main`)

- `.github/workflows/ci.yml` — the gate:
  - Setup Node 20 + npm cache (`actions/checkout@v6`, `actions/setup-node@v6`)
  - Install dependencies (`npm ci`)
  - Docs hygiene (`npm run ci:docs` — no TODO/TBD/WIP in src)
  - Type-check (`npm run type-check`)
  - Lint (`npm run lint`)
  - Unit tests (`npm run test:unit`)
  - Build (`npm run build`)
  - P0 E2E matrix against the built app (skipped if E2E secrets absent)
- `.github/workflows/e2e-auth.yml` — Playwright login smoke against
  production (`https://www.orangecat.ch`); also runnable via workflow_dispatch.

Standards

- Node: `20.x` everywhere (workflow steps install Node 20; the runner actions
  themselves are on Node 24-ready majors since 2026-06-13)
- Do not commit `.env.local`; CI uses dummy env values for the build
- Protect `main`: require status checks, disallow direct pushes
