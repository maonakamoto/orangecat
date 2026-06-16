/**
 * POST /api/admin/reindex-embeddings
 *
 * One-time / on-demand backfill of the content_embeddings table that powers
 * semantic search. Reads public profiles + active entities, embeds their text,
 * and upserts the vectors. Idempotent (upsert on entity_type+entity_id).
 *
 * Protected by a shared secret in the `x-reindex-secret` header (set
 * REINDEX_SECRET in the server env). Intended to be curled from the box after
 * the embedding provider key is configured, or run periodically.
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
}

const EMBED_BATCH = 96;

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

  // content_embeddings isn't in the generated Database types yet, so use a
  // permissive client for this backfill (same pattern as platform-search.ts).
  const supabase = createAdminClient() as any;
  const items: IndexItem[] = [];

  // Profiles (people) — only those with real content.
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, name, bio, location_city')
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
    });
  }

  // Active entities.
  const entityTables: Array<{ table: string; type: string; basePath: string }> = [
    { table: 'user_products', type: 'product', basePath: '/products' },
    { table: 'user_services', type: 'service', basePath: '/services' },
    { table: 'user_causes', type: 'cause', basePath: '/causes' },
  ];
  for (const { table, type, basePath } of entityTables) {
    const { data } = await supabase
      .from(table)
      .select('id, title, description')
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
      });
    }
  }

  if (items.length === 0) {
    return NextResponse.json({ success: true, indexed: 0, message: 'Nothing to index.' });
  }

  let indexed = 0;
  let failed = 0;
  for (let i = 0; i < items.length; i += EMBED_BATCH) {
    const batch = items.slice(i, i + EMBED_BATCH);
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
          updated_at: new Date().toISOString(),
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

  logger.info('Reindex complete', { indexed, failed, total: items.length }, 'Reindex');
  return NextResponse.json({ success: true, indexed, failed, total: items.length });
}
