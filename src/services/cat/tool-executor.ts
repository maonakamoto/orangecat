/**
 * Cat tool executor — runs a single tool call (search_platform / prefill_entity_form)
 * and returns the `tool` result message to feed back to the model. Extracted verbatim
 * from tool-use.ts (SoC). Side-effects (onToolCall lifecycle, onPrefillProposal) fire here.
 */

import type { AnySupabaseClient } from '@/lib/supabase/types';
import { searchPlatform, type SearchType } from './platform-search';
import { generateFormPrefill } from '@/lib/ai/form-prefill-service';
import { getEntityConfig } from '@/config/entity-configs/get-config';
import { isValidEntityType, type EntityType } from '@/config/entity-registry';
import { PREFILLABLE_ENTITY_TYPES } from './tool-use-detection';
import type {
  ToolResultMessage,
  ToolCallResultRef,
  OnToolCall,
  OnPrefillProposal,
  RawToolCall,
} from './tool-use-types';

/**
 * Execute a single tool call and return the `tool` result message to feed back
 * to the model. Side-effects (onToolCall lifecycle, onPrefillProposal) fire here.
 */
export async function executeToolCall(
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
