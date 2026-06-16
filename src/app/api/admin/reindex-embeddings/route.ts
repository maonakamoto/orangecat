/**
 * POST /api/admin/reindex-embeddings  — incremental semantic-index reconciler
 *
 * Keeps content_embeddings in sync with the searchable corpus (public profiles
 * with a bio + ACTIVE entities). Designed to run frequently (cron, every couple
 * of minutes) AND to be safe to spam:
 *
 *   - INCREMENTAL (default): embeds only items that are NEW or whose source
 *     `updated_at` is newer than what we last embedded. Unchanged items are
 *     skipped → near-zero cost per run.
 *   - PRUNE: removes index rows whose source no longer qualifies (deleted,
 *     deactivated, bio removed).
 *   - FULL (?full=true): re-embeds everything (use after changing the model).
 *
 * Decoupled from the write path on purpose: saving a profile never waits on an
 * embedding call; the reconciler converges the index in the background, and if
 * the embedding provider is down, items simply wait for the next run.
 *
 * Protected by the `x-reindex-secret` header == REINDEX_SECRET env.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { embeddingsEnabled, embedTexts } from '@/services/ai/embeddings';
import { ENTITY_STATUS } from '@/config/database-constants';
import { logger } from '@/utils/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

interface IndexItem {
  entity_type: string;
  entity_id: string;
  title: string;
  url: string;
  text: string;
  updated_at: string | null;
}

const EMBED_BATCH = 96;
const key = (t: string, id: string) => `${t}:${id}`;
const isNewer = (a: string | null, b: string | null) => {
  if (!a) {
    return false;
  } // no source timestamp ⇒ don't force re-embed
  if (!b) {
    return true;
  } // never embedded ⇒ embed
  return new Date(a).getTime() > new Date(b).getTime();
};

export async function POST(request: Request) {
  const secret = process.env.REINDEX_SECRET;
  if (!secret || request.headers.get('x-reindex-secret') !== secret) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (!embeddingsEnabled()) {
    return NextResponse.json(
      { success: false, error: 'No embedding provider configured (set OPENAI_API_KEY).' },
      { status: 503 }
    );
  }

  const full = new URL(request.url).searchParams.get('full') === 'true';
  const supabase = createAdminClient() as any;

  // ── 1. Build the current searchable corpus (with source timestamps) ─────────
  const items: IndexItem[] = [];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, name, bio, location_city, updated_at')
    .not('username', 'is', null)
    .not('bio', 'is', null);
  for (const p of profiles ?? []) {
    const text = [p.name, p.bio, p.location_city].filter(Boolean).join('. ').trim();
    if (!text) {
      continue;
    }
    items.push({
      entity_type: 'profile',
      entity_id: p.id,
      title: p.name || p.username,
      url: `/profiles/${p.username}`,
      text,
      updated_at: p.updated_at ?? null,
    });
  }

  const entityTables: Array<{ table: string; type: string; basePath: string }> = [
    { table: 'user_products', type: 'product', basePath: '/products' },
    { table: 'user_services', type: 'service', basePath: '/services' },
    { table: 'user_causes', type: 'cause', basePath: '/causes' },
  ];
  for (const { table, type, basePath } of entityTables) {
    const { data } = await supabase
      .from(table)
      .select('id, title, description, updated_at')
      .eq('status', ENTITY_STATUS.ACTIVE);
    for (const e of data ?? []) {
      const text = [e.title, e.description].filter(Boolean).join('. ').trim();
      if (!text) {
        continue;
      }
      items.push({
        entity_type: type,
        entity_id: e.id,
        title: e.title || 'Untitled',
        url: `${basePath}/${e.id}`,
        text,
        updated_at: e.updated_at ?? null,
      });
    }
  }

  // ── 2. Load what's already indexed (key → last-embedded source timestamp) ────
  const { data: existingRows } = await supabase
    .from('content_embeddings')
    .select('entity_type, entity_id, updated_at');
  const existing = new Map<string, string | null>();
  for (const r of existingRows ?? []) {
    existing.set(key(r.entity_type, r.entity_id), r.updated_at ?? null);
  }

  // ── 3. Diff: what needs (re)embedding, what to prune ────────────────────────
  const currentKeys = new Set(items.map(it => key(it.entity_type, it.entity_id)));
  const toEmbed = full
    ? items
    : items.filter(it => {
        const k = key(it.entity_type, it.entity_id);
        return !existing.has(k) || isNewer(it.updated_at, existing.get(k) ?? null);
      });
  const toPrune = [...existing.keys()].filter(k => !currentKeys.has(k));

  // ── 4. Embed + upsert (store SOURCE updated_at so the next diff works) ───────
  let indexed = 0;
  let failed = 0;
  for (let i = 0; i < toEmbed.length; i += EMBED_BATCH) {
    const batch = toEmbed.slice(i, i + EMBED_BATCH);
    const vectors = await embedTexts(batch.map(b => b.text));
    const rows = batch
      .map((b, j) => {
        const vec = vectors[j];
        if (!vec) {
          failed++;
          return null;
        }
        return {
          entity_type: b.entity_type,
          entity_id: b.entity_id,
          title: b.title,
          url: b.url,
          text_preview: b.text.slice(0, 500),
          embedding: JSON.stringify(vec),
          updated_at: b.updated_at ?? new Date().toISOString(),
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
    if (rows.length > 0) {
      const { error } = await supabase
        .from('content_embeddings')
        .upsert(rows, { onConflict: 'entity_type,entity_id' });
      if (error) {
        logger.error('content_embeddings upsert failed', { error }, 'Reindex');
        failed += rows.length;
      } else {
        indexed += rows.length;
      }
    }
  }

  // ── 5. Prune stale rows (deleted / deactivated / bio removed) ───────────────
  let pruned = 0;
  for (const k of toPrune) {
    const [etype, eid] = k.split(':');
    const { error } = await supabase
      .from('content_embeddings')
      .delete()
      .eq('entity_type', etype)
      .eq('entity_id', eid);
    if (!error) {
      pruned++;
    }
  }

  const result = {
    success: true,
    mode: full ? 'full' : 'incremental',
    corpus: items.length,
    indexed,
    skipped: items.length - toEmbed.length,
    pruned,
    failed,
  };
  logger.info('Reindex reconcile complete', result, 'Reindex');
  return NextResponse.json(result);
}
