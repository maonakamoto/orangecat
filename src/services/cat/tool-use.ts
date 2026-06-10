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

const PREFILLABLE_ENTITY_TYPES = [
  'product',
  'service',
  'project',
  'cause',
  'event',
  'asset',
  'loan',
  'investment',
  'research',
  'wishlist',
] as const;

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
  // Tool use is wired through Groq's function-calling API only — every other
  // provider falls back to the model's own knowledge (no platform tools).
  // OpenAI/Anthropic/etc. all support tools natively but each needs its own
  // adapter; that's a follow-up.
  if (provider !== 'groq') {
    return messages;
  }

  const lowerMessage = userMessage.toLowerCase();
  const mightNeedTool = TOOL_TRIGGER_KEYWORDS.some(kw => lowerMessage.includes(kw));
  if (!mightNeedTool) {
    return messages;
  }

  const key = groqKey ?? process.env.GROQ_API_KEY;
  if (!key) {
    return messages;
  }

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelToUse,
        messages,
        tools: PLATFORM_TOOL_DEFINITION,
        tool_choice: 'auto',
        stream: false,
        max_tokens: 500,
      }),
    });

    if (!res.ok) {
      return messages;
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    if (choice?.finish_reason !== 'tool_calls' || !choice.message?.tool_calls?.length) {
      return messages;
    }

    const assistantMsg = choice.message as ToolCallAssistantMessage;
    const enriched: ToolAugmentedMessage[] = [...messages, assistantMsg];

    for (const toolCall of assistantMsg.tool_calls) {
      const toolName = toolCall.function?.name;

      // ── search_platform ────────────────────────────────────────────────
      if (toolName === 'search_platform') {
        const parsedArgs = (() => {
          try {
            return JSON.parse(toolCall.function.arguments ?? '{}') as {
              query?: string;
              type?: string;
            };
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
        enriched.push({ role: 'tool', tool_call_id: toolCall.id, content: searchContent });
        continue;
      }

      // ── prefill_entity_form ────────────────────────────────────────────
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
          enriched.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: `Invalid entityType "${requestedType}". Pick one of: ${PREFILLABLE_ENTITY_TYPES.join(', ')}.`,
          });
          onToolCall?.({
            id: toolCall.id,
            name: toolName,
            status: 'failed',
            error: 'invalid_entity_type',
          });
          continue;
        }

        const entityType = requestedType as EntityType;
        const entityConfig = getEntityConfig(entityType);
        if (!entityConfig) {
          enriched.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: `No config for entity type "${entityType}". Skip prefill.`,
          });
          onToolCall?.({
            id: toolCall.id,
            name: toolName,
            status: 'failed',
            error: 'no_entity_config',
          });
          continue;
        }

        try {
          const prefill = await generateFormPrefill(entityType, description, entityConfig);
          if (!prefill.success) {
            enriched.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: `Prefill failed: ${prefill.error ?? 'unknown error'}`,
            });
            onToolCall?.({
              id: toolCall.id,
              name: toolName,
              status: 'failed',
              error: prefill.error ?? 'unknown',
            });
            continue;
          }

          const fieldCount = Object.keys(prefill.data).length;
          enriched.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            // Short acknowledgment back to the LLM — the actual form draft is
            // delivered to the user via the prefill_proposal SSE event below,
            // not embedded in the conversation history.
            content: `Drafted a ${entityType} with ${fieldCount} fields. The user will see a card to review and open in the form. Do not repeat the field values in your response — just briefly confirm what you drafted and invite them to review.`,
          });
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
        } catch (err) {
          enriched.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: 'Prefill failed unexpectedly.',
          });
          onToolCall?.({
            id: toolCall.id,
            name: toolName,
            status: 'failed',
            error: err instanceof Error ? err.message : 'unknown',
          });
        }
        continue;
      }
    }

    return enriched;
  } catch {
    return messages;
  }
}
