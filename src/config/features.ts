/**
 * Product feature flags — SSOT for env-gated UI behavior.
 *
 * Read flags from here instead of scattering `process.env.NEXT_PUBLIC_*`
 * checks across components.
 */

function envFlag(name: string): boolean {
  return process.env[name] === 'true';
}

export const FEATURES = {
  /** Voice input on create forms and onboarding (requires browser speech APIs). */
  voiceInput: envFlag('NEXT_PUBLIC_FEATURE_VOICE_INPUT'),
} as const;
