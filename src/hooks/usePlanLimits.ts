import { useMemo } from 'react';
import type { Workspace, WorkspaceMember } from '@/hooks/useSupabaseData';
import type { Project, Task } from '@/types/task';

export type PlanType = 'free' | 'pro';

export interface PlanLimits {
  maxWorkspaces: number | null; // null = unlimited
  maxProjects: number | null;
  maxTasksPerProject: number | null;
  maxMembers: number | null;
  timeline: boolean;
  recurrence: boolean;
  rollover: boolean;
}

const FREE_LIMITS: PlanLimits = {
  maxWorkspaces: 1,
  maxProjects: 3,
  maxTasksPerProject: 20,
  maxMembers: 2,
  timeline: false,
  recurrence: false,
  rollover: false,
};

const PRO_LIMITS: PlanLimits = {
  maxWorkspaces: null,
  maxProjects: null,
  maxTasksPerProject: null,
  maxMembers: null,
  timeline: true,
  recurrence: true,
  rollover: true,
};

export function getLimits(plan: PlanType): PlanLimits {
  return plan === 'pro' ? PRO_LIMITS : FREE_LIMITS;
}

export function usePlanLimits(
  workspaces: Workspace[],
  activeWorkspaceId: string | null,
  projects: Project[],
  tasks: Task[],
  members: WorkspaceMember[],
) {
  const activeWs = workspaces.find(w => w.id === activeWorkspaceId);
  // Default to 'free' if plan field missing
  const plan: PlanType = (activeWs as any)?.plan === 'pro' ? 'pro' : 'free';
  const limits = getLimits(plan);

  const canCreateProject = useMemo(() => {
    if (limits.maxProjects === null) return true;
    // Filter projects in current workspace
    const wsProjects = projects.filter(p => p.workspaceId === activeWorkspaceId);
    return wsProjects.length < limits.maxProjects;
  }, [projects, activeWorkspaceId, limits.maxProjects]);

  const canCreateTaskInProject = useMemo(() => {
    if (limits.maxTasksPerProject === null) return () => true;
    const max = limits.maxTasksPerProject;
    return (projectId: string) => {
      const count = tasks.filter(t => t.projectId === projectId).length;
      return count < max;
    };
  }, [tasks, limits.maxTasksPerProject]);

  const canInviteMember = useMemo(() => {
    if (limits.maxMembers === null) return true;
    return members.length < limits.maxMembers;
  }, [members.length, limits.maxMembers]);

  const canCreateWorkspace = useMemo(() => {
    if (limits.maxWorkspaces === null) return true;
    const owned = workspaces.filter(w => w.ownerId === (activeWs as any)?.ownerId).length;
    return owned < limits.maxWorkspaces;
  }, [workspaces, limits.maxWorkspaces, activeWs]);

  return {
    plan,
    limits,
    canCreateProject,
    canCreateTaskInProject,
    canInviteMember,
    canCreateWorkspace,
    isPro: plan === 'pro',
  };
}
