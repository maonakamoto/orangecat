-- Corrective fixes from the 2026-06-29 audit of the prior session's changes.
-- Idempotent / fresh-box-safe.

-- 1) project_updates INSERT was `WITH CHECK (auth.uid() IS NOT NULL)` on a public-read
--    table → ANY authenticated user could inject fake updates (milestones/donations)
--    into ANY project's public timeline. Scope INSERT to the project's owner.
DROP POLICY IF EXISTS "authenticated can post updates" ON project_updates;
DROP POLICY IF EXISTS "project owner posts updates" ON project_updates;
CREATE POLICY "project owner posts updates" ON project_updates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN actors a ON a.id = p.actor_id
      WHERE p.id = project_id AND a.user_id = auth.uid()
    )
  );

-- 2) The timeline_events.subject_type CHECK (added 20260627000003) predates the
--    `circle` entity (20260628) and omits it, so Cat promoting a circle would
--    insert subject_type='circle' and fail the constraint. Add it.
ALTER TABLE timeline_events DROP CONSTRAINT IF EXISTS timeline_events_subject_type_check;
ALTER TABLE timeline_events ADD CONSTRAINT timeline_events_subject_type_check
  CHECK (subject_type = ANY (ARRAY[
    'profile', 'organization', 'transaction', 'comment', 'achievement', 'system',
    'wallet', 'project', 'product', 'service', 'cause', 'ai_assistant', 'group',
    'circle', 'asset', 'loan', 'investment', 'event', 'research', 'wishlist', 'document'
  ]::text[]));

-- 3) audit_logs INSERT was `WITH CHECK (true)` and auditLog() writes via the
--    user-scoped client → a client could spoof rows with arbitrary user_id. Restrict
--    to the caller's own id (or null for system rows). auditLog already sets
--    user_id to the authenticated user, so legit writes still pass.
DROP POLICY IF EXISTS "append audit rows" ON audit_logs;
DROP POLICY IF EXISTS "append own audit rows" ON audit_logs;
CREATE POLICY "append own audit rows" ON audit_logs FOR INSERT
  WITH CHECK (user_id = auth.uid() OR auth.uid() IS NULL);
