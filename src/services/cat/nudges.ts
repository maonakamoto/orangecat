/**
 * Proactive nudges — the Cat working for you in the background.
 *
 * Generates specific, GROUNDED, actionable suggestions per user:
 *  - activation:  bio implies an offering they haven't created → "Publish a … service"
 *  - connection:  a real, semantically-related person → "You should meet X"
 *  - completion:  deterministic gaps → add a bio, publish a draft
 *  - growth:      a skill/asset they HAVE but haven't listed → one-tap prefilled draft,
 *                 preferring (and flagging) ones real platform demand is asking for
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
import {
  getEconomicProfile,
  suggestedEntityForSkill,
  type EconomicProfile,
} from './economic-profile';
import { logger } from '@/utils/logger';

export interface Nudge {
  nudge_type: 'activation' | 'connection' | 'completion' | 'growth';
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

  // ── Growth nudges (deterministic, grounded in the economic profile) ─────────
  // A skill or asset they HAVE but haven't turned into a listing → the smallest
  // publishable next step, one tap from a prefilled draft. The "gap is the gift".
  if (actor?.id) {
    try {
      const econ = await getEconomicProfile(supabase, userId);
      if (econ) {
        nudges.push(...(await growthNudges(supabase, actor.id, econ)));
      }
    } catch (err) {
      logger.warn('nudges: growth generation failed', { err }, 'Nudges');
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

/** Stem-aware substring match — conservative, so a "match" is a real signal. */
function termMatches(term: string, haystack: string[]): boolean {
  const x = term.toLowerCase().trim();
  if (!x || haystack.length === 0) {
    return false;
  }
  const stem = x.slice(0, Math.max(4, Math.round(x.length * 0.6)));
  return haystack.some(h => h.includes(x) || h.includes(stem));
}

/**
 * Real platform DEMAND, lowercased — what people here are actually asking for.
 * Sourced from PUBLIC wishlists + their items (the only honest demand-side data;
 * there's no search log yet). Returns [] when there's nothing — in which case growth
 * nudges fall back to plain "you haven't listed this" copy and never claim demand.
 */
async function gatherPlatformDemand(supabase: any): Promise<string[]> {
  const out: string[] = [];
  try {
    const { data: lists } = await supabase
      .from(DATABASE_TABLES.WISHLISTS)
      .select('id, title, description')
      .eq('visibility', 'public')
      .limit(100);
    const ids: string[] = [];
    for (const w of lists ?? []) {
      if (w?.title) {
        out.push(String(w.title).toLowerCase());
      }
      if (w?.description) {
        out.push(String(w.description).toLowerCase());
      }
      if (w?.id) {
        ids.push(w.id);
      }
    }
    if (ids.length) {
      const { data: items } = await supabase
        .from(DATABASE_TABLES.WISHLIST_ITEMS)
        .select('title, description, wishlist_id')
        .in('wishlist_id', ids)
        .limit(300);
      for (const it of items ?? []) {
        if (it?.title) {
          out.push(String(it.title).toLowerCase());
        }
        if (it?.description) {
          out.push(String(it.description).toLowerCase());
        }
      }
    }
  } catch (err) {
    logger.warn('nudges: demand gather failed', { err }, 'Nudges');
  }
  return out;
}

/**
 * Growth nudges: a skill or asset the user HAS but hasn't listed yet → the smallest
 * publishable next step, deep-linked to a PREFILLED create form (one tap, no template
 * picker). Deterministic and grounded — only their real, stated skills/assets, only
 * when nothing active already covers them. DEMAND-GROUNDED: a skill/asset that matches
 * real platform demand (public wishlists) is preferred and ranked higher, and its copy
 * says so; with no demand evidence it falls back to plain copy (never invents demand).
 * Capped to one skill + one asset so it inspires rather than nags.
 */
async function growthNudges(
  supabase: any,
  actorId: string,
  econ: EconomicProfile
): Promise<Nudge[]> {
  if (econ.skills.length === 0 && econ.assets.length === 0) {
    return [];
  }
  // What this user already offers, so we never suggest listing something they list.
  const ownTitles: string[] = [];
  for (const type of ['service', 'product', 'asset'] as const) {
    const { data } = await supabase
      .from(ENTITY_REGISTRY[type].tableName)
      .select('title, status')
      .eq('actor_id', actorId)
      .eq('status', 'active');
    for (const r of data ?? []) {
      if (r?.title) {
        ownTitles.push(String(r.title).toLowerCase());
      }
    }
  }
  const covered = (term: string) => term.trim() === '' || termMatches(term, ownTitles);

  const demand = await gatherPlatformDemand(supabase);
  const wanted = (term: string) => termMatches(term, demand);

  const out: Nudge[] = [];

  // Prefer an uncovered skill that real demand is asking for; else the first uncovered.
  const uncoveredSkills = econ.skills.map(s => s.name).filter(n => n && !covered(n));
  const skill = uncoveredSkills.find(wanted) ?? uncoveredSkills[0];
  if (skill) {
    const isWanted = wanted(skill);
    const et = suggestedEntityForSkill(skill);
    const meta = ENTITY_REGISTRY[et];
    const noun = meta.name.toLowerCase();
    out.push({
      nudge_type: 'growth',
      title: `Turn "${skill}" into a ${noun}`,
      body: isWanted
        ? `People on OrangeCat are already asking for ${skill} — and you have it, but it isn't listed yet. Drafting it takes one tap.`
        : et === 'product'
          ? `You make ${skill}, but it isn't listed yet — people here can only buy what they can see. Drafting it takes one tap.`
          : `You can do ${skill}, but it isn't listed yet — people here can only hire you for what they can see. Drafting it takes one tap.`,
      cta_label: `Draft a ${skill} ${noun}`,
      cta_url: `${meta.createPath}?title=${encodeURIComponent(skill)}`,
      dedupe_key: `growth:skill:${skill.toLowerCase()}`,
      score: isWanted ? 0.88 : 0.82,
    });
  }

  const uncoveredAssets = econ.assets.map(a => a.name).filter(n => n && !covered(n));
  const asset = uncoveredAssets.find(wanted) ?? uncoveredAssets[0];
  if (asset) {
    const isWanted = wanted(asset);
    out.push({
      nudge_type: 'growth',
      title: `Put your ${asset} to work`,
      body: isWanted
        ? `People here are looking for things like ${asset} — and yours mostly sits idle. Listed as an asset, it can earn.`
        : `Your ${asset} mostly sits idle. Listed as an asset, it can earn while you're not using it.`,
      cta_label: `List your ${asset}`,
      cta_url: `${ENTITY_REGISTRY.asset.createPath}?title=${encodeURIComponent(asset)}`,
      dedupe_key: `growth:asset:${asset.toLowerCase()}`,
      score: isWanted ? 0.86 : 0.8,
    });
  }

  return out;
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
