/**
 * Cat tool-use intent detection + tool definitions. Extracted verbatim from
 * tool-use.ts (SoC). messageMightNeedTools is re-exported from tool-use.ts.
 */

import { CAT_CREATABLE_ENTITY_TYPES } from '@/types/cat';

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
  // economic-agent / suggest_offers ("what can I offer?")
  'what can i offer',
  'what can i sell',
  'what could i offer',
  'what should i create',
  'what should i sell',
  'make money',
  'earn money',
  'monetize',
  'monetise',
  'ways to earn',
  'help me make money',
  'what can i do to earn',
  'ideas for me',
  'how can i participate',
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

export function hasCreateIntent(message: string): boolean {
  return CREATE_INTENT_PATTERNS.some(re => re.test(message));
}

/** Entity types Cat can DRAFT via the prefill tool. Derived from the creatable SSOT so the
 *  two lists can't drift. `group` is creatable but not prefillable — it uses a `name`, not the
 *  form-field prefill flow. Add an entry here only by removing it from this exclusion set. */
const NON_PREFILLABLE_ENTITY_TYPES = new Set<string>(['group']);
export const PREFILLABLE_ENTITY_TYPES = CAT_CREATABLE_ENTITY_TYPES.filter(
  t => !NON_PREFILLABLE_ENTITY_TYPES.has(t)
);

export const PLATFORM_TOOL_DEFINITION = [
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
  {
    type: 'function',
    function: {
      name: 'suggest_offers',
      description:
        'The economic agent. Call this when the user asks what they could offer, sell, or create, how they could make money, or wants ideas grounded in who they are. It reads everything OrangeCat knows about them (profile, documents, memories, existing entities) and proposes several concrete, ready-to-publish offers across the economic spectrum, each as a draft card. Takes no required arguments — it reads their stored context, not the message.',
      parameters: {
        type: 'object',
        properties: {
          focus: {
            type: 'string',
            description:
              'Optional area to focus suggestions on (e.g. "design", "teaching", "renting out gear"). Omit for a broad spread.',
          },
          count: {
            type: 'number',
            description: 'How many offers to propose (1-5). Default 4.',
          },
        },
      },
    },
  },
];
