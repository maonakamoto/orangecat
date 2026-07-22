/**
 * Shared platform-LLM call for structured (JSON) Cat features. Mirrors the
 * provider selection the offer-engine established (Groq preferred for short/fast
 * work, OpenRouter free pool for long-form) and returns the raw model content
 * string, or null on any failure so callers degrade gracefully.
 *
 * Free-pool only — needs GROQ_API_KEY and/or OPENROUTER_API_KEY on the box
 * (already set; platform Cat runs on them). Never touches Cat Credits / NWC.
 */

import { logger } from '@/utils/logger';
import { DEFAULT_FREE_MODEL_ID } from '@/config/ai-models';

// Capable, JSON-reliable defaults. Groq is fast + cheap for short work; the
// OpenRouter free 120B handles long-form with a larger output budget than
// Groq's free tier (which caps output tokens for TPM reasons).
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const OPENROUTER_SHORT_MODEL = 'meta-llama/llama-4-maverick:free';
const OPENROUTER_LONGFORM_MODEL = DEFAULT_FREE_MODEL_ID; // 'openai/gpt-oss-120b:free'

export interface PlatformJsonOpts {
  temperature?: number;
  maxTokens?: number;
  /** Long-form (article bodies): prefer the OpenRouter 120B for larger output. */
  longform?: boolean;
}

interface Provider {
  url: string;
  model: string;
  apiKey: string;
  isOpenRouter: boolean;
}

function resolveProvider(longform: boolean): Provider | null {
  const groqKey = process.env.GROQ_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;

  // Long-form prefers OpenRouter's larger free model; short work prefers Groq's speed.
  if (longform && openRouterKey) {
    return openRouter(openRouterKey, OPENROUTER_LONGFORM_MODEL);
  }
  if (groqKey) {
    return {
      url: 'https://api.groq.com/openai/v1/chat/completions',
      model: GROQ_MODEL,
      apiKey: groqKey,
      isOpenRouter: false,
    };
  }
  if (openRouterKey) {
    return openRouter(openRouterKey, longform ? OPENROUTER_LONGFORM_MODEL : OPENROUTER_SHORT_MODEL);
  }
  return null;
}

function openRouter(apiKey: string, model: string): Provider {
  return {
    url: 'https://openrouter.ai/api/v1/chat/completions',
    model,
    apiKey,
    isOpenRouter: true,
  };
}

/**
 * Call the platform LLM with a system+user prompt and JSON response mode.
 * Returns the raw content string (expected to be JSON) or null.
 */
export async function callPlatformJson(
  system: string,
  user: string,
  opts: PlatformJsonOpts = {}
): Promise<string | null> {
  const provider = resolveProvider(!!opts.longform);
  if (!provider) {
    logger.warn('platform-llm: no platform AI key configured', {}, 'PlatformLLM');
    return null;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${provider.apiKey}`,
  };
  if (provider.isOpenRouter) {
    headers['HTTP-Referer'] = process.env.NEXT_PUBLIC_APP_URL || 'https://orangecat.ch';
  }

  try {
    const response = await fetch(provider.url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: provider.model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: opts.temperature ?? 0.6,
        max_tokens: opts.maxTokens ?? (opts.longform ? 4000 : 1400),
        response_format: { type: 'json_object' },
      }),
    });
    if (!response.ok) {
      logger.warn('platform-llm: model call failed', { status: response.status }, 'PlatformLLM');
      return null;
    }
    const json = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    return json.choices?.[0]?.message?.content ?? null;
  } catch (err) {
    logger.warn('platform-llm: model call threw', { err: String(err) }, 'PlatformLLM');
    return null;
  }
}

/**
 * Defensive JSON parse for model output: tolerates ```json fences and leading
 * prose by extracting the first balanced object/array. Returns null on failure.
 */
export function parseJsonLoose<T = unknown>(raw: string | null): T | null {
  if (!raw) {
    return null;
  }
  const cleaned = raw
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Fall back to the first {...} or [...] span.
    const match = cleaned.match(/[[{][\s\S]*[\]}]/);
    if (match) {
      try {
        return JSON.parse(match[0]) as T;
      } catch {
        /* fall through */
      }
    }
    return null;
  }
}
