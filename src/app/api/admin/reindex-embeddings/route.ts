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
  /** 0–1 outcome/quality signal, blended into ranking (secondary to relevance). */
  quality: number;
}

// ── Quality signals (real outcomes) ─────────────────────────────────────────
const DAY_MS = 86_400_000;
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
/** Recency 1→0 over ~90 days; null/unknown ⇒ low. */
const recency = (ts: string | null | undefined): number => {
  if (!ts) {
    return 0.1;
  }
  const days = (Date.now() - new Date(ts).getTime()) / DAY_MS;
  return Math.min(1, Math.max(0.05, 1 - days / 90));
};
const isVerified = (status: string | null | undefined): boolean =>
  status === 'verified' || status === 'approved';
/** People: recency of activity + followers + verification. */
const profileQuality = (o: {
  lastActiveAt?: string | null;
  followers?: number;
  verified?: boolean;
}): number =>
  clamp01(
    0.5 * recency(o.lastActiveAt) +
      0.3 * Math.min((o.followers ?? 0) / 5, 1) +
      0.2 * (o.verified ? 1 : 0)
  );
/** Causes: recency + how close to goal (funding traction). */
const causeQuality = (o: { updatedAt?: string | null; raised?: number; goal?: number }): number => {
  const ratio = o.goal && o.goal > 0 ? Math.min((o.raised ?? 0) / o.goal, 1) : 0;
  return clamp01(0.6 * recency(o.updatedAt) + 0.4 * ratio);
};

const EMBED_BATCH = 96;
const key = (t: string, id: string) => `${t}:${id}`;

const ENTITY_CFG: Record<string, { table: string; basePath: string }> = {
  product: { table: 'user_products', basePath: '/products' },
  service: { table: 'user_services', basePath: '/services' },
  cause: { table: 'user_causes', basePath: '/causes' },
};

/**
 * Reconcile ONE row (called near-instantly by the DB trigger on a write).
 * Embeds it if it qualifies (public profile w/ bio, or active entity w/ text),
 * otherwise prunes it (deleted / deactivated / bio removed). O(1).
 */
async function reconcileOne(
  supabase: any,
  type: string,
  id: string
): Promise<{ indexed: number; pruned: number; failed: number }> {
  let item: IndexItem | null = null;

  if (type === 'profile') {
    const { data } = await supabase
      .from('profiles')
      .select(
        'id, username, name, bio, location_city, updated_at, last_active_at, verification_status'
      )
      .eq('id', id)
      .maybeSingle();
    if (data?.username && data?.bio) {
      const text = [data.name, data.bio, data.location_city].filter(Boolean).join('. ').trim();
      if (text) {
        const { count: followers } = await supabase
          .from('follows')
          .select('id', { count: 'exact', head: true })
          .eq('following_id', data.id);
        item = {
          entity_type: 'profile',
          entity_id: data.id,
          title: data.name || data.username,
          url: `/profiles/${data.username}`,
          text,
          updated_at: data.updated_at ?? null,
          quality: profileQuality({
            lastActiveAt: data.last_active_at,
            followers: followers ?? 0,
            verified: isVerified(data.verification_status),
          }),
        };
      }
    }
  } else if (ENTITY_CFG[type]) {
    const { table, basePath } = ENTITY_CFG[type];
    const cols =
      type === 'cause'
        ? 'id, title, description, status, updated_at, total_raised, goal_amount'
        : 'id, title, description, status, updated_at';
    const { data } = await supabase.from(table).select(cols).eq('id', id).maybeSingle();
    if (data && data.status === ENTITY_STATUS.ACTIVE) {
      const text = [data.title, data.description].filter(Boolean).join('. ').trim();
      if (text) {
        item = {
          entity_type: type,
          entity_id: data.id,
          title: data.title || 'Untitled',
          url: `${basePath}/${data.id}`,
          text,
          updated_at: data.updated_at ?? null,
          quality:
            type === 'cause'
              ? causeQuality({
                  updatedAt: data.updated_at,
                  raised: Number(data.total_raised ?? 0),
                  goal: Number(data.goal_amount ?? 0),
                })
              : clamp01(recency(data.updated_at)),
        };
      }
    }
  }

  if (!item) {
    await supabase.from('content_embeddings').delete().eq('entity_type', type).eq('entity_id', id);
    return { indexed: 0, pruned: 1, failed: 0 };
  }

  const [vec] = await embedTexts([item.text]);
  if (!vec) {
    return { indexed: 0, pruned: 0, failed: 1 };
  }
  const { error } = await supabase.from('content_embeddings').upsert(
    [
      {
        entity_type: item.entity_type,
        entity_id: item.entity_id,
        title: item.title,
        url: item.url,
        text_preview: item.text.slice(0, 500),
        embedding: JSON.stringify(vec),
        quality_score: item.quality,
        updated_at: item.updated_at ?? new Date().toISOString(),
      },
    ],
    { onConflict: 'entity_type,entity_id' }
  );
  return error ? { indexed: 0, pruned: 0, failed: 1 } : { indexed: 1, pruned: 0, failed: 0 };
}
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

  const supabase = createAdminClient() as any;

  // Single-row reconcile: the DB trigger POSTs {entity_type, entity_id} on each
  // profile/entity write for near-instant (seconds) indexing. No body (cron) ⇒
  // fall through to the full incremental sweep below (safety net).
  let target: { entity_type?: string; entity_id?: string } = {};
  try {
    target = await request.json();
  } catch {
    /* no body — cron / manual full sweep */
  }
  if (target?.entity_type && target?.entity_id) {
    const r = await reconcileOne(supabase, String(target.entity_type), String(target.entity_id));
    return NextResponse.json({ success: true, mode: 'single', ...r });
  }

  const full = new URL(request.url).searchParams.get('full') === 'true';

  // ── 1. Build the current searchable corpus (with source timestamps) ─────────
  const items: IndexItem[] = [];

  // Follower counts (one query) → per-profile connection signal.
  const followerCount = new Map<string, number>();
  const { data: follows } = await supabase.from('follows').select('following_id');
  for (const f of follows ?? []) {
    if (f.following_id) {
      followerCount.set(f.following_id, (followerCount.get(f.following_id) ?? 0) + 1);
    }
  }

  const { data: profiles } = await supabase
    .from('profiles')
    .select(
      'id, username, name, bio, location_city, updated_at, last_active_at, verification_status'
    )
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
      quality: profileQuality({
        lastActiveAt: p.last_active_at,
        followers: followerCount.get(p.id) ?? 0,
        verified: isVerified(p.verification_status),
      }),
    });
  }

  const entityTables: Array<{ table: string; type: string; basePath: string; cols: string }> = [
    {
      table: 'user_products',
      type: 'product',
      basePath: '/products',
      cols: 'id, title, description, updated_at',
    },
    {
      table: 'user_services',
      type: 'service',
      basePath: '/services',
      cols: 'id, title, description, updated_at',
    },
    {
      table: 'user_causes',
      type: 'cause',
      basePath: '/causes',
      cols: 'id, title, description, updated_at, total_raised, goal_amount',
    },
  ];
  for (const { table, type, basePath, cols } of entityTables) {
    const { data } = await supabase.from(table).select(cols).eq('status', ENTITY_STATUS.ACTIVE);
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
        quality:
          type === 'cause'
            ? causeQuality({
                updatedAt: e.updated_at,
                raised: Number(e.total_raised ?? 0),
                goal: Number(e.goal_amount ?? 0),
              })
            : clamp01(recency(e.updated_at)),
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
          quality_score: b.quality,
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

  // ── 4b. Refresh quality_score for UNCHANGED items ───────────────────────────
  // Outcomes (new follows, funding, activity) change a profile's quality without
  // changing its own row, so they wouldn't be re-embedded. Cheaply update just
  // the score for items we didn't re-embed, keeping ranking current.
  let qualityRefreshed = 0;
  const embeddedKeys = new Set(toEmbed.map(it => key(it.entity_type, it.entity_id)));
  for (const it of items) {
    if (embeddedKeys.has(key(it.entity_type, it.entity_id))) {
      continue;
    }
    const { error } = await supabase
      .from('content_embeddings')
      .update({ quality_score: it.quality })
      .eq('entity_type', it.entity_type)
      .eq('entity_id', it.entity_id);
    if (!error) {
      qualityRefreshed++;
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
    qualityRefreshed,
    pruned,
    failed,
  };
  logger.info('Reindex reconcile complete', result, 'Reindex');
  return NextResponse.json(result);
}
