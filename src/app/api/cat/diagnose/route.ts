/**
 * Cat Diagnose
 *
 * Authenticated endpoint that hits each configured AI provider with a
 * minimal probe ("ping") and returns the raw upstream status + sanitized
 * error message. Built specifically so users (and us) can answer the
 * question "why isn't Cat answering?" without having to read Vercel
 * function logs.
 *
 * The error class returned is one of:
 *   - 'ok'            — provider answered 2xx
 *   - 'rate_limit'    — provider returned 429
 *   - 'auth'          — provider returned 401/403
 *   - 'no_key'        — env var not set
 *   - 'invalid_key'   — header malformed (control chars, etc.)
 *   - 'upstream_err'  — provider returned something else
 *   - 'no_response'   — fetch threw before getting a response
 *
 * No keys, no auth headers, no Bearer strings are ever echoed back —
 * the result is always safe to surface to the authenticated user.
 *
 * GET /api/cat/diagnose
 */

import { withAuth, type AuthenticatedRequest } from '@/lib/api/withAuth';
import { apiSuccess } from '@/lib/api/standardResponse';

type ProbeClass =
  | 'ok'
  | 'rate_limit'
  | 'auth'
  | 'no_key'
  | 'invalid_key'
  | 'upstream_err'
  | 'no_response';

interface ProbeResult {
  provider: 'groq' | 'openrouter';
  configured: boolean;
  status: number | null;
  class: ProbeClass;
  /** Short text from the upstream error, safe to display. */
  message: string | null;
  /** Header-safe: did the key contain whitespace or control chars (paste artifact)? */
  keyHadJunkChars: boolean;
}

function sanitizeApiKey(key: string): { clean: string; hadJunk: boolean } {
  const clean = key.replace(/[\s\x00-\x1f\x7f]+/g, '');
  return { clean, hadJunk: clean !== key };
}

async function probeGroq(): Promise<ProbeResult> {
  const raw = process.env.GROQ_API_KEY;
  if (!raw) {
    return {
      provider: 'groq',
      configured: false,
      status: null,
      class: 'no_key',
      message: 'GROQ_API_KEY env var not set',
      keyHadJunkChars: false,
    };
  }
  const { clean, hadJunk } = sanitizeApiKey(raw);
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${clean}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 5,
        temperature: 0,
      }),
    });
    if (res.ok) {
      return {
        provider: 'groq',
        configured: true,
        status: res.status,
        class: 'ok',
        message: null,
        keyHadJunkChars: hadJunk,
      };
    }
    const body = (await res.json().catch(() => ({}))) as {
      error?: { message?: string; type?: string };
    };
    const upstreamMessage = body?.error?.message ?? `HTTP ${res.status}`;
    let cls: ProbeClass = 'upstream_err';
    if (res.status === 429) {
      cls = 'rate_limit';
    } else if (res.status === 401 || res.status === 403) {
      cls = 'auth';
    }
    return {
      provider: 'groq',
      configured: true,
      status: res.status,
      class: cls,
      message: upstreamMessage,
      keyHadJunkChars: hadJunk,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'fetch failed';
    // Treat header-construction errors as invalid_key — these are the
    // paste-artifact bugs (newline / weird trailing char in the env var).
    const cls: ProbeClass = errMsg.includes('Headers.append') ? 'invalid_key' : 'no_response';
    return {
      provider: 'groq',
      configured: true,
      status: null,
      class: cls,
      message: cls === 'invalid_key' ? 'Authorization header is malformed' : errMsg,
      keyHadJunkChars: hadJunk,
    };
  }
}

async function probeOpenRouter(): Promise<ProbeResult> {
  const raw = process.env.OPENROUTER_API_KEY;
  if (!raw) {
    return {
      provider: 'openrouter',
      configured: false,
      status: null,
      class: 'no_key',
      message: 'OPENROUTER_API_KEY env var not set',
      keyHadJunkChars: false,
    };
  }
  const { clean, hadJunk } = sanitizeApiKey(raw);
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${clean}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.3-70b-instruct:free',
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 5,
        temperature: 0,
      }),
    });
    if (res.ok) {
      return {
        provider: 'openrouter',
        configured: true,
        status: res.status,
        class: 'ok',
        message: null,
        keyHadJunkChars: hadJunk,
      };
    }
    const body = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    const upstreamMessage = body?.error?.message ?? `HTTP ${res.status}`;
    let cls: ProbeClass = 'upstream_err';
    if (res.status === 429) {
      cls = 'rate_limit';
    } else if (res.status === 401 || res.status === 403) {
      cls = 'auth';
    }
    return {
      provider: 'openrouter',
      configured: true,
      status: res.status,
      class: cls,
      message: upstreamMessage,
      keyHadJunkChars: hadJunk,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'fetch failed';
    const cls: ProbeClass = errMsg.includes('Headers.append') ? 'invalid_key' : 'no_response';
    return {
      provider: 'openrouter',
      configured: true,
      status: null,
      class: cls,
      message: cls === 'invalid_key' ? 'Authorization header is malformed' : errMsg,
      keyHadJunkChars: hadJunk,
    };
  }
}

export const GET = withAuth(async (_request: AuthenticatedRequest) => {
  const [groq, openrouter] = await Promise.all([probeGroq(), probeOpenRouter()]);
  return apiSuccess({
    probes: { groq, openrouter },
    catCanAnswer: groq.class === 'ok' || openrouter.class === 'ok',
    summary:
      groq.class === 'ok'
        ? `Cat is healthy: ${groq.provider} probe returned OK.`
        : openrouter.class === 'ok'
          ? `Primary (${groq.provider}) is degraded (${groq.class}); fallback (${openrouter.provider}) is healthy.`
          : `Both providers are degraded: groq=${groq.class}, openrouter=${openrouter.class}.`,
  });
});
