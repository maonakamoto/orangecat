/**
 * Platform Search Service
 *
 * Enables Cat to search OrangeCat for users, projects, products,
 * services, events, and causes.
 *
 * Implementation: ILIKE pattern matching on title/description/bio.
 * Fast enough at current scale. Upgrade path: add pgvector when needed;
 * this interface stays stable so no code debt is introduced by waiting.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { AnySupabaseClient } from '@/lib/supabase/types';
import { getTableName } from '@/config/entity-registry';
import { DATABASE_TABLES } from '@/config/database-tables';
import { ENTITY_STATUS } from '@/config/database-constants';

export type SearchType =
  | 'all'
  | 'people'
  | 'projects'
  | 'products'
  | 'services'
  | 'events'
  | 'causes';

export interface SearchResult {
  type: SearchType;
  title: string;
  description: string;
  url: string;
}

const MAX_RESULTS_PER_TYPE = 5;

/**
 * Search the platform for users and entities.
 * Returns up to 5 results per requested type (max 30 for 'all').
 */
export async function searchPlatform(
  supabase: AnySupabaseClient,
  query: string,
  type: SearchType = 'all'
): Promise<SearchResult[]> {
  const q = query.trim();
  if (!q) {
    return [];
  }

  // Tokenize: match ANY significant word (OR), not the whole phrase. A model
  // query like "tattoo artist collaboration" must match a bio that says
  // "Tattoo artist based in Berlin" — a single %phrase% ILIKE never would.
  // (Recall-first; pgvector semantic ranking is the next slice.) Split on
  // non-alphanumerics so tokens are safe to embed in PostgREST .or() strings.
  let tokens = q
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter(t => t.length >= 3 && !SEARCH_STOPWORDS.has(t))
    .slice(0, 6);
  if (tokens.length === 0) {
    tokens = [
      q
        .toLowerCase()
        .replace(/[^a-z0-9 ]+/g, '')
        .trim(),
    ].filter(Boolean);
  }
  if (tokens.length === 0) {
    return [];
  }
  const results: SearchResult[] = [];

  await Promise.all([
    type === 'all' || type === 'people'
      ? searchProfiles(supabase, tokens, results)
      : Promise.resolve(),
    type === 'all' || type === 'projects'
      ? searchTable(supabase, getTableName('project'), 'projects', '/fund', tokens, results)
      : Promise.resolve(),
    type === 'all' || type === 'causes'
      ? searchTable(supabase, getTableName('cause'), 'causes', '/causes', tokens, results)
      : Promise.resolve(),
    type === 'all' || type === 'products'
      ? searchTable(supabase, getTableName('product'), 'products', '/market', tokens, results)
      : Promise.resolve(),
    type === 'all' || type === 'services'
      ? searchTable(supabase, getTableName('service'), 'services', '/services', tokens, results)
      : Promise.resolve(),
    type === 'all' || type === 'events'
      ? searchTable(supabase, getTableName('event'), 'events', '/events', tokens, results)
      : Promise.resolve(),
  ]);

  return results;
}

/** Query-framing words that add noise to matchmaking searches, not signal. */
const SEARCH_STOPWORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'that',
  'this',
  'you',
  'your',
  'who',
  'whom',
  'find',
  'need',
  'want',
  'looking',
  'someone',
  'anyone',
  'somebody',
  'collaborate',
  'collaboration',
  'collaborator',
  'partner',
  'platform',
  'orangecat',
  'people',
  'person',
  'can',
  'help',
  'near',
  'about',
]);

/** Build a PostgREST `.or()` string: any token, in any field (tokens are
 *  alphanumeric-only so they're safe to interpolate). */
function ilikeOrConditions(fields: string[], tokens: string[]): string {
  return tokens.flatMap(t => fields.map(f => `${f}.ilike.%${t}%`)).join(',');
}

// ─── Private helpers ─────────────────────────────────────────────────────────

async function searchProfiles(
  supabase: AnySupabaseClient,
  tokens: string[],
  results: SearchResult[]
): Promise<void> {
  const { data } = await supabase
    .from(DATABASE_TABLES.PROFILES)
    .select('username, name, bio')
    .not('username', 'is', null)
    .or(ilikeOrConditions(['username', 'name', 'bio'], tokens))
    .limit(MAX_RESULTS_PER_TYPE);

  if (!data?.length) {
    return;
  }

  for (const row of data as Array<{
    username: string;
    name: string | null;
    bio: string | null;
  }>) {
    results.push({
      type: 'people',
      title: row.name || row.username,
      description: row.bio?.slice(0, 200) || `@${row.username} on OrangeCat`,
      url: `/profiles/${row.username}`,
    });
  }
}

async function searchTable(
  supabase: AnySupabaseClient,
  table: string,
  type: SearchType,
  basePath: string,
  tokens: string[],
  results: SearchResult[]
): Promise<void> {
  const { data } = await supabase
    .from(table)
    .select('id, title, description, slug')
    .eq('status', ENTITY_STATUS.ACTIVE)
    .or(ilikeOrConditions(['title', 'description'], tokens))
    .limit(MAX_RESULTS_PER_TYPE);

  if (!data?.length) {
    return;
  }

  for (const row of data as Array<{
    id: string;
    title: string;
    description: string | null;
    slug: string | null;
  }>) {
    results.push({
      type,
      title: row.title,
      description: row.description?.slice(0, 200) || '',
      url: `${basePath}/${row.slug || row.id}`,
    });
  }
}
