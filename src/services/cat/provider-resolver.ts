/**
 * Cat Provider Resolver
 *
 * Determines which AI provider (Groq / OpenRouter) and model to use,
 * resolves BYOK keys, enforces platform usage limits, and returns a
 * ready-to-use AI service pair with all metadata the route needs.
 */

import { createApiKeyService } from '@/services/ai/api-key-service';
import {
  createOpenRouterService,
  createOpenRouterServiceWithByok,
  createGroqService,
  createGroqServiceWithByok,
  createOpenAICompatibleServiceWithByok,
  isGroqAvailable,
  DEFAULT_GROQ_MODEL,
} from '@/services/ai';
import {
  isModelFree,
  getModelMetadata,
  getFreeModels,
  DEFAULT_FREE_MODEL_ID,
} from '@/config/ai-models';
import {
  OPENAI_COMPAT_PROVIDER_IDS,
  getProviderRuntime,
  isOpenAICompatibleProvider,
} from '@/config/ai-provider-runtime';
import { createAutoRouter } from '@/services/ai/auto-router';
import { buildPlatformProviders } from '@/services/ai/platform-providers';
import { OPENROUTER_KEY_HEADER } from '@/config/http-headers';
import { ROUTES } from '@/config/routes';
import type { AnySupabaseClient } from '@/lib/supabase/types';

const GROQ_KEY_HEADER = 'x-groq-api-key';

export type AIProvider = 'groq' | 'openrouter' | 'openai' | 'together' | 'deepseek' | 'xai';

/** Minimal interface both Groq and OpenRouter services satisfy */
interface AiService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  streamChatCompletion(opts: {
    model: string;
    messages: any[];
    temperature: number;
  }): AsyncIterable<{ content?: string; usage?: unknown; done?: boolean }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chatCompletion(opts: { model: string; messages: any[]; temperature: number }): Promise<{
    content: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    isFreeModel: boolean;
    usedByok: boolean;
    costBtc?: number;
  }>;
}

/**
 * Pre-resolved alternate provider to use if the primary one rate-limits.
 * The chat route walks `fallbacks[]` in order, giving each provider one
 * shot before surfacing the error. As long as one alternate is healthy,
 * Cat keeps chatting.
 */
export interface FallbackProvider {
  provider: AIProvider;
  modelToUse: string;
  aiService: AiService;
  reason: 'rate_limit';
}

interface ResolvedProvider {
  provider: AIProvider;
  hasByok: boolean;
  modelToUse: string;
  aiService: AiService;
  platformUsage: { daily_limit: number; requests_remaining: number } | null;
  keyService: ReturnType<typeof createApiKeyService>;
  userGroqKey: string | null;
  /**
   * Ordered chain of fallback providers to try on rate-limit. Built from
   * the platform chain (Groq + OpenRouter + Together + Ollama, whichever
   * are env-configured), with the primary provider removed. May be empty
   * — then a rate-limit just fails through to the honest error message.
   */
  fallbacks: FallbackProvider[];
}

/**
 * Resolves provider, keys, model, and platform limits for a Cat chat request.
 * Returns `ResolvedProvider` on success, or a `Response` to return directly on failure.
 */
export async function resolveProvider(
  supabase: AnySupabaseClient,
  userId: string,
  requestHeaders: Headers,
  opts: { requestedModel?: string; message: string }
): Promise<ResolvedProvider | Response> {
  const { requestedModel, message } = opts;
  const keyService = createApiKeyService(supabase);

  // Resolve BYOK keys (header takes priority over stored)
  const clientOpenRouterKey = requestHeaders.get(OPENROUTER_KEY_HEADER);
  const clientGroqKey = requestHeaders.get(GROQ_KEY_HEADER);
  const storedOpenRouterKey = clientOpenRouterKey
    ? null
    : await keyService.getDecryptedKey(userId, 'openrouter');
  const storedGroqKey = clientGroqKey ? null : await keyService.getDecryptedKey(userId, 'groq');

  const userOpenRouterKey = clientOpenRouterKey || storedOpenRouterKey;
  const userGroqKey = clientGroqKey || storedGroqKey;

  // Look up OpenAI-compatible BYOK keys (OpenAI / Together / DeepSeek / xAI).
  // We never send these via headers — only stored keys count. First match
  // wins, in the order PROVIDER_RUNTIME declares (openai > together > ...).
  let userOpenAICompatProvider: string | null = null;
  let userOpenAICompatKey: string | null = null;
  for (const providerId of OPENAI_COMPAT_PROVIDER_IDS) {
    const key = await keyService.getDecryptedKey(userId, providerId);
    if (key) {
      userOpenAICompatProvider = providerId;
      userOpenAICompatKey = key;
      break;
    }
  }

  // Provider priority:
  //   1. User Groq BYOK (fastest)
  //   2. User OpenRouter BYOK (broadest model coverage)
  //   3. Any user OpenAI-compatible BYOK (OpenAI/Together/DeepSeek/xAI)
  //   4. Platform Groq
  //   5. Platform OpenRouter
  let provider: AIProvider;
  let hasByok = false;

  if (userGroqKey) {
    provider = 'groq';
    hasByok = true;
  } else if (userOpenRouterKey) {
    provider = 'openrouter';
    hasByok = true;
  } else if (userOpenAICompatProvider && userOpenAICompatKey) {
    provider = userOpenAICompatProvider as AIProvider;
    hasByok = true;
  } else if (isGroqAvailable()) {
    provider = 'groq';
  } else if (process.env.OPENROUTER_API_KEY) {
    provider = 'openrouter';
  } else {
    return Response.json(
      {
        success: false,
        error: 'AI chat not configured',
        code: 'NO_API_KEY',
        message:
          'To use My Cat AI chat, you need to add your own API key in Settings → API Keys. Get a free Groq key at console.groq.com/keys',
        hasByok: false,
        helpUrl: ROUTES.SETTINGS_AI,
      },
      { status: 503 }
    );
  }

  // Platform usage check (non-BYOK only)
  let platformUsage: { daily_limit: number; requests_remaining: number } | null = null;
  if (!hasByok) {
    const usage = await keyService.checkPlatformUsage(userId);
    if (!usage.can_use_platform) {
      return Response.json(
        { success: false, error: 'Daily limit reached', retryAfter: 86400 },
        { status: 429 }
      );
    }
    platformUsage = {
      daily_limit: usage.daily_limit,
      requests_remaining: usage.requests_remaining,
    };
  }

  // Model selection
  let modelToUse: string;
  if (provider === 'groq') {
    // Groq: use requested model only if it's a known Groq model family
    modelToUse =
      requestedModel?.startsWith('llama') ||
      requestedModel?.startsWith('mixtral') ||
      requestedModel?.startsWith('gemma')
        ? requestedModel
        : DEFAULT_GROQ_MODEL;
  } else if (isOpenAICompatibleProvider(provider)) {
    // Direct OpenAI-compatible provider: trust the user's requested model
    // when it's anything other than 'auto' (we don't know that provider's
    // catalog, so we can't validate). Otherwise use the per-provider default.
    const runtime = getProviderRuntime(provider);
    modelToUse =
      requestedModel && requestedModel !== 'auto' && requestedModel !== 'any'
        ? requestedModel
        : (runtime?.defaultModel ?? DEFAULT_FREE_MODEL_ID);
  } else {
    // OpenRouter: route through auto-router for free/BYOK users
    modelToUse = requestedModel || DEFAULT_FREE_MODEL_ID;
    const auto = createAutoRouter();
    if (!hasByok) {
      if (modelToUse === 'auto' || modelToUse === 'any' || !isModelFree(modelToUse)) {
        const freeModelIds = getFreeModels().map(m => m.id);
        modelToUse = auto.selectModel({
          message,
          conversationHistory: [],
          allowedModels: freeModelIds,
        }).model;
      }
    } else if (modelToUse === 'auto' || modelToUse === 'any') {
      modelToUse = auto.selectModel({ message, conversationHistory: [] }).model;
    }
    if (!getModelMetadata(modelToUse)) {
      modelToUse = DEFAULT_FREE_MODEL_ID;
    }
  }

  // Instantiate the AI service
  let aiService: AiService;
  if (provider === 'groq') {
    aiService = hasByok ? createGroqServiceWithByok(userGroqKey as string) : createGroqService();
  } else if (provider === 'openrouter') {
    aiService = hasByok
      ? createOpenRouterServiceWithByok(userOpenRouterKey as string)
      : createOpenRouterService();
  } else {
    // OpenAI-compatible direct provider
    const runtime = getProviderRuntime(provider);
    if (!runtime || !userOpenAICompatKey) {
      // Should be unreachable — we wouldn't have set this provider without
      // both. Guard so the type narrows.
      return Response.json(
        { success: false, error: 'Provider not configured', code: 'NO_API_KEY' },
        { status: 503 }
      );
    }
    aiService = createOpenAICompatibleServiceWithByok({
      apiKey: userOpenAICompatKey,
      baseUrl: runtime.baseUrl,
      providerId: provider,
    });
  }

  // Build the fallback chain. The Cat walks it top-to-bottom, trying the next
  // entry on rate-limit/error.
  //
  //   1. The user's OTHER keys, in their chosen order (sort_order) — a user can
  //      add as many keys as they want; each becomes a fallback. Their own
  //      quota is used before the shared platform tier, and one key
  //      rate-limiting no longer takes the Cat down.
  //   2. The platform provider list (Groq → OpenRouter → …) as the base
  //      safety net, skipping whichever provider is already the primary.
  const primaryKeyValue = userGroqKey || userOpenRouterKey || userOpenAICompatKey;
  const userKeyFallbacks: FallbackProvider[] = [];
  for (const k of await keyService.listDecryptedKeysOrdered(userId)) {
    if (k.key === primaryKeyValue) {
      continue; // already the primary — don't try the same key twice
    }
    let svc: AiService;
    let model: string;
    if (k.provider === 'groq') {
      svc = createGroqServiceWithByok(k.key);
      model = DEFAULT_GROQ_MODEL;
    } else if (k.provider === 'openrouter') {
      svc = createOpenRouterServiceWithByok(k.key);
      model = DEFAULT_FREE_MODEL_ID;
    } else if (isOpenAICompatibleProvider(k.provider)) {
      const rt = getProviderRuntime(k.provider);
      if (!rt) {
        continue;
      }
      svc = createOpenAICompatibleServiceWithByok({
        apiKey: k.key,
        baseUrl: rt.baseUrl,
        providerId: k.provider,
      });
      model = rt.defaultModel ?? DEFAULT_FREE_MODEL_ID;
    } else {
      continue;
    }
    userKeyFallbacks.push({
      provider: k.provider as AIProvider,
      modelToUse: model,
      aiService: svc,
      reason: 'rate_limit' as const,
    });
  }

  const platformChain = buildPlatformProviders(message);
  const platformFallbacks: FallbackProvider[] = platformChain
    .filter(p => p.providerId !== provider)
    .map(p => ({
      provider: p.providerId as AIProvider,
      modelToUse: p.defaultModel,
      aiService: p.aiService,
      reason: 'rate_limit' as const,
    }));

  const fallbacks: FallbackProvider[] = [...userKeyFallbacks, ...platformFallbacks];

  return {
    provider,
    hasByok,
    modelToUse,
    aiService,
    platformUsage,
    keyService,
    userGroqKey,
    fallbacks,
  };
}
