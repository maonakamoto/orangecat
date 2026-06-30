/**
 * User economic profile — the structured store of a user's latent economic value.
 *
 * The keystone of the economic agent (docs/specs/cat-economic-interviewer.md): a
 * typed home for what Cat learns by interviewing the user, so the offer engine,
 * gap-detection, and future matchmaking reason over a real model of the person
 * instead of two free-text fields. Read into Cat's context; written by the
 * interview/extraction layer.
 *
 * Every accessor degrades gracefully: if the table doesn't exist yet (migration
 * pending on the box) or a query fails, reads return null/empty and writes return
 * false — Cat keeps working, just without this signal.
 */

import type { AnySupabaseClient } from '@/lib/supabase/types';
import { DATABASE_TABLES } from '@/config/database-tables';
import { logger } from '@/utils/logger';

export interface EconomicSkill {
  name: string;
  level?: string;
  years?: number;
}
export interface EconomicAsset {
  name: string;
  type?: string;
}
export type EconomicGoalKind = 'earn' | 'fund' | 'learn' | 'connect' | 'build';
export interface EconomicGoal {
  text: string;
  kind?: EconomicGoalKind;
}

export interface EconomicProfile {
  skills: EconomicSkill[];
  assets: EconomicAsset[];
  goals: EconomicGoal[];
  constraints: string[];
  /** The richest signal: what people come to this person for. */
  askedFor: string[];
  motivation?: string | null;
  stage?: string | null;
}

const EMPTY: EconomicProfile = {
  skills: [],
  assets: [],
  goals: [],
  constraints: [],
  askedFor: [],
  motivation: null,
  stage: null,
};

function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

/** True when the profile carries any latent-value signal at all. */
export function isEconomicProfileEmpty(p: EconomicProfile | null): boolean {
  if (!p) {
    return true;
  }
  return (
    p.skills.length === 0 &&
    p.assets.length === 0 &&
    p.goals.length === 0 &&
    p.constraints.length === 0 &&
    p.askedFor.length === 0 &&
    !p.motivation &&
    !p.stage
  );
}

export async function getEconomicProfile(
  supabase: AnySupabaseClient,
  userId: string
): Promise<EconomicProfile | null> {
  try {
    const { data, error } = await supabase
      .from(DATABASE_TABLES.USER_ECONOMIC_PROFILE)
      .select('skills, assets, goals, constraints, asked_for, motivation, stage')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) {
      return null;
    }
    const row = data as Record<string, unknown>;
    return {
      skills: asArray<EconomicSkill>(row.skills),
      assets: asArray<EconomicAsset>(row.assets),
      goals: asArray<EconomicGoal>(row.goals),
      constraints: asArray<string>(row.constraints),
      askedFor: asArray<string>(row.asked_for),
      motivation: (row.motivation as string | null) ?? null,
      stage: (row.stage as string | null) ?? null,
    };
  } catch (err) {
    logger.warn('getEconomicProfile failed', { err: String(err) }, 'EconomicProfile');
    return null;
  }
}

function dedupe<T>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const it of items) {
    const key = typeof it === 'string' ? it.toLowerCase().trim() : JSON.stringify(it);
    if (key && !seen.has(key)) {
      seen.add(key);
      out.push(it);
    }
  }
  return out;
}

/**
 * Merge-upsert: union the provided array dimensions onto what's stored (so an
 * interview round adds without clobbering), and overwrite scalars when provided.
 */
export async function saveEconomicProfile(
  supabase: AnySupabaseClient,
  userId: string,
  patch: Partial<EconomicProfile>
): Promise<boolean> {
  try {
    const current = (await getEconomicProfile(supabase, userId)) ?? EMPTY;
    const merged = {
      user_id: userId,
      skills: dedupe([...current.skills, ...(patch.skills ?? [])]),
      assets: dedupe([...current.assets, ...(patch.assets ?? [])]),
      goals: dedupe([...current.goals, ...(patch.goals ?? [])]),
      constraints: dedupe([...current.constraints, ...(patch.constraints ?? [])]),
      asked_for: dedupe([...current.askedFor, ...(patch.askedFor ?? [])]),
      motivation: patch.motivation !== undefined ? patch.motivation : current.motivation,
      stage: patch.stage !== undefined ? patch.stage : current.stage,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from(DATABASE_TABLES.USER_ECONOMIC_PROFILE)
      .upsert(merged, { onConflict: 'user_id' });
    if (error) {
      logger.warn('saveEconomicProfile upsert failed', { error }, 'EconomicProfile');
      return false;
    }
    return true;
  } catch (err) {
    logger.warn('saveEconomicProfile failed', { err: String(err) }, 'EconomicProfile');
    return false;
  }
}
