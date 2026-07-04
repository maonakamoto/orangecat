-- Fix POST /api/notifications/read returning 500 ("Database error").
--
-- Root cause: production has a BEFORE UPDATE trigger on public.notifications
-- that calls set_updated_at() / update_updated_at_column(), but the live
-- notifications schema has read_at (not updated_at). Any UPDATE — including
-- mark-as-read — fails with:
--   record "new" has no field "updated_at" (SQLSTATE 42703)
--
-- The notifications table intentionally tracks read_at only; drop stray
-- updated_at triggers when the column is absent.

DO $$
DECLARE
  trig RECORD;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notifications'
      AND column_name = 'updated_at'
  ) THEN
    RETURN;
  END IF;

  FOR trig IN
    SELECT t.tgname
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_proc p ON p.oid = t.tgfoid
    WHERE n.nspname = 'public'
      AND c.relname = 'notifications'
      AND NOT t.tgisinternal
      AND pg_get_functiondef(p.oid) ILIKE '%updated_at%'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.notifications', trig.tgname);
    RAISE NOTICE 'Dropped notifications trigger % (no updated_at column)', trig.tgname;
  END LOOP;
END $$;
