import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SharedState, Workspace, mapDbProject, mapDbSection, mapDbTask } from './types';
import type { Task } from '@/types/task';

export function useWorkspaceOps(deps: SharedState) {
  const {
    session, activeWorkspaceId, workspacesState, workspaceMembersState, projectMembersState,
    setWorkspacesState, setWorkspaceMembersState, setProjectsState, setSectionsState,
    setTasksState, setActiveWorkspaceId, setLoading, setShowUpgradeModal, planLimits,
  } = deps;

  const switchWorkspace = useCallback((workspaceId: string) => {
    setActiveWorkspaceId(workspaceId);
    setLoading(true);
    Promise.all([
      supabase.from('projects').select('*').eq('archived', false).order('position').order('created_at'),
      supabase.from('sections').select('*').order('position'),
      supabase.from('tasks').select('*').is('parent_task_id', null).order('position'),
      supabase.from('tasks').select('*').not('parent_task_id', 'is', null).order('position'),
    ]).then(([projectsRes, sectionsRes, tasksRes, subtasksRes]) => {
      const wsProjects = (projectsRes.data || []).filter((p: any) => p.workspace_id === workspaceId);
      setProjectsState(wsProjects.map(mapDbProject));
      const wsSections = (sectionsRes.data || []).filter((s: any) => s.workspace_id === workspaceId);
      setSectionsState(wsSections.map(mapDbSection));
      const wsTasks = (tasksRes.data || []).filter((t: any) => t.workspace_id === workspaceId);
      const wsSubtasks = (subtasksRes.data || []).filter((t: any) => t.workspace_id === workspaceId);
      const mappedTasks = wsTasks.map(mapDbTask);
      const mappedSubtasks = wsSubtasks.map(mapDbTask);
      const taskMap = new Map<string, Task>();
      mappedTasks.forEach(t => taskMap.set(t.id, { ...t, subtasks: [], members: [] }));
      mappedSubtasks.forEach(sub => {
        const parentId = (subtasksRes.data || []).find((r: any) => r.id === sub.id)?.parent_task_id;
        if (parentId) {
          const parent = taskMap.get(parentId);
          if (parent) parent.subtasks = [...(parent.subtasks || []), sub as any];
        }
      });
      setTasksState(Array.from(taskMap.values()));
      setLoading(false);
    });
  }, []);

  const inviteToWorkspace = useCallback(async (email: string) => {
    if (!planLimits.canInviteMember) {
      setShowUpgradeModal(true);
      throw new Error('Limite de membros atingido');
    }
    if (!activeWorkspaceId || !session) throw new Error('Nenhum workspace ativo');
    const { data, error } = await supabase.functions.invoke('invite-member', {
      body: { email, workspace_id: activeWorkspaceId },
    });
    if (error) { toast.error('Erro ao convidar membro'); throw error; }
    if (data?.error) { toast.error(data.error); return; }
    if (data?.member) {
      const m = data.member;
      setWorkspaceMembersState(prev => [...prev.filter(x => x.userId !== m.userId), {
        id: m.id, userId: m.userId, fullName: m.fullName, avatarUrl: m.avatarUrl,
        role: m.role, acceptedAt: m.acceptedAt,
      }]);
    }
    toast.success('Convite enviado com sucesso!');
  }, [activeWorkspaceId, session]);

  const generateInviteLink = useCallback(async (): Promise<string> => {
    if (!activeWorkspaceId || !session) throw new Error('Nenhum workspace ativo');
    const inviteCode = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    const { error } = await supabase
      .from('workspace_invites' as any)
      .insert({ workspace_id: activeWorkspaceId, invite_code: inviteCode, created_by: session.user.id });
    if (error) { toast.error('Erro ao gerar link de convite'); throw error; }
    return `${window.location.origin}/invite/${inviteCode}`;
  }, [activeWorkspaceId, session]);

  const acceptWorkspaceInvite = useCallback(async (workspaceId: string) => {
    if (!session) return;
    await supabase
      .from('workspace_members')
      .update({ accepted_at: new Date().toISOString() })
      .eq('workspace_id', workspaceId)
      .eq('user_id', session.user.id);
    toast.success('Convite aceito!');
    switchWorkspace(workspaceId);
  }, [session, switchWorkspace]);

  const createWorkspace = useCallback(async (name: string): Promise<string> => {
    if (!planLimits.canCreateWorkspace) {
      setShowUpgradeModal(true);
      throw new Error('Limite de workspaces atingido');
    }
    if (!session) throw new Error('Não autenticado');
    const { data, error } = await supabase.from('workspaces').insert({ name, owner_id: session.user.id }).select().single();
    if (error) { toast.error('Erro ao criar workspace'); throw error; }
    await supabase.from('workspace_members').insert({
      workspace_id: data.id, user_id: session.user.id, role: 'owner', accepted_at: new Date().toISOString(),
    });
    const newWs: Workspace = { id: data.id, name: data.name, ownerId: data.owner_id };
    setWorkspacesState(prev => [...prev, newWs]);
    toast.success('Workspace criado!');
    // Switch to the new workspace to load its (empty) data properly
    switchWorkspace(data.id);
    return data.id;
  }, [session]);

  const renameWorkspace = useCallback(async (id: string, name: string) => {
    const { error } = await supabase.from('workspaces').update({ name }).eq('id', id);
    if (error) { toast.error('Erro ao renomear workspace'); throw error; }
    setWorkspacesState(prev => prev.map(w => w.id === id ? { ...w, name } : w));
    toast.success('Workspace renomeado!');
  }, []);

  const deleteWorkspace = useCallback(async (id: string) => {
    if (workspacesState.length <= 1) { toast.error('Você precisa ter ao menos um workspace.'); return; }
    const { error } = await supabase.from('workspaces').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir workspace'); throw error; }
    setWorkspacesState(prev => prev.filter(w => w.id !== id));
    if (activeWorkspaceId === id) {
      const remaining = workspacesState.filter(w => w.id !== id);
      if (remaining.length > 0) switchWorkspace(remaining[0].id);
    }
    toast.success('Workspace excluído!');
  }, [workspacesState, activeWorkspaceId, switchWorkspace]);

  return {
    switchWorkspace,
    inviteToWorkspace,
    generateInviteLink,
    acceptWorkspaceInvite,
    createWorkspace,
    renameWorkspace,
    deleteWorkspace,
  };
}
