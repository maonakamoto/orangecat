# OrangeCat Documentation

Documentation for the OrangeCat platform. Start with the area you need.

| Area                                 | What's inside                                                                                                           |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| [getting-started/](getting-started/) | First-time setup and orientation                                                                                        |
| [architecture/](architecture/)       | System design, entity model, the Cat, ADRs ([adr/](architecture/adr/)), DB schema ([database/](architecture/database/)) |
| [development/](development/)         | Day-to-day dev: standards, contributing, guides, examples, templates, components                                        |
| [operations/](operations/)           | Running prod: deployment, devops/runbooks, self-hosted Supabase                                                         |
| [design-system/](design-system/)     | Design tokens, UI/UX, navigation, branding                                                                              |
| [features/](features/)               | Feature-level docs (posting, messaging, etc.)                                                                           |
| [security/](security/)               | Security model and practices                                                                                            |
| [testing/](testing/)                 | Test strategy and coverage                                                                                              |
| [business/](business/)               | Executive, legal, marketing                                                                                             |
| [reference/](reference/)             | API, changelog, content, misc reference material                                                                        |
| [forward-looking/](forward-looking/) | Plans, proposals, in-flight ideas                                                                                       |
| [non-public/](non-public/)           | Internal-only material                                                                                                  |
| [archive/](archive/)                 | Frozen historical docs (incl. the retired managed-cloud era)                                                            |

## Ground truth (2026-06)

- **Database** — self-hosted Supabase at `supabase.orangecat.ch` on the Hetzner box (`bitbaum`). The managed Supabase Cloud was retired 2026-06. Schema = SQL files in [`../supabase/migrations/`](../supabase/migrations/) applied via `psql`. See [operations/supabase/](operations/supabase/).
- **Deployment** — self-hosted on Hetzner behind Caddy; GitHub Actions CI gates merges but does not deploy. See [operations/deployment/](operations/deployment/).
- **Bitcoin** — BTC is the canonical stored unit (`NUMERIC(18,8)`); satoshis are display-only.

## Conventions

- Point-in-time reports, audits, and completed runbooks live in [archive/](archive/) — keep active docs current, not historical.
- Engineering rules the AI agent follows live in [`../.claude/`](../.claude/), not here.
