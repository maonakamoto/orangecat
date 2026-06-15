-- =============================================
-- ALIGN notifications TABLE TO THE LIVE SCHEMA
--
-- Background: the original migration (20260106000001_create_notifications_system)
-- created the table with columns `recipient_user_id`, `read`, `title`, and
-- `source_*`. Production diverged from this — the live table actually uses
-- `user_id`, `is_read`, a NOT NULL `message`, and folds title + source ids into
-- `metadata`. Migrations could therefore never rebuild prod, and generated
-- types/consumers drifted (some used user_id/is_read, others recipient_user_id/read).
--
-- This migration makes the migration history converge on the LIVE schema so a
-- fresh build (local reset / self-hosted restore-from-migrations) produces the
-- same shape prod already has. It is fully guarded: on a DB already in the live
-- shape (i.e. production) every step is a no-op.
--
-- Renaming a column automatically rewrites dependent indexes and RLS policy
-- expressions, so the indexes/policies from the original migration follow along.
-- =============================================

-- 1. recipient_user_id -> user_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'notifications'
               AND column_name = 'recipient_user_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'notifications'
               AND column_name = 'user_id') THEN
    ALTER TABLE public.notifications RENAME COLUMN recipient_user_id TO user_id;
  END IF;
END $$;

-- 2. read -> is_read
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'notifications'
               AND column_name = 'read')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'notifications'
               AND column_name = 'is_read') THEN
    ALTER TABLE public.notifications RENAME COLUMN read TO is_read;
  END IF;
END $$;

-- 3. Fold title + source_* into metadata, then drop those columns.
DO $$
BEGIN
  -- title -> metadata.title
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'notifications'
               AND column_name = 'title') THEN
    UPDATE public.notifications
      SET metadata = COALESCE(metadata, '{}'::jsonb)
                     || jsonb_build_object('title', title)
      WHERE title IS NOT NULL;
    -- message is NOT NULL in the live schema; backfill from title where empty.
    UPDATE public.notifications
      SET message = title
      WHERE message IS NULL AND title IS NOT NULL;
    ALTER TABLE public.notifications DROP COLUMN title;
  END IF;

  -- source_actor_id -> metadata.source_actor_id
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'notifications'
               AND column_name = 'source_actor_id') THEN
    UPDATE public.notifications
      SET metadata = COALESCE(metadata, '{}'::jsonb)
                     || jsonb_build_object('source_actor_id', source_actor_id)
      WHERE source_actor_id IS NOT NULL;
    ALTER TABLE public.notifications DROP COLUMN source_actor_id;
  END IF;

  -- source_entity_type -> metadata.source_entity_type
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'notifications'
               AND column_name = 'source_entity_type') THEN
    UPDATE public.notifications
      SET metadata = COALESCE(metadata, '{}'::jsonb)
                     || jsonb_build_object('source_entity_type', source_entity_type)
      WHERE source_entity_type IS NOT NULL;
    ALTER TABLE public.notifications DROP COLUMN source_entity_type;
  END IF;

  -- source_entity_id -> metadata.source_entity_id
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'notifications'
               AND column_name = 'source_entity_id') THEN
    UPDATE public.notifications
      SET metadata = COALESCE(metadata, '{}'::jsonb)
                     || jsonb_build_object('source_entity_id', source_entity_id)
      WHERE source_entity_id IS NOT NULL;
    ALTER TABLE public.notifications DROP COLUMN source_entity_id;
  END IF;
END $$;

-- 4. Enforce live NOT NULL constraints (message + metadata).
DO $$
BEGIN
  -- Guarantee no NULL message rows remain before tightening the constraint.
  UPDATE public.notifications SET message = '' WHERE message IS NULL;
  ALTER TABLE public.notifications ALTER COLUMN message SET NOT NULL;

  UPDATE public.notifications SET metadata = '{}'::jsonb WHERE metadata IS NULL;
  ALTER TABLE public.notifications ALTER COLUMN metadata SET DEFAULT '{}'::jsonb;
  ALTER TABLE public.notifications ALTER COLUMN metadata SET NOT NULL;

  ALTER TABLE public.notifications ALTER COLUMN is_read SET DEFAULT false;
  UPDATE public.notifications SET is_read = false WHERE is_read IS NULL;
  ALTER TABLE public.notifications ALTER COLUMN is_read SET NOT NULL;
END $$;

-- 5. Ensure the unread index matches the live column names.
DROP INDEX IF EXISTS idx_notifications_unread;
CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON public.notifications (user_id, is_read) WHERE is_read = false;
