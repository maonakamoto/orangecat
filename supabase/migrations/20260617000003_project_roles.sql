-- ============================================================================
-- project_roles — "looking for collaborators" board.
--
-- The one genuinely-missing collaboration primitive: a project can declare open
-- roles ("need a backend dev / designer / cofounder") with required skills and an
-- engagement type. Open roles are publicly browsable (a cross-project collaborator
-- board); only the project owner can post/manage them.
--
-- Ownership is by projects.user_id (verified = auth user, 5/5). RLS enforces it.
-- ============================================================================

create table if not exists public.project_roles (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  role_title text not null,
  skills text[] not null default '{}',
  -- paid | equity | revenue_share | contribution | volunteer (see config/project-roles.ts)
  engagement_type text not null default 'contribution',
  description text,
  -- open | filled | closed
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_roles_status_idx on public.project_roles (status);
create index if not exists project_roles_project_idx on public.project_roles (project_id);

alter table public.project_roles enable row level security;

-- Read: anyone may see OPEN roles (the public board); owners see all their roles.
create policy project_roles_read on public.project_roles
  for select
  using (
    status = 'open'
    or exists (
      select 1 from public.projects p
      where p.id = project_roles.project_id and p.user_id = auth.uid()
    )
  );

-- Write (insert/update/delete): only the owning project's user.
create policy project_roles_write on public.project_roles
  for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_roles.project_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_roles.project_id and p.user_id = auth.uid()
    )
  );
