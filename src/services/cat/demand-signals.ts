/**
 * Demand signals — real platform supply/demand context for the offer engine.
 *
 * There is no search-query log yet (the spec's one genuinely-missing dependency),
 * so we ground on what DOES exist: a live snapshot of the active listings already
 * on OrangeCat per type + their categories. This is real data — never fabricated —
 * and lets the offer engine price realistically, judge viability, and spot gaps
 * ("no translation services exist yet") vs saturation ("lots of design services").
 *
 * Cold-start honest: on an early platform the snapshot is thin, and the engine is
 * told to lean on packaging value and say so rather than invent demand.
 */

import type { AnySupabaseClient } from '@/lib/supabase/types';
import { getEntityMetadata, type EntityType } from '@/config/entity-registry';
import { logger } from '@/utils/logger';

// Listing types whose public visibility gate is status='active' and which carry a
// category-like column. (loan/wishlist use different gates — omitted for now.)
const DEMAND_TYPES: { type: EntityType; categoryCol: string }[] = [
  { type: 'service', categoryCol: 'category' },
  { type: 'product', categoryCol: 'category' },
  { type: 'project', categoryCol: 'category' },
  { type: 'cause', categoryCol: 'category' },
  { type: 'event', categoryCol: 'category' },
  { type: 'research', categoryCol: 'field' },
];

const MAX_ROWS = 300;
const MAX_CATEGORIES = 4;

function summarizeCategories(rows: Record<string, unknown>[], col: string): string {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const c = r[col];
    if (typeof c === 'string' && c.trim()) {
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
  }
  const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_CATEGORIES)
    .map(([c, n]) => `${c} ×${n}`);
  return top.join(', ');
}

/**
 * A compact, human-readable snapshot of what's already active on OrangeCat,
 * for grounding offer suggestions. Returns '' if nothing could be read.
 */
export async function getDemandSignals(supabase: AnySupabaseClient): Promise<string> {
  const lines = await Promise.all(
    DEMAND_TYPES.map(async ({ type, categoryCol }) => {
      try {
        const meta = getEntityMetadata(type);
        const { data, error } = await supabase
          .from(meta.tableName)
          .select(categoryCol)
          .eq('status', 'active')
          .limit(MAX_ROWS);
        if (error || !data) {
          return null;
        }
        const rows = data as unknown as Record<string, unknown>[];
        const cats = summarizeCategories(rows, categoryCol);
        return `- ${rows.length} active ${meta.namePlural.toLowerCase()}${cats ? ` (${cats})` : ''}`;
      } catch (err) {
        logger.warn('demand-signals: query failed', { type, err: String(err) }, 'DemandSignals');
        return null;
      }
    })
  );
  return lines.filter((l): l is string => !!l).join('\n');
}
