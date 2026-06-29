/**
 * Project collaborator-roles service.
 *
 * Backs the /collaborate board and the project-roles API. RLS enforces ownership
 * (public read of OPEN roles; owner-only write), and we ALSO check ownership in
 * code for clean error messages. project_roles isn't in the hand-written Database
 * type, so we use the codebase's loose AnySupabaseClient (as elsewhere).
 */
import { createServerClient } from '@/lib/supabase/server';
import { getTableName } from '@/config/entity-registry';
import { DATABASE_TABLES } from '@/config/database-tables';
import type { AnySupabaseClient } from '@/lib/supabase/types';
import {
  isEngagementType,
  type EngagementType,
  type RoleStatus,
  MAX_ROLE_TITLE,
  MAX_ROLE_DESCRIPTION,
  MAX_ROLE_SKILLS,
} from '@/config/project-roles';

async function db(): Promise<AnySupabaseClient> {
  return (await createServerClient()) as unknown as AnySupabaseClient;
}

export class RoleForbiddenError extends Error {}
export class RoleValidationError extends Error {}

export interface ProjectRoleProject {
  id: string;
  title: string;
  user_id: string; // owner — used to open a DM on "I'm interested"
  status: string;
}

export interface ProjectRole {
  id: string;
  project_id: string;
  role_title: string;
  skills: string[];
  engagement_type: EngagementType;
  description: string | null;
  status: RoleStatus;
  created_at: string;
  projects?: ProjectRoleProject | null;
}

const SELECT =
  'id, project_id, role_title, skills, engagement_type, description, status, created_at, projects(id, title, user_id, status)';

export interface ListFilters {
  skill?: string;
  engagementType?: EngagementType;
}

/** Public collaborator board — open roles across all projects, newest first. */
export async function listOpenRoles(filters: ListFilters = {}): Promise<ProjectRole[]> {
  let q = (await db())
    .from(DATABASE_TABLES.PROJECT_ROLES)
    .select(SELECT)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(100);
  if (filters.engagementType) {
    q = q.eq('engagement_type', filters.engagementType);
  }
  if (filters.skill) {
    q = q.contains('skills', [filters.skill]);
  }
  const { data, error } = await q;
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as unknown as ProjectRole[];
}

/** All roles for one project (owner sees all statuses via RLS; others see open). */
export async function getRolesForProject(projectId: string): Promise<ProjectRole[]> {
  const { data, error } = await (await db())
    .from(DATABASE_TABLES.PROJECT_ROLES)
    .select(SELECT)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as unknown as ProjectRole[];
}

export interface CreateRoleInput {
  projectId: string;
  roleTitle: string;
  skills?: string[];
  engagementType?: string;
  description?: string | null;
}

export async function createRole(input: CreateRoleInput, userId: string): Promise<ProjectRole> {
  const roleTitle = (input.roleTitle ?? '').trim();
  if (!roleTitle || roleTitle.length > MAX_ROLE_TITLE) {
    throw new RoleValidationError(`role_title is required (max ${MAX_ROLE_TITLE} chars)`);
  }
  if (input.description && input.description.length > MAX_ROLE_DESCRIPTION) {
    throw new RoleValidationError(`description too long (max ${MAX_ROLE_DESCRIPTION} chars)`);
  }
  const engagementType = input.engagementType ?? 'contribution';
  if (!isEngagementType(engagementType)) {
    throw new RoleValidationError('invalid engagement_type');
  }
  const skills = (input.skills ?? [])
    .map(s => String(s).trim())
    .filter(Boolean)
    .slice(0, MAX_ROLE_SKILLS);

  const sb = await db();
  // App-layer ownership check (RLS is the backstop).
  const { data: project } = await sb
    .from(getTableName('project'))
    .select('id, user_id')
    .eq('id', input.projectId)
    .maybeSingle();
  if (!project) {
    throw new RoleValidationError('project not found');
  }
  if (project.user_id !== userId) {
    throw new RoleForbiddenError('you do not own this project');
  }

  const { data, error } = await sb
    .from(DATABASE_TABLES.PROJECT_ROLES)
    .insert({
      project_id: input.projectId,
      role_title: roleTitle,
      skills,
      engagement_type: engagementType,
      description: input.description?.trim() || null,
    })
    .select(SELECT)
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data as unknown as ProjectRole;
}

export async function updateRoleStatus(
  roleId: string,
  status: RoleStatus,
  userId: string
): Promise<ProjectRole> {
  const sb = await db();
  const { data: role } = await sb
    .from(DATABASE_TABLES.PROJECT_ROLES)
    .select('id, project_id, projects(user_id)')
    .eq('id', roleId)
    .maybeSingle();
  if (!role) {
    throw new RoleValidationError('role not found');
  }
  if ((role.projects as unknown as { user_id?: string } | null)?.user_id !== userId) {
    throw new RoleForbiddenError('you do not own this role');
  }

  const { data, error } = await sb
    .from(DATABASE_TABLES.PROJECT_ROLES)
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', roleId)
    .select(SELECT)
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data as unknown as ProjectRole;
}
