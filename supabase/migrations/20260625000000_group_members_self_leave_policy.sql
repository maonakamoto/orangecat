-- Allow a member to leave a group (delete their OWN membership row).
--
-- The previous DELETE policy (group_members_delete_auth) only permitted
-- founders/admins to delete rows — it was written for the admin "remove
-- member" case and never accounted for self-leave. As a result, a regular
-- member calling leaveGroup() had their DELETE silently filtered by RLS
-- (0 rows affected, no error) — the UI reported success but the membership
-- persisted. This surfaced once the "Leave group" button shipped.
--
-- New rule:
--   * Anyone except a founder may delete their OWN membership (leave).
--   * Founders/admins may delete any membership (remove members).
-- Founders still cannot leave (must transfer ownership or delete the group);
-- the app layer (leaveGroup) and the removeMember founder-guard remain in place.

DROP POLICY IF EXISTS group_members_delete_auth ON public.group_members;

CREATE POLICY group_members_delete_auth ON public.group_members
  FOR DELETE
  TO authenticated
  USING (
    -- Self-leave: members and admins can remove their own row; founders cannot.
    (
      user_id = (SELECT auth.uid())
      AND get_user_group_role(group_id, (SELECT auth.uid())) <> 'founder'
    )
    -- Admin/founder removing any member.
    OR get_user_group_role(group_id, (SELECT auth.uid())) = ANY (ARRAY['founder', 'admin'])
  );
