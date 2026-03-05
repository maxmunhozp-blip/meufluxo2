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
      supabase.from('projects').select('*').eq('workspace_id', workspaceId).eq('archived', false).order('position').order('created_at'),
      supabase.from('sections').select('*').eq('workspace_id', workspaceId).order('position'),
      supabase.from('tasks').select('*').eq('workspace_id', workspaceId).is('parent_task_id', null).order('position'),
      supabase.from('tasks').select('*').eq('workspace_id', workspaceId).not('parent_task_id', 'is', null).order('position'),
    ]).then(([projectsRes, sectionsRes, tasksRes, subtasksRes]) => {
      setProjectsState((projectsRes.data || []).map(mapDbProject));
      setSectionsState((sectionsRes.data || []).map(mapDbSection));
      const mappedTasks = (tasksRes.data || []).map(mapDbTask);
      const mappedSubtasks = (subtasksRes.data || []).map(mapDbTask);
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

  const createWorkspace = useCallback(async (name: string, clientsLabel?: string): Promise<string> => {
    if (!planLimits.canCreateWorkspace) {
      setShowUpgradeModal(true);
      throw new Error('Limite de workspaces atingido');
    }
    if (!session) throw new Error('Não autenticado');
    const insertData: any = { name, owner_id: session.user.id };
    if (clientsLabel !== undefined) insertData.clients_label = clientsLabel || 'Clientes';
    const { data, error } = await supabase.from('workspaces').insert(insertData).select().single();
    if (error) { toast.error('Erro ao criar workspace'); throw error; }
    await supabase.from('workspace_members').insert({
      workspace_id: data.id, user_id: session.user.id, role: 'owner', accepted_at: new Date().toISOString(),
    });
    const newWs: Workspace = { id: data.id, name: data.name, ownerId: data.owner_id, clientsLabel: (data as any).clients_label || 'Clientes' };
    setWorkspacesState(prev => [...prev, newWs]);
    toast.success('Workspace criado!');
    switchWorkspace(data.id);
    return data.id;
  }, [session]);

  const renameWorkspace = useCallback(async (id: string, name: string) => {
    const { error } = await supabase.from('workspaces').update({ name }).eq('id', id);
    if (error) { toast.error('Erro ao renomear workspace'); throw error; }
    setWorkspacesState(prev => prev.map(w => w.id === id ? { ...w, name } : w));
    toast.success('Workspace renomeado!');
  }, []);

  const updateClientsLabel = useCallback(async (id: string, label: string) => {
    const { error } = await supabase.from('workspaces').update({ clients_label: label || 'Clientes' } as any).eq('id', id);
    if (error) { toast.error('Erro ao atualizar rótulo'); throw error; }
    setWorkspacesState(prev => prev.map(w => w.id === id ? { ...w, clientsLabel: label || 'Clientes' } : w));
    toast.success('Rótulo atualizado!');
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
    updateClientsLabel,
    deleteWorkspace,
  };
}
