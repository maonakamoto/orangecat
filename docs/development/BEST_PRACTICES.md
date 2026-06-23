# Best Practices

This guide captures practical applications of our core engineering principles across development, deployment, and operations. See also: ../standards/engineering_principles.md

> **Note (2026-06):** Production is **self-hosted on Hetzner** ("bitbaum", behind Caddy). For deployment see `docs/operations/deployment/DEPLOYMENT_PROCESS.md`.

## Core Principles (Applied)

1. Start simple and add complexity only when needed
2. Focus on core functionality first
3. Use built-in tools before adding external services
4. Document decisions and their rationale
5. Privacy/local-first by default
6. SSOT/DRY/SoC across modules
7. Accessibility and testability are non-negotiable

## Initial Deployment Checklist

- [ ] Core routes tested
- [ ] Environment variables configured in `/opt/orangecat/app/.env` on the box
- [ ] Domain setup verified (Caddy reverse proxy)
- [ ] SSL certificates confirmed (Caddy auto-TLS)
- [ ] `/api/health` returns OK after deploy

## Monitoring on the Box

The self-hosted app runs behind Caddy on Hetzner. Observe it with:

1. **App logs** — the systemd/process logs for the running Next.js standalone server
2. **Caddy logs** — request/error logs at the reverse-proxy layer
3. **Health check** — `curl https://orangecat.ch/api/health`

## When to Add Additional Tools

Only add error tracking and advanced monitoring when:

1. You have actual users experiencing issues
2. The basic logs show problems
3. You need more detailed insights than process/Caddy logs provide

## Documentation

- Keep deployment documentation up to date
- Document any issues and their solutions
- Maintain a changelog
- Update environment variables documentation

## Security

1. Use environment variables for sensitive data; never commit secrets
2. Enable HTTPS and HSTS
3. Set appropriate security headers (CSP, COOP/COEP where needed)
4. Regular dependency updates and scans (SCA)
5. Encrypt user API keys at rest (AES-256-GCM); consider client-only encryption when feasible
6. No logging of sensitive content (chat text, PII)

### Environment Hygiene

- `.env.local` must not be committed. Use `.env.example` as SSOT for keys and add placeholders only.
- If an `.env.local` was tracked historically, scrub contents and remove from git history; rely on local, untracked copies going forward.

## Performance

1. Optimize images
2. Use proper caching
3. Minimize JavaScript bundles
4. Implement lazy loading
5. Prefer streaming responses for incremental UX (AI outputs)

## Maintenance

1. Regular dependency updates
2. Monitor for deprecated features
3. Keep documentation current
4. Regular security audits
5. Maintain ADRs for significant decisions

## AI/Voice Features (Applied Best Practices)

1. Private by default: do not persist private chat content server-side
2. Local-first: support local model runtimes; browser-to-localhost paths only
3. Key handling: encrypt keys at rest; avoid storing unless required; provide client-only mode where practical
4. Rate limiting: per-user where possible; never rely solely on IP in authenticated contexts
5. A11y: clear mic state, aria-labels, visible focus; keyboard and mobile-friendly
6. Testing: mock SpeechRecognition; integration tests for prefill flows; E2E happy paths
7. Feature flags: guard non-critical voices features for gradual rollout

## When to Scale

Add more sophisticated tools only when:

1. You have actual scaling needs
2. Basic tools are insufficient
3. You have the resources to maintain them
4. The benefits outweigh the costs
