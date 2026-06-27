/**
 * Cat Tool Use — Platform Search Enrichment
 *
 * Before the main streaming response, checks if the user's message looks like
 * a discovery query and optionally calls the Groq tool API to search the platform.
 * Enriches the messages array with tool call results so the final response
 * has real platform data to draw on.
 *
 * Only active for the Groq provider (OpenRouter tool use is not yet supported).
 *
 * The optional `onToolCall` callback fires for each lifecycle event of every tool
 * the Cat triggers (running → completed/no_results/failed). The chat route pipes
 * these into the SSE stream so the user sees what the Cat is actually doing.
 */

import type { AnySupabaseClient } from '@/lib/supabase/types';
import type { OpenRouterMessage } from '@/services/ai/openrouter';
import { searchPlatform, type SearchType } from './platform-search';
import { generateFormPrefill } from '@/lib/ai/form-prefill-service';
import { getEntityConfig } from '@/config/entity-configs/get-config';
import { isValidEntityType, type EntityType } from '@/config/entity-registry';
import { CAT_CREATABLE_ENTITY_TYPES } from '@/types/cat';

/** Standard chat message (system/user/assistant) */
export type { OpenRouterMessage as ChatMessage };

/** Messages that Groq can return/accept when tool-use is active */
interface ToolCallAssistantMessage {
  role: 'assistant';
  content: string | null;
  tool_calls: Array<{ id: string; type: string; function: { name: string; arguments: string } }>;
}

interface ToolResultMessage {
  role: 'tool';
  tool_call_id: string;
  content: string;
}

/** Full union of message types that may appear in a Groq tool-augmented conversation */
export type ToolAugmentedMessage = OpenRouterMessage | ToolCallAssistantMessage | ToolResultMessage;

/**
 * A reference to one entity surfaced by a tool call. Carries enough for the UI
 * to render a clickable link (url + type) without re-fetching.
 */
export interface ToolCallResultRef {
  url: string;
  type: string;
  title: string;
}

/**
 * Lifecycle event for a single tool invocation. Emitted by maybeEnrichWithSearchResults
 * via the onToolCall callback. The chat route relays these to the client over SSE.
 */
export type ToolCallEvent =
  | {
      id: string;
      name: string;
      status: 'running';
      args?: Record<string, unknown>;
    }
  | {
      id: string;
      name: string;
      status: 'completed';
      resultCount: number;
      results: ToolCallResultRef[];
    }
  | {
      id: string;
      name: string;
      status: 'no_results';
    }
  | {
      id: string;
      name: string;
      status: 'failed';
      error?: string;
    };

export type OnToolCall = (event: ToolCallEvent) => void;

/**
 * Structured draft of an entity form, produced when the Cat calls
 * prefill_entity_form. Surfaces in the UI as a PrefilledFormCard with [Open
 * in form] / [Create] affordances instead of being narrated as prose.
 */
export interface PrefillProposal {
  entityType: EntityType;
  /** Free-text description the user gave, echoed back so the user can see what was drafted from. */
  sourceDescription: string;
  /** Field values keyed by the entity config's field names. */
  data: Record<string, unknown>;
  /** Per-field confidence 0–1 from the prefill service. */
  confidence: Record<string, number>;
}

export type OnPrefillProposal = (proposal: PrefillProposal) => void;

/**
 * Cheap pre-filter to decide whether the user message MIGHT need a tool call.
 * If none of these keywords appear, we skip the extra Groq tool-pass entirely
 * to keep the cost / latency floor low. Both discovery-style and creation-style
 * intents are covered.
 */
const TOOL_TRIGGER_KEYWORDS = [
  // discovery / search_platform
  'find',
  'look',
  'search',
  'who ',
  'anyone',
  'connect',
  'similar',
  'recommend',
  'discover',
  'help me find',
  'know of',
  'looking for',
  'does anyone',
  // creation / prefill_entity_form
  'want to sell',
  'want to offer',
  'want to start',
  'want to create',
  'want to launch',
  "i'd like to sell",
  "i'd like to offer",
  "i'd like to create",
  "i'd like to start",
  'create a',
  'launch a',
  'set up a',
  'set up an',
  'open a',
  'open an',
  'i sell',
  'i make',
  'i provide',
  'i offer',
  'i run',
  'i teach',
  'i organize',
  'i need to raise',
  'fundraise',
];

/**
 * Whether a message looks like a discovery / creation / multi-step task — the
 * kind that benefits from an agentic (frontier) model and triggers the tool
 * pass. Exported so the chat route can decide whether to nudge a user on a
 * weaker model toward upgrading, using the SAME signal that gates tool use
 * (one source of truth for "this wants more than chat").
 */
export function messageMightNeedTools(message: string): boolean {
  const lower = message.toLowerCase();
  return TOOL_TRIGGER_KEYWORDS.some(kw => lower.includes(kw));
}

/**
 * Strong "I want to create/list my own thing" signals. When present we
 * PROGRAMMATICALLY suppress search_platform tool calls — the weak free-tier
 * models ignore the routing prompt and search anyway, wasting a round-trip and
 * surfacing irrelevant "results" on a pure create intent. prefill_entity_form
 * is still allowed through.
 */
const CREATE_INTENT_PATTERNS = [
  /\b(i|we)\s+(make|sell|offer|provide|run|teach|organi[sz]e|build|create|craft|bake|design)\b/i,
  /\bwant(ed)?\s+to\s+(sell|offer|start|create|launch|list|build|make|raise|fundraise)\b/i,
  /\b(i'?d|i\s+would)\s+like\s+to\s+(sell|offer|create|start|launch|list)\b/i,
  /\b(create|launch|set\s+up|open|list|start)\s+(a|an|my)\b/i,
  /\bi\s+need\s+to\s+raise\b/i,
];

function hasCreateIntent(message: string): boolean {
  return CREATE_INTENT_PATTERNS.some(re => re.test(message));
}

/** Entity types Cat can DRAFT via the prefill tool. Derived from the creatable SSOT so the
 *  two lists can't drift. `group` is creatable but not prefillable — it uses a `name`, not the
 *  form-field prefill flow. Add an entry here only by removing it from this exclusion set. */
const NON_PREFILLABLE_ENTITY_TYPES = new Set<string>(['group']);
const PREFILLABLE_ENTITY_TYPES = CAT_CREATABLE_ENTITY_TYPES.filter(
  t => !NON_PREFILLABLE_ENTITY_TYPES.has(t)
);

const PLATFORM_TOOL_DEFINITION = [
  {
    type: 'function',
    function: {
      name: 'search_platform',
      description:
        'Search OrangeCat for people, projects, products, services, events, or causes. Use when the user wants to find, connect with, or discover someone or something on the platform.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'What to search for' },
          type: {
            type: 'string',
            enum: ['all', 'people', 'projects', 'products', 'services', 'events', 'causes'],
            description: 'Type of content to search. Use "all" when unsure.',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'prefill_entity_form',
      description:
        'Draft an entity (product, service, project, etc.) from a natural-language description. Use this INSTEAD of a create_* exec_action when the user has described what they want to create with enough detail (title-ish hint + at least one specific attribute like price, location, category, audience). Returns structured fields the user can review in a form before publishing — never auto-creates.',
      parameters: {
        type: 'object',
        properties: {
          entityType: {
            type: 'string',
            enum: PREFILLABLE_ENTITY_TYPES as unknown as string[],
            description: 'Which kind of entity to draft.',
          },
          description: {
            type: 'string',
            description:
              'A full natural-language description of the entity. Include everything the user said about it: what it is, who it is for, price if mentioned, location, materials, ingredients, schedule, etc. Min 10 chars.',
          },
        },
        required: ['entityType', 'description'],
      },
    },
  },
];

/**
 * Returns the messages array, possibly enriched with platform search results.
 * Non-fatal: on any failure returns the original messages unchanged.
 *
 * If `onToolCall` is provided, every tool the Cat invokes emits at least one
 * lifecycle event ('running' → one of completed/no_results/failed). The route
 * uses these to surface tool activity to the user via SSE.
 */
/** Max model⇄tool round-trips per user turn. Bounds cost + latency; most
 *  requests need 1, some 2 (search → refine, or search → prefill). */
const MAX_TOOL_STEPS = 3;

type RawToolCall = { id: string; type: string; function: { name: string; arguments: string } };

/**
 * Execute a single tool call and return the `tool` result message to feed back
 * to the model. Side-effects (onToolCall lifecycle, onPrefillProposal) fire here.
 */
async function executeToolCall(
  supabase: AnySupabaseClient,
  toolCall: RawToolCall,
  onToolCall?: OnToolCall,
  onPrefillProposal?: OnPrefillProposal
): Promise<ToolResultMessage> {
  const toolName = toolCall.function?.name;

  // ── search_platform ──────────────────────────────────────────────────────
  if (toolName === 'search_platform') {
    const parsedArgs = (() => {
      try {
        return JSON.parse(toolCall.function.arguments ?? '{}') as { query?: string; type?: string };
      } catch {
        return {} as { query?: string; type?: string };
      }
    })();

    onToolCall?.({
      id: toolCall.id,
      name: toolName,
      status: 'running',
      args: { query: parsedArgs.query, type: parsedArgs.type ?? 'all' },
    });

    let searchContent: string;
    try {
      const results = await searchPlatform(
        supabase,
        parsedArgs.query ?? '',
        (parsedArgs.type ?? 'all') as SearchType
      );
      if (results.length > 0) {
        searchContent = JSON.stringify(results, null, 2);
        const refs: ToolCallResultRef[] = results
          .slice(0, 8)
          .map(r => ({ url: r.url, type: r.type, title: r.title }));
        onToolCall?.({
          id: toolCall.id,
          name: toolName,
          status: 'completed',
          resultCount: results.length,
          results: refs,
        });
      } else {
        searchContent = 'No results found for this search query.';
        onToolCall?.({ id: toolCall.id, name: toolName, status: 'no_results' });
      }
    } catch (err) {
      searchContent = 'Search failed. Please try a different query.';
      onToolCall?.({
        id: toolCall.id,
        name: toolName,
        status: 'failed',
        error: err instanceof Error ? err.message : 'unknown',
      });
    }
    return { role: 'tool', tool_call_id: toolCall.id, content: searchContent };
  }

  // ── prefill_entity_form ──────────────────────────────────────────────────
  if (toolName === 'prefill_entity_form') {
    const parsedArgs = (() => {
      try {
        return JSON.parse(toolCall.function.arguments ?? '{}') as {
          entityType?: string;
          description?: string;
        };
      } catch {
        return {} as { entityType?: string; description?: string };
      }
    })();

    const requestedType = parsedArgs.entityType ?? '';
    const description = parsedArgs.description ?? '';

    onToolCall?.({
      id: toolCall.id,
      name: toolName,
      status: 'running',
      args: { entityType: requestedType },
    });

    if (!isValidEntityType(requestedType)) {
      onToolCall?.({
        id: toolCall.id,
        name: toolName,
        status: 'failed',
        error: 'invalid_entity_type',
      });
      return {
        role: 'tool',
        tool_call_id: toolCall.id,
        content: `Invalid entityType "${requestedType}". Pick one of: ${PREFILLABLE_ENTITY_TYPES.join(', ')}.`,
      };
    }

    const entityType = requestedType as EntityType;
    const entityConfig = getEntityConfig(entityType);
    if (!entityConfig) {
      onToolCall?.({
        id: toolCall.id,
        name: toolName,
        status: 'failed',
        error: 'no_entity_config',
      });
      return {
        role: 'tool',
        tool_call_id: toolCall.id,
        content: `No config for entity type "${entityType}". Skip prefill.`,
      };
    }

    try {
      const prefill = await generateFormPrefill(entityType, description, entityConfig);
      if (!prefill.success) {
        onToolCall?.({
          id: toolCall.id,
          name: toolName,
          status: 'failed',
          error: prefill.error ?? 'unknown',
        });
        return {
          role: 'tool',
          tool_call_id: toolCall.id,
          content: `Prefill failed: ${prefill.error ?? 'unknown error'}`,
        };
      }

      const fieldCount = Object.keys(prefill.data).length;
      onToolCall?.({
        id: toolCall.id,
        name: toolName,
        status: 'completed',
        resultCount: fieldCount,
        results: [],
      });
      onPrefillProposal?.({
        entityType,
        sourceDescription: description,
        data: prefill.data as Record<string, unknown>,
        confidence: prefill.confidence as Record<string, number>,
      });
      return {
        role: 'tool',
        tool_call_id: toolCall.id,
        content: `Drafted a ${entityType} with ${fieldCount} fields. The user will see a card to review and open in the form. Do not repeat the field values in your response — just briefly confirm what you drafted and invite them to review.`,
      };
    } catch (err) {
      onToolCall?.({
        id: toolCall.id,
        name: toolName,
        status: 'failed',
        error: err instanceof Error ? err.message : 'unknown',
      });
      return { role: 'tool', tool_call_id: toolCall.id, content: 'Prefill failed unexpectedly.' };
    }
  }

  // Unknown tool — return a benign result so the thread stays well-formed.
  return {
    role: 'tool',
    tool_call_id: toolCall.id,
    content: `Unknown tool "${toolName ?? ''}".`,
  };
}

export async function maybeEnrichWithSearchResults(
  supabase: AnySupabaseClient,
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
