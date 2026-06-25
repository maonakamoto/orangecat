/**
 * My Cat - Private Chat API
 *
 * POST /api/cat/chat - Ephemeral AI response with model selection
 * - Uses OpenRouter with BYOK if available; otherwise platform key
 * - For non-BYOK users, restricts to free models and checks daily platform usage
 * - Does not persist any conversation content
 */

import { NextRequest } from 'next/server';
import { logger } from '@/utils/logger';
import { apiBadRequest, apiError, apiSuccess, apiInternalError } from '@/lib/api/standardResponse';
import { withAuth, type AuthenticatedRequest } from '@/lib/api/withAuth';
import { z } from 'zod';
import {
  applyRateLimitHeaders,
  createRateLimitResponse,
  rateLimitWriteAsync,
} from '@/lib/rate-limit';
import { buildCatSystemPrompt } from '@/services/cat/system-prompt';
import { buildReplyLanguageDirective } from '@/services/cat/reply-language';
import { getCatFewShotExamplesText } from '@/services/cat/few-shot-examples';
import { parseActionsFromResponse } from '@/services/cat/response-parser';
import {
  getOrCreateDefaultConversation,
  getMessagesForContext,
  saveMessages,
} from '@/services/cat/conversation-history';
import { resolveProvider, type FallbackProvider } from '@/services/cat/provider-resolver';
import { recallMemories, extractAndStoreMemories } from '@/services/cat/memory';
import {
  maybeEnrichWithSearchResults,
  type ToolAugmentedMessage,
  type ToolCallEvent,
  type PrefillProposal,
} from '@/services/cat/tool-use';
import { fetchFullContextForCat, buildFullContextString } from '@/services/ai/document-context';
import { createActionExecutor } from '@/services/cat';
import { getUserActorId } from '@/domain/actors';
import type { ExecAction, CatAction, ExecActionResult } from '@/types/cat';
import { AI_MESSAGE_MAX_CHARS } from '@/lib/validation/ai';

/**
 * Execute all exec_action blocks parsed from an AI response.
 * Actions with requiresConfirmation=true create pending actions in the DB.
 * Actions without confirmation run immediately.
 * Results are returned alongside the chat response for the client.
 */
async function runExecActions(
  supabase: AuthenticatedRequest['supabase'],
  userId: string,
  actorId: string | null,
  actions: CatAction[]
): Promise<ExecActionResult[]> {
  const execActions = actions.filter((a): a is ExecAction => a.type === 'exec_action');
  if (execActions.length === 0) {
    return [];
  }
  if (!actorId) {
    return execActions.map(a => ({
      actionId: a.actionId,
      status: 'failed' as const,
      error: 'User has no actor record',
    }));
  }

  const executor = createActionExecutor(supabase);
  const results: ExecActionResult[] = [];

  for (const action of execActions) {
    try {
      const result = await executor.executeAction(userId, actorId, {
        actionId: action.actionId,
        parameters: action.parameters,
      });
      // Extract displayMessage from handler data (handlers attach it as data.displayMessage)
      const handlerData = result.data as Record<string, unknown> | undefined;
      const displayMessage =
        typeof handlerData?.displayMessage === 'string' ? handlerData.displayMessage : undefined;
      results.push({
        actionId: action.actionId,
        status:
          result.status === 'completed'
            ? 'completed'
            : result.status === 'pending_confirmation'
              ? 'pending_confirmation'
              : 'failed',
        data: result.data,
        displayMessage,
        error: result.error,
        pendingActionId: result.pendingActionId,
      });
    } catch (err) {
      results.push({
        actionId: action.actionId,
        status: 'failed',
        error: err instanceof Error ? err.message : 'Execution error',
      });
    }
  }

  return results;
}

const bodySchema = z.object({
  message: z.string().min(1).max(AI_MESSAGE_MAX_CHARS),
  model: z.string().optional(),
  stream: z.boolean().optional(),
  /**
   * Runtime session hints from the client. Optional and untrusted — the server
   * validates each field. Drive Cat's locale, price quoting, and recent-page
   * awareness. See RuntimeContext in document-context-types.ts.
   */
  preferredCurrency: z.string().max(8).optional(),
  locale: z.string().max(20).optional(),
  lastVisitedPath: z.string().max(200).optional(),
});

function isAiRateLimitError(error: unknown): boolean {
  // Provider-agnostic detection. Every AI provider error class we ship
  // (GroqAPIError, OpenRouterAPIError, OpenAICompatibleAPIError) carries
  // a `statusCode` field — 429 means rate limit, full stop. Some providers
  // also surface a `type: 'rate_limit'` discriminator. Check both first
  // because they're cheap and unambiguous.
  if (typeof error === 'object' && error !== null) {
    const e = error as { statusCode?: number; type?: string };
    if (e.statusCode === 429) {
      return true;
    }
    if (e.type === 'rate_limit') {
      return true;
    }
  }

  // Message-pattern fallback. Different providers phrase rate-limit
  // messages differently — Groq says "rate limit" or "tokens per minute,"
  // OpenRouter says "rate-limited upstream," Together says "too many
  // requests" or "rate limit exceeded." Match all common variants.
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (
      msg.includes('rate limit') ||
      msg.includes('rate-limit') ||
      msg.includes('ratelimit') ||
      msg.includes('tokens per minute') ||
      msg.includes('request too large') ||
      msg.includes('too many requests') ||
      msg.includes('429')
    ) {
      return true;
    }
  }
  return false;
}

export const POST = withAuth(async (request: AuthenticatedRequest) => {
  const { user, supabase } = request;
  try {
    // Rate limit (write-tier reused for chat to prevent abuse)
    const rl = await rateLimitWriteAsync(user.id);
    if (!rl.success) {
      return createRateLimitResponse(rl);
    }

    const body = await (request as NextRequest).json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return apiBadRequest('Invalid request', parsed.error.flatten());
    }

    const {
      message,
      model: requestedModel,
      stream,
      preferredCurrency,
      locale,
      lastVisitedPath,
    } = parsed.data;

    // Resolve provider, BYOK keys, model, and platform limits
    const resolved = await resolveProvider(supabase, user.id, request.headers, {
      requestedModel,
      message,
    });
    if (resolved instanceof Response) {
      return resolved;
    }
    const {
      provider,
      hasByok,
      modelToUse,
      aiService,
      platformUsage,
      keyService,
      userGroqKey,
      fallbacks,
    } = resolved;

    // Resolve actor ID for exec_action execution
    const actorId = await getUserActorId(supabase, user.id);

    // Build context + history. Runtime hints flow client→server so Cat knows
    // currency, locale, and recent-page state for THIS exchange.
    const userContext = await fetchFullContextForCat(supabase, user.id, {
      preferredCurrency,
      locale,
      lastVisitedPath,
    });
    // Recall durable facts Cat has learned about this user, ranked by relevance
    // to THIS message, and fold them into the context (rendered near the top so
    // the budget always keeps them). Best-effort: [] if memory is unavailable.
    userContext.memories = await recallMemories(supabase, user.id, message);
    const contextString = buildFullContextString(userContext);
    // Examples are appended as labeled text (not injected as fake conversation
    // turns) so weaker models can't mistake the example people for the real user.
    // The per-turn reply-language directive goes DEAD LAST: weak free models
    // weight the prompt tail most, and burying the language rule mid-prompt let
    // them default to the browser locale's language (English in → German out).
    const systemPrompt = `${buildCatSystemPrompt({ userContext: contextString || undefined })}\n\n${getCatFewShotExamplesText()}${buildReplyLanguageDirective(message)}`;

    let conversationId: string | null = null;
    let historyMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    try {
      conversationId = await getOrCreateDefaultConversation(supabase, user.id);
      historyMessages = await getMessagesForContext(supabase, user.id);
    } catch {
      /* Non-fatal — continue without history */
    }

    // Build message array: system (now includes example dialogues as text) +
    // real history + the user's message. No fake example turns in the array.
    const baseMessages: ToolAugmentedMessage[] = [
      { role: 'system', content: systemPrompt },
      ...historyMessages,
      { role: 'user', content: message },
    ];

    // ── Streaming ──────────────────────────────────────────────────────────────
    if (stream) {
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          // Lifted outside the try block so the catch at the bottom can
          // tell whether the failover attempt was reached. Block-scoped
          // `let` inside the try is invisible to the outer catch.
          let attemptedFallback = false;
          try {
            let usage:
              | { inputTokens?: number; outputTokens?: number; totalTokens?: number }
              | undefined;
            let fullContent = '';
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ model: modelToUse, provider })}\n\n`)
            );

            // Tool use happens INSIDE the stream so we can surface each
            // lifecycle event ('running' → completed/no_results/failed) to
            // the user in real time as `tool_call` SSE events. Prefill
            // proposals (the prefill_entity_form tool) emit a second event
            // type carrying the structured draft so the UI can render a
            // PrefilledFormCard instead of narrating field values as prose.
            const messages = await maybeEnrichWithSearchResults(
              supabase,
              baseMessages,
              message,
              provider,
              userGroqKey,
              modelToUse,
              (event: ToolCallEvent) => {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ tool_call: event })}\n\n`)
                );
              },
              (proposal: PrefillProposal) => {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ prefill_proposal: proposal })}\n\n`)
                );
              }
            );

            // Track the *active* provider/model/service so we can swap to
            // fallback (typically OpenRouter free) if primary rate-limits
            // before emitting any content. After any content has streamed
            // it's too late to swap cleanly without corrupting the response,
            // so we only failover when nothing has been sent to the user yet.
            let activeProvider = provider;
            let activeModel = modelToUse;
            let activeService = aiService;
            let streamStarted = false;

            const consumeStream = async () => {
              for await (const chunk of activeService.streamChatCompletion({
                model: activeModel,
                messages,
                temperature: 0.7,
              })) {
                if (chunk.usage) {
                  usage = chunk.usage;
                }
                if (chunk.content) {
                  streamStarted = true;
                  fullContent += chunk.content;
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ content: chunk.content })}\n\n`)
                  );
                }
                if (chunk.done) {
                  const { actions, quickReplies } = parseActionsFromResponse(fullContent);
                  const execResults = await runExecActions(supabase, user.id, actorId, actions);
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ done: true, usage, model: activeModel, provider: activeProvider, actions: actions.length > 0 ? actions : undefined, execResults: execResults.length > 0 ? execResults : undefined, quickReplies })}\n\n`
                    )
                  );
                  break;
                }
              }
            };

            // Walk the fallback chain on rate-limit. Each provider gets one
            // attempt. We can only swap providers BEFORE any content streams
            // — otherwise the client sees half a response and then a switch.
            let lastErr: unknown = null;
            try {
              await consumeStream();
            } catch (err) {
              lastErr = err;
            }
            let fallbackIndex = 0;
            while (
              lastErr &&
              isAiRateLimitError(lastErr) &&
              !streamStarted &&
              fallbackIndex < fallbacks.length
            ) {
              attemptedFallback = true;
              const next = fallbacks[fallbackIndex++];
              activeProvider = next.provider;
              activeModel = next.modelToUse;
              activeService = next.aiService;
              logger.info(
                'Cat chat: rate-limited, trying next fallback',
                { from: provider, to: activeProvider, model: activeModel, attempt: fallbackIndex },
                'cat/chat'
              );
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ fallback: { from: provider, to: activeProvider, model: activeModel, reason: 'rate_limit' } })}\n\n`
                )
              );
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ model: activeModel, provider: activeProvider })}\n\n`
                )
              );
              try {
                await consumeStream();
                lastErr = null;
              } catch (nextErr) {
                lastErr = nextErr;
              }
            }
            if (lastErr) {
              throw lastErr;
            }

            if (conversationId && fullContent) {
              saveMessages(supabase, conversationId, user.id, [
                { role: 'user', content: message },
                {
                  role: 'assistant',
                  content: fullContent,
                  model_used: activeModel,
                  provider: activeProvider,
                  token_count: usage?.totalTokens,
                },
              ]).catch((err: unknown) => {
                logger.error('Failed to persist streaming messages', { err }, 'cat/chat');
              });
              // Learn durable facts from this exchange for future turns. Fully
              // best-effort and detached — never blocks or fails the response.
              void extractAndStoreMemories(
                supabase,
                user.id,
                conversationId,
                message,
                fullContent,
                activeService,
                activeModel
              );
            }
            if (!hasByok && usage?.totalTokens) {
              await keyService.incrementPlatformUsage(user.id, 1, usage.totalTokens);
            }
          } catch (err) {
            logger.error('Cat chat stream error', { err, attemptedFallback, hasByok }, 'cat/chat');
            // Honest error copy. Never echo raw err.message — it can contain
            // API keys (e.g. a malformed Authorization header leaks the
            // credential in the Headers.append error). Log server-side;
            // return a structured, actionable error to the client.
            let errPayload: { error: string; code: string };
            if (isAiRateLimitError(err)) {
              errPayload = {
                error: hasByok
                  ? 'Your provider returned a rate-limit. Try again in a moment.'
                  : 'Cat is temporarily busy. Add your own Groq key in Settings to skip the cap.',
                code: 'AI_RATE_LIMITED',
              };
            } else if (attemptedFallback) {
              // Both primary AND failover threw. This is the "all providers
              // down" path — common when the platform OpenRouter key is
              // revoked or both quotas are exhausted at the same time.
              errPayload = {
                error: hasByok
                  ? 'Both providers are unreachable right now. Check your keys in Settings → API Keys.'
                  : 'Both Cat providers are temporarily down. Add your own free Groq key in Settings → API Keys to keep chatting.',
                code: 'ALL_PROVIDERS_DOWN',
              };
            } else {
              errPayload = {
                error:
                  'Cat couldn’t generate a response. Try again, or add your own key in Settings → API Keys.',
                code: 'STREAM_ERROR',
              };
            }
            controller.enqueue(encoder.encode(`event: error\n`));
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(errPayload)}\n\n`));
          } finally {
            controller.close();
          }
        },
      });
      return applyRateLimitHeaders(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        new Response(readable, {
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no',
          },
        }) as any,
        rl
      );
    }

    // ── Non-streaming ──────────────────────────────────────────────────────────
    // Buffer tool calls + prefill proposals so the JSON response can carry
    // them alongside the answer.
    const collectedToolCalls: ToolCallEvent[] = [];
    const collectedPrefillProposals: PrefillProposal[] = [];
    const messages = await maybeEnrichWithSearchResults(
      supabase,
      baseMessages,
      message,
      provider,
      userGroqKey,
      modelToUse,
      (event: ToolCallEvent) => {
        collectedToolCalls.push(event);
      },
      (proposal: PrefillProposal) => {
        collectedPrefillProposals.push(proposal);
      }
    );
    // Try primary; on rate-limit, walk the fallback chain. Non-streaming
    // is even safer than streaming because each attempt is atomic — no
    // partial-content corruption risk to worry about.
    let activeProvider = provider;
    let result;
    let fellBackTo: FallbackProvider | null = null;
    let lastErr: unknown = null;
    try {
      result = await aiService.chatCompletion({
        model: modelToUse,
        messages,
        temperature: 0.7,
      });
    } catch (err) {
      lastErr = err;
    }
    let fallbackIndex = 0;
    while (!result && lastErr && isAiRateLimitError(lastErr) && fallbackIndex < fallbacks.length) {
      const next = fallbacks[fallbackIndex++];
      logger.info(
        'Cat chat (non-streaming): rate-limited, trying next fallback',
        { from: provider, to: next.provider, model: next.modelToUse, attempt: fallbackIndex },
        'cat/chat'
      );
      try {
        result = await next.aiService.chatCompletion({
          model: next.modelToUse,
          messages,
          temperature: 0.7,
        });
        fellBackTo = next;
        activeProvider = next.provider;
        lastErr = null;
      } catch (nextErr) {
        lastErr = nextErr;
      }
    }
    if (!result) {
      throw lastErr ?? new Error('Cat chat: no AI provider produced a response');
    }

    if (!hasByok) {
      await keyService.incrementPlatformUsage(user.id, 1, result.totalTokens);
    }

    const {
      message: cleanedMessage,
      actions,
      quickReplies,
    } = parseActionsFromResponse(result.content);
    const execResults = await runExecActions(supabase, user.id, actorId, actions);

    if (conversationId) {
      saveMessages(supabase, conversationId, user.id, [
        { role: 'user', content: message },
        {
          role: 'assistant',
          content: cleanedMessage,
          model_used: result.model,
          provider: activeProvider,
          token_count: result.totalTokens,
        },
      ]).catch((err: unknown) => {
        logger.error('Failed to persist messages', { err }, 'cat/chat');
      });
      // Learn durable facts from this exchange (best-effort, detached).
      void extractAndStoreMemories(
        supabase,
        user.id,
        conversationId,
        message,
        cleanedMessage,
        fellBackTo?.aiService ?? aiService,
        fellBackTo?.modelToUse ?? modelToUse
      );
    }

    return applyRateLimitHeaders(
      apiSuccess({
        message: cleanedMessage,
        actions: actions.length > 0 ? actions : undefined,
        quickReplies,
        execResults: execResults.length > 0 ? execResults : undefined,
        toolCalls: collectedToolCalls.length > 0 ? collectedToolCalls : undefined,
        prefillProposals:
          collectedPrefillProposals.length > 0 ? collectedPrefillProposals : undefined,
        modelUsed: result.model,
        provider: activeProvider,
        fallback: fellBackTo
          ? {
              from: provider,
              to: fellBackTo.provider,
              model: fellBackTo.modelToUse,
              reason: 'rate_limit',
            }
          : undefined,
        usage: {
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          totalTokens: result.totalTokens,
          apiCostBtc: result.costBtc || 0,
          isFreeModel: result.isFreeModel,
          usedByok: result.usedByok,
        },
        userStatus: {
          hasByok,
          freeMessagesPerDay: platformUsage?.daily_limit ?? 0,
          freeMessagesRemaining: platformUsage?.requests_remaining ?? 0,
        },
      }),
      rl
    );
  } catch (error) {
    if (isAiRateLimitError(error)) {
      logger.warn(
        'Cat chat rate-limited after fallback (both providers exhausted)',
        { errMsg: error instanceof Error ? error.message : 'unknown' },
        'cat/chat'
      );
      // Include the substring "API key" so ErrorDisplay shows the
      // "Configure API Key" CTA — the actionable path out of this state
      // is to add your own free Groq key, not to wait silently.
      return apiError(
        'The shared free AI quota for Cat is exhausted right now. To keep using Cat without waiting, add your own free Groq API key in Settings → AI (takes ~60s — get one at console.groq.com/keys).',
        'AI_RATE_LIMITED',
        429
      );
    }
    logger.error('Cat chat unhandled error', error, 'CatChatAPI');
    return apiInternalError('An unexpected error occurred. Please try again.');
  }
});
