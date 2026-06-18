-- Fix: group helper functions were hardened with `SET search_path = ''` but
-- their table references were left UNQUALIFIED (`FROM group_members`/`groups`).
-- With an empty search_path those names resolve to nothing, so every call fails
-- with `relation "group_members" does not exist`. These functions are invoked by
-- the RLS policies on the group_* tables, so the failure cascaded: creating a
-- group returned 500 ("relation group_members does not exist") and group reads
-- were broken too. Re-create them with schema-qualified references while keeping
-- the secure empty search_path (the original hardening intent).

CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id uuid, p_user_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id
      AND user_id = p_user_id
  );
$function$;

CREATE OR REPLACE FUNCTION public.get_user_group_role(p_group_id uuid, p_user_id uuid)
  RETURNS text
  LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path TO ''
AS $function$
  SELECT role FROM public.group_members
  WHERE group_id = p_group_id
    AND user_id = p_user_id
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_groups(user_uuid uuid)
  RETURNS TABLE(group_id uuid, group_name text, group_slug text, label text, role text, joined_at timestamptz)
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path TO ''
AS $function$
  SELECT g.id, g.name, g.slug, g.label, gm.role, gm.joined_at
  FROM public.groups g
  JOIN public.group_members gm ON g.id = gm.group_id
  WHERE gm.user_id = user_uuid
  ORDER BY gm.joined_at DESC;
$function$;

-- Founders must be able to (a) read the group they just created and (b) seed the
-- founding membership row. Before this, creating a PRIVATE group 500'd: the
-- groups SELECT policy hid the new row from its own creator (not public, not yet
-- a member) so the insert's RETURNING select failed; and the group_members
-- INSERT policy required you to ALREADY be a founder/admin member to add members,
-- so the founding member could never be inserted (chicken-and-egg). Both policies
-- now also accept the group's created_by.

ALTER POLICY groups_select_auth ON public.groups
  USING (
    (is_public = true)
    OR (created_by = (SELECT auth.uid()))
    OR public.is_group_member(id, (SELECT auth.uid()))
  );

ALTER POLICY group_members_insert_auth ON public.group_members
  WITH CHECK (
    (
      user_id = (SELECT auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.groups g
        WHERE g.id = group_id AND g.created_by = (SELECT auth.uid())
      )
    )
    OR (
      public.is_group_member(group_id, (SELECT auth.uid()))
      AND public.get_user_group_role(group_id, (SELECT auth.uid())) = ANY (ARRAY['founder'::text, 'admin'::text])
    )
  );
