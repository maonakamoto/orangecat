/**
 * Proactive nudges — the Cat working for you in the background.
 *
 * Generates specific, GROUNDED, actionable suggestions per user:
 *  - activation:  bio implies an offering they haven't created → "Publish a … service"
 *  - connection:  a real, semantically-related person → "You should meet X"
 *  - completion:  deterministic gaps → add a bio, publish a draft
 *
 * Activation + connection are LLM-reasoned (grounded: never invents a skill they
 * didn't state or a person not surfaced by semantic search). Completion is
 * rule-based (always correct). Results are cached in user_nudges; dismissed ones
 * never reappear (dedupe_key). This is the agentic loop pointed at user growth.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { ENTITY_REGISTRY } from '@/config/entity-registry';
import { DATABASE_TABLES } from '@/config/database-tables';
import { ROUTES } from '@/config/routes';
import { DEFAULT_FREE_MODEL_ID } from '@/config/ai-models';
import { createOpenRouterService } from '@/services/ai';
import { searchPlatform } from './platform-search';
import { logger } from '@/utils/logger';

export interface Nudge {
  nudge_type: 'activation' | 'connection' | 'completion';
  title: string;
  body: string;
  cta_label: string | null;
  cta_url: string | null;
  dedupe_key: string;
  score: number;
}

// Entity types the Cat may proactively suggest creating.
const SUGGESTABLE = new Set(['service', 'product', 'project', 'cause', 'event', 'wishlist']);
const ENTITY_SOURCE: Array<{ type: 'product' | 'service' | 'cause' }> = [
  { type: 'product' },
  { type: 'service' },
  { type: 'cause' },
];

const usernameFromUrl = (url: string): string | null => {
  const m = url.match(/^\/profiles\/(.+)$/);
  return m ? m[1] : null;
};

export async function generateNudges(supabase: any, userId: string): Promise<Nudge[]> {
  const { data: profile } = await supabase
    .from(DATABASE_TABLES.PROFILES)
    .select('id, username, name, bio, location_city')
    .eq('id', userId)
    .maybeSingle();
  if (!profile?.username) {
    return [];
  }

  const nudges: Nudge[] = [];

  // ── User's own entities (active + drafts) ──────────────────────────────────
  const { data: actor } = await supabase
    .from(DATABASE_TABLES.ACTORS)
    .select('id')
    .eq('user_id', userId)
    .eq('actor_type', 'user')
    .maybeSingle();
  const created: Record<string, { active: number; drafts: Array<{ id: string; title: string }> }> =
    {};
  if (actor?.id) {
    for (const { type } of ENTITY_SOURCE) {
      const meta = ENTITY_REGISTRY[type];
      const { data } = await supabase
        .from(meta.tableName)
        .select('id, title, status')
        .eq('actor_id', actor.id);
      created[type] = {
        active: (data ?? []).filter((e: any) => e.status === 'active').length,
        drafts: (data ?? [])
          .filter((e: any) => e.status === 'draft')
          .map((e: any) => ({ id: e.id, title: e.title })),
      };
    }
  }

  // ── Completion nudges (deterministic) ──────────────────────────────────────
  if (!profile.bio) {
    nudges.push({
      nudge_type: 'completion',
      title: 'Add a bio so people — and the Cat — can find you',
      body: 'A few lines about what you do lets the Cat match you to the right people, work, and opportunities.',
      cta_label: 'Add your bio',
      cta_url: ROUTES.DASHBOARD.INFO_EDIT,
      dedupe_key: 'completion:bio',
      score: 0.6,
    });
  }
  for (const { type } of ENTITY_SOURCE) {
    for (const d of created[type]?.drafts ?? []) {
      nudges.push({
        nudge_type: 'completion',
        title: `Publish your draft "${d.title}"`,
        body: `It's still a draft, so no one can find it yet. A couple of clicks makes it live.`,
        cta_label: 'Review & publish',
        cta_url: ENTITY_REGISTRY[type].basePath,
        dedupe_key: `completion:publish:${d.id}`,
        score: 0.7,
      });
    }
  }

  // ── Smart nudges (activation + connection), only with a bio to reason from ──
  if (profile.bio) {
    let neighbors: Array<{ username: string; title: string; description: string }> = [];
    try {
      const results = await searchPlatform(
        supabase,
        `${profile.name ?? ''} ${profile.bio}`,
        'people'
      );
      neighbors = results
        .map(r => ({
          username: usernameFromUrl(r.url) ?? '',
          title: r.title,
          description: r.description,
        }))
        .filter(n => n.username && n.username !== profile.username)
        .slice(0, 4);
    } catch (err) {
      logger.warn('nudges: neighbor search failed', { err }, 'Nudges');
    }

    try {
      const smart = await smartNudges(profile, created, neighbors);
      nudges.push(...smart);
    } catch (err) {
      logger.warn('nudges: smart generation failed', { err }, 'Nudges');
    }
  }

  // rank, dedupe, cap
  const seen = new Set<string>();
  return nudges
    .sort((a, b) => b.score - a.score)
    .filter(n => (seen.has(n.dedupe_key) ? false : (seen.add(n.dedupe_key), true)))
    .slice(0, 5);
}

async function smartNudges(
  profile: any,
  created: Record<string, { active: number; drafts: Array<{ id: string; title: string }> }>,
  neighbors: Array<{ username: string; title: string; description: string }>
): Promise<Nudge[]> {
  const system = `You are the proactive engine of OrangeCat's Cat. Given a user's profile, what they've already created, and real people on the platform related to them, propose specific, GROUNDED nudges that help them succeed.

STRICT RULES:
- Ground everything in the data given. NEVER invent a skill they didn't state or a person not in the provided list.
- Two kinds of nudge:
  1. "activation" — if their bio clearly implies an offering they have NOT already created, suggest creating ONE entity. entityType must be one of: service, product, project, cause, event, wishlist. Give a concrete title and a one-sentence reason.
  2. "connection" — suggest meeting ONE of the listed people, with a one-sentence reason tied to BOTH bios.
- Don't suggest creating an entity type they already have active. If nothing is genuinely useful, return [].

Return ONLY a JSON array (max 3), each item exactly:
{"type":"activation","entityType":"service","title":"<entity title>","reason":"<one sentence>"}
or {"type":"connection","username":"<one of the provided usernames>","reason":"<one sentence>"}`;

  const payload = {
    profile: { name: profile.name, bio: profile.bio, location: profile.location_city },
    alreadyCreated: Object.fromEntries(
      Object.entries(created).map(([k, v]) => [k, { active: v.active }])
    ),
    people: neighbors,
  };

  const ai = createOpenRouterService();
  const res = await ai.chatCompletion({
    model: DEFAULT_FREE_MODEL_ID,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: JSON.stringify(payload) },
    ],
    temperature: 0.4,
  });

  const raw = (res.content || '').replace(/```json\s*|\s*```/g, '').trim();
  let parsed: any[];
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) {
    return [];
  }

  const neighborUsernames = new Set(neighbors.map(n => n.username));
  const out: Nudge[] = [];
  for (const p of parsed) {
    if (p?.type === 'activation' && SUGGESTABLE.has(p.entityType) && p.title) {
      const meta = ENTITY_REGISTRY[p.entityType as keyof typeof ENTITY_REGISTRY];
      if (!meta) {
        continue;
      }
      out.push({
        nudge_type: 'activation',
        title: `Offer "${String(p.title).slice(0, 80)}" as a ${meta.name}`,
        body: String(p.reason || '').slice(0, 240),
        cta_label: `Create ${meta.name}`,
        cta_url: meta.createPath,
        dedupe_key: `activation:${p.entityType}`,
        score: 0.85,
      });
    } else if (p?.type === 'connection' && neighborUsernames.has(p.username)) {
      const n = neighbors.find(x => x.username === p.username)!;
      out.push({
        nudge_type: 'connection',
        title: `You should meet ${n.title}`,
        body: String(p.reason || '').slice(0, 240),
        cta_label: 'View profile',
        cta_url: `/profiles/${p.username}`,
        dedupe_key: `connection:${p.username}`,
        score: 0.8,
      });
    }
  }
  return out;
}
