-- Group member lists failed on every group page with PostgREST PGRST200:
--   "Could not find a relationship between 'group_members' and 'user_id'"
-- The members query embeds the member's profile via `profiles:user_id(...)`, which
-- PostgREST can only resolve through a foreign key — but group_members had FKs only on
-- group_id and invited_by, never on user_id. Every other table that embeds a profile
-- this way (ai_assistants, conversation_participants, loans, follows, …) FKs its user
-- column to profiles(id); group_members was the lone exception.
--
-- Add the missing FK (0 orphan rows verified — every member already has a profile).
-- profiles.id == auth.uid, so this is the same target those other tables use.

ALTER TABLE public.group_members
  ADD CONSTRAINT group_members_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- PostgREST caches the schema; tell it to reload so the new relationship is usable
-- immediately (otherwise the embed keeps 400ing until the next reload).
NOTIFY pgrst, 'reload schema';
