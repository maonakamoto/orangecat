/**
 * Cat Tool Use — Platform Search Enrichment
 *
 * Before the main streaming response, checks if the user's message looks like
 * a discovery query and optionally calls the provider tool API to search the
 * platform. Enriches the messages array with tool call results so the final
 * response has real platform data to draw on.
 *
 * This file is the orchestrator (maybeEnrichWithSearchResults). The pieces live in
 * sibling modules and are re-exported here so the public surface is unchanged:
 *   - tool-use-types.ts      — message/event/proposal types
 *   - tool-use-detection.ts  — intent detection + tool definitions
 *   - tool-executor.ts       — executeToolCall (runs one tool)
 *
 * The optional `onToolCall` callback fires for each lifecycle event of every tool
 * the Cat triggers (running → completed/no_results/failed). The chat route pipes
 * these into the SSE stream so the user sees what the Cat is actually doing.
 */

import type { AnySupabaseClient } from '@/lib/supabase/types';
import {
  messageMightNeedTools,
  hasCreateIntent,
  PLATFORM_TOOL_DEFINITION,
} from './tool-use-detection';
import { executeToolCall } from './tool-executor';
import type {
  ToolAugmentedMessage,
  ToolCallAssistantMessage,
  OnToolCall,
  OnPrefillProposal,
} from './tool-use-types';

// Public surface — unchanged for consumers (chat-orchestrator imports from here).
export { messageMightNeedTools } from './tool-use-detection';
export type {
  ChatMessage,
  ToolAugmentedMessage,
  ToolCallResultRef,
  ToolCallEvent,
  OnToolCall,
  PrefillProposal,
  OnPrefillProposal,
} from './tool-use-types';

/** Max model⇄tool round-trips per user turn. Bounds cost + latency; most
 *  requests need 1, some 2 (search → refine, or search → prefill). */
const MAX_TOOL_STEPS = 3;

/**
 * Returns the messages array, possibly enriched with platform search results.
 * Non-fatal: on any failure returns the original messages unchanged.
 *
 * If `onToolCall` is provided, every tool the Cat invokes emits at least one
 * lifecycle event ('running' → one of completed/no_results/failed). The route
 * uses these to surface tool activity to the user via SSE.
 */
export async function maybeEnrichWithSearchResults(
  supabase: AnySupabaseClient,
  userId: string,
  messages: ToolAugmentedMessage[],
  userMessage: string,
  provider: string,
  groqKey: string | null,
  modelToUse: string,
  onToolCall?: OnToolCall,
  onPrefillProposal?: OnPrefillProposal
): Promise<ToolAugmentedMessage[]> {
  // Tool detection uses OpenAI-compatible function-calling. Enabled on the two
  // providers that actually serve OrangeCat: Groq (BYOK, paid TPM) and
  // OpenRouter (the platform path + many BYOK models — gpt-oss-120b returns
  // proper tool_calls). Without this, platform-tier discovery/matchmaking was
  // dead (Groq 429s, so the platform runs on OpenRouter). Other providers fall
  // back to no tools until they get an adapter.
  let toolEndpoint: string;
  let toolKey: string | undefined;
  if (provider === 'groq') {
    toolEndpoint = 'https://api.groq.com/openai/v1/chat/completions';
    toolKey = groqKey ?? process.env.GROQ_API_KEY;
  } else if (provider === 'openrouter') {
    toolEndpoint = 'https://openrouter.ai/api/v1/chat/completions';
    toolKey = process.env.OPENROUTER_API_KEY;
  } else {
    return messages;
  }

  if (!messageMightNeedTools(userMessage)) {
    return messages;
  }

  if (!toolKey) {
    return messages;
  }

  // Tool detection runs on a SLIM, routing-only prompt — NOT the full
  // conversational system prompt. The big "be a warm helpful agent" prompt
  // biases the model to chat (finish_reason=stop) instead of emitting a
  // tool_call, so platform search never fired. Here the only job is: decide
  // which tool (if any) the request needs and with what args.
  const detectionMessages = [
    {
      role: 'system' as const,
      content:
        'You gather what an OrangeCat chat request needs by calling platform tools. Call ONE tool at a time; after you see its result you may call another tool to refine or follow up, or stop when you have enough.\n' +
        '- prefill_entity_form: when the user describes something THEY want to create / sell / offer / launch / fundraise (e.g. "I make mugs and want to sell them", "I want to start a project"). This is about THEIR own new thing.\n' +
        '- search_platform: ONLY when the user wants to FIND, discover, or connect with things that already exist on the platform and belong to OTHERS (e.g. "find a designer", "who else is building X"). You may search again with a refined query if the first results are weak.\n' +
        '- suggest_offers: when the user asks what THEY could offer/sell/create, how they could make money or participate, or wants ideas grounded in who they are (e.g. "what can I offer?", "help me make money", "any ideas for me?"). It reads their stored profile/documents/memories — pass no message text, just an optional focus.\n' +
        'NEVER call search_platform for a create/sell/offer intent — describing your own thing to list is prefill_entity_form, not a search. If neither clearly applies, call no tool. Only decide and call tools — do not write a chat reply.',
    },
    { role: 'user' as const, content: userMessage },
  ];

  try {
    // Bounded agentic loop: the model can call a tool, see the result, and
    // decide its next move — up to MAX_TOOL_STEPS round-trips. `loopMessages`
    // carries the routing context + accumulated tool dialogue so each step is
    // informed by prior results; `enriched` is what the main chat call sees.
    const loopMessages: ToolAugmentedMessage[] = [...detectionMessages];
    const enriched: ToolAugmentedMessage[] = [...messages];

    for (let step = 0; step < MAX_TOOL_STEPS; step++) {
      const res = await fetch(toolEndpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${toolKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelToUse,
          messages: loopMessages,
          tools: PLATFORM_TOOL_DEFINITION,
          tool_choice: 'auto',
          stream: false,
          max_tokens: 500,
        }),
      });
      if (!res.ok) {
        break;
      }

      const data = await res.json();
      const choice = data.choices?.[0];
      // Model stopped calling tools → it has what it needs; the main chat call
      // produces the final answer from the gathered context.
      if (choice?.finish_reason !== 'tool_calls' || !choice.message?.tool_calls?.length) {
        break;
      }

      const assistantMsg = choice.message as ToolCallAssistantMessage;

      // Programmatic search guard: on a clear create intent, drop search_platform
      // calls (the weak model emits them despite the routing prompt) so no
      // tool_call is left unfulfilled in the thread.
      let toolCalls = assistantMsg.tool_calls;
      if (hasCreateIntent(userMessage)) {
        const kept = toolCalls.filter(tc => tc.function?.name !== 'search_platform');
        if (kept.length !== toolCalls.length) {
          toolCalls = kept;
        }
      }
      if (toolCalls.length === 0) {
        break;
      }

      const assistantToolMsg: ToolCallAssistantMessage = { ...assistantMsg, tool_calls: toolCalls };
      loopMessages.push(assistantToolMsg);
      enriched.push(assistantToolMsg);

      for (const toolCall of toolCalls) {
        const resultMessage = await executeToolCall(
          supabase,
          userId,
          toolCall,
          onToolCall,
          onPrefillProposal
        );
        loopMessages.push(resultMessage);
        enriched.push(resultMessage);
      }
      // Loop continues — the model now sees these results and may call another
      // tool (e.g. refine a search) or stop.
    }

    return enriched;
  } catch {
    return messages;
  }
}
