-- Fix: is_group_member SECURITY DEFINER function was callable by anon role
-- via {public} RLS policies, creating a potential information-disclosure surface.
--
-- Solution: Split permissive RLS policies on group_members and groups into
-- role-specific variants. anon policies use simple EXISTS checks without
-- calling is_group_member, allowing EXECUTE to be revoked from anon.

-- ============================================================
-- group_members policies
-- ============================================================

-- Drop existing permissive policies that targeted {public} (anon + authenticated)
DROP POLICY IF EXISTS "group_members_select_policy" ON public.group_members;
DROP POLICY IF EXISTS "Group members are viewable by everyone" ON public.group_members;
DROP POLICY IF EXISTS "group_members_select" ON public.group_members;

-- anon: can only see members of public groups (no is_group_member call)
CREATE POLICY "group_members_select_anon"
  ON public.group_members
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.groups
      WHERE groups.id = group_members.group_id
        AND groups.is_public = true
    )
  );

-- authenticated: original full logic (own membership OR public group OR is_group_member)
CREATE POLICY "group_members_select_auth"
  ON public.group_members
  FOR SELECT
  TO authenticated
  USING (
    (user_id = (SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.groups
      WHERE groups.id = group_members.group_id
        AND groups.is_public = true
    )
    OR is_group_member(group_id, (SELECT auth.uid()))
  );

-- ============================================================
-- groups policies
-- ============================================================

-- Drop existing permissive policies that targeted {public}
DROP POLICY IF EXISTS "groups_select_policy" ON public.groups;
DROP POLICY IF EXISTS "Groups are viewable by everyone" ON public.groups;
DROP POLICY IF EXISTS "groups_select" ON public.groups;

-- anon: public groups only
CREATE POLICY "groups_select_anon"
  ON public.groups
  FOR SELECT
  TO anon
  USING (is_public = true);

-- authenticated: public groups OR groups the user belongs to
CREATE POLICY "groups_select_auth"
  ON public.groups
  FOR SELECT
  TO authenticated
  USING (
    is_public = true
    OR is_group_member(id, (SELECT auth.uid()))
  );

-- ============================================================
-- Revoke EXECUTE from anon now that no anon policy calls it
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) TO authenticated;
