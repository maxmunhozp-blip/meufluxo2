import { Project, Section, Task, TaskStatus, Priority, Subtask, TaskMember, Comment, Attachment, ServiceTag } from '@/types/task';
import type { Session } from '@supabase/supabase-js';
import { PlanLimits, PlanType } from '../usePlanLimits';

// ─── Shared Types ───────────────────────────────────────────

export interface Profile {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
}

export interface WorkspaceMember {
  id: string;
  userId: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: 'owner' | 'admin' | 'member';
  acceptedAt: string | null;
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
}

// ─── DB → App Mappers ──────────────────────────────────────

export function mapDbProject(row: any): Project {
  return { id: row.id, name: row.name, color: row.color, workspaceId: row.workspace_id, position: row.position ?? 0 };
}

export function mapDbSection(row: any): Section {
  return { id: row.id, title: row.name, projectId: row.project_id, workspaceId: row.workspace_id, displayMonth: row.display_month || undefined };
}

export function mapDbTask(row: any): Task {
  return {
    id: row.id,
    name: row.title,
    status: row.status as TaskStatus,
    priority: row.priority as Priority | undefined,
    description: row.description || undefined,
    dueDate: row.due_date || undefined,
    assignee: row.assignee || undefined,
    dayPeriod: row.day_period || 'morning',
    recurrenceType: row.recurrence_type || null,
    recurrenceConfig: row.recurrence_config || undefined,
    section: row.section_id,
    projectId: row.project_id,
    rolloverCount: row.rollover_count || 0,
    originalDueDate: row.original_due_date || undefined,
    scheduledDate: row.scheduled_date || undefined,
    workspaceId: row.workspace_id,
    serviceTagId: row.service_tag_id || undefined,
    createdAt: row.created_at || undefined,
    displayMonth: row.display_month || undefined,
    position: row.position ?? 0,
    completedAt: row.completed_at || undefined,
  };
}

// ─── Shared State Deps (passed to domain hooks) ────────────

export interface SharedState {
  session: Session | null;
  activeWorkspaceId: string | null;
  projectsState: Project[];
  sectionsState: Section[];
  tasksState: Task[];
  profilesState: Profile[];
  commentsState: Comment[];
  attachmentsState: Attachment[];
  serviceTagsState: ServiceTag[];
  workspacesState: Workspace[];
  workspaceMembersState: WorkspaceMember[];
  projectMembersState: { projectId: string; userId: string }[];
  setProjectsState: React.Dispatch<React.SetStateAction<Project[]>>;
  setSectionsState: React.Dispatch<React.SetStateAction<Section[]>>;
  setTasksState: React.Dispatch<React.SetStateAction<Task[]>>;
  setProfilesState: React.Dispatch<React.SetStateAction<Profile[]>>;
  setCommentsState: React.Dispatch<React.SetStateAction<Comment[]>>;
  setAttachmentsState: React.Dispatch<React.SetStateAction<Attachment[]>>;
  setServiceTagsState: React.Dispatch<React.SetStateAction<ServiceTag[]>>;
  setWorkspacesState: React.Dispatch<React.SetStateAction<Workspace[]>>;
  setWorkspaceMembersState: React.Dispatch<React.SetStateAction<WorkspaceMember[]>>;
  setProjectMembersState: React.Dispatch<React.SetStateAction<{ projectId: string; userId: string }[]>>;
  setActiveWorkspaceId: React.Dispatch<React.SetStateAction<string | null>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setShowUpgradeModal: React.Dispatch<React.SetStateAction<boolean>>;
  planLimits: {
    plan: PlanType;
    limits: PlanLimits;
    canCreateProject: boolean;
    canCreateTaskInProject: (projectId: string) => boolean;
    canInviteMember: boolean;
    canCreateWorkspace: boolean;
    isPro: boolean;
  };
}
