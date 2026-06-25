-- Cache of a user's PUBLIC GitHub repositories, so Cat can know "the user's
-- GitHub projects" without hitting the GitHub API on every chat message.
--
-- Public data only (fetched by GitHub handle from profiles.social_links). The
-- fetcher refreshes lazily on a TTL; this table is the read source on the Cat
-- hot path. One row per user.

CREATE TABLE IF NOT EXISTS public.github_repo_cache (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  handle     text NOT NULL,
  repos      jsonb NOT NULL DEFAULT '[]'::jsonb,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.github_repo_cache ENABLE ROW LEVEL SECURITY;

-- Owner-scoped: a user reads/writes only their own cache row (the Cat context
-- builder runs as the authenticated user).
DROP POLICY IF EXISTS github_repo_cache_owner ON public.github_repo_cache;
CREATE POLICY github_repo_cache_owner ON public.github_repo_cache
  FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
