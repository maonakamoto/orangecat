import { ENTITY_REGISTRY } from '@/config/entity-registry';
import { DATABASE_TABLES } from '@/config/database-tables';
import { saveEconomicProfile, normalizeEconomicPatch } from '../economic-profile';
import type { ActionHandler } from './types';

export const contextHandlers: Record<string, ActionHandler> = {
  // Persist latent economic value the user discloses (skills/assets/goals/etc.)
  // into the structured economic-profile store — the keystone the offer engine
  // and interview build on. Merge-upserts; safe to call repeatedly. Shares the
  // normalizer with the passive extractor so both paths behave identically.
  save_economic_profile: async (supabase, userId, _actorId, params) => {
    const patch = normalizeEconomicPatch(params as Record<string, unknown>);
    if (!patch) {
      return {
        success: false,
        error:
          'Nothing to save — provide at least one of: skills, assets, goals, constraints, asked_for, motivation, stage.',
      };
    }

    const ok = await saveEconomicProfile(supabase, userId, patch);
    if (!ok) {
      return { success: false, error: 'Could not save the economic profile.' };
    }
    const summary = [
      patch.skills?.length && `${patch.skills.length} skill(s)`,
      patch.assets?.length && `${patch.assets.length} asset(s)`,
      patch.goals?.length && `${patch.goals.length} goal(s)`,
    ]
      .filter(Boolean)
      .join(', ');
    return {
      success: true,
      data: { displayMessage: `🧭 Updated your economic profile${summary ? ` (${summary})` : ''}` },
    };
  },

  add_context: async (supabase, _userId, actorId, params) => {
    const { data, error } = await supabase
      .from(ENTITY_REGISTRY.document.tableName)
      .insert({
        actor_id: actorId,
        title: params.title,
        content: params.content,
        document_type: params.document_type || 'notes',
        visibility: 'cat_visible',
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return {
      success: true,
      data: { ...data, displayMessage: `🧠 Saved to your Cat context: "${params.title}"` },
    };
  },

  update_profile: async (supabase, userId, _actorId, params) => {
    // Update the user's public profile. Only safe text fields — no username (affects URLs),
    // no email, no financial addresses. Profile.id = auth.users.id = userId.
    const SAFE_FIELDS = [
      'name',
      'bio',
      'background',
      'website',
      'location_city',
      'location_country',
    ] as const;
    type SafeField = (typeof SAFE_FIELDS)[number];

    const updates: Partial<Record<SafeField, string>> = {};
    for (const field of SAFE_FIELDS) {
      if (params[field] !== undefined && params[field] !== null) {
        updates[field] = params[field] as string;
      }
    }

    if (Object.keys(updates).length === 0) {
      return {
        success: false,
        error:
          'No profile fields to update — provide at least one of: name, bio, background, website, location_city, location_country',
      };
    }

    const { data, error } = await supabase
      .from(DATABASE_TABLES.PROFILES)
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select('name, bio, background, website, location_city, location_country')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    const updatedFields = Object.keys(updates).join(', ');
    return {
      success: true,
      data: {
        ...data,
        displayMessage: `✅ Profile updated: ${updatedFields}`,
      },
    };
  },
};
