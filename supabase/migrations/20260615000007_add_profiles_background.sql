-- ============================================================================
-- Add the missing profiles.background column.
-- ============================================================================
-- The app has always SELECTed `background` from profiles (Cat context fetch in
-- document-context.ts, the update_profile action, the profile editor) but the
-- column was never created in any migration — so on the self-host DB the whole
-- profile SELECT errored and the Cat received NO profile context for any user
-- (bio, name, location all dropped), forcing it to fall back to few-shot
-- personas. `background` is the designed "longer story" field that complements
-- the short `bio`. Additive, idempotent.
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS background text;
