import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Project } from '@/types/task';
import { SharedState, WorkspaceMember, mapDbProject, mapDbSection, mapDbTask } from './types';
import { ensureFixedSections } from '@/utils/ensureFixedSections';

export function useProjectOps(deps: SharedState) {
  const {
    session, activeWorkspaceId, projectsState, sectionsState, tasksState,
    workspaceMembersState, projectMembersState,
    setProjectsState, setSectionsState, setTasksState, setProjectMembersState,
    setShowUpgradeModal, planLimits,
  } = deps;

  const createProject = useCallback(async (name: string, color: string): Promise<string> => {
    if (!planLimits.canCreateProject) {
      setShowUpgradeModal(true);
      throw new Error('Limite de projetos atingido');
    }
    if (!activeWorkspaceId) throw new Error('Nenhum workspace ativo');
    const { data, error } = await supabase.from('projects').insert({ name, color, workspace_id: activeWorkspaceId }).select().single();
    if (error) throw error;
    const project = mapDbProject(data);
    setProjectsState(prev => prev.some(x => x.id === project.id) ? prev : [...prev, project]);
    // Create 4 fixed sections for the new project
    const fixedSections = await ensureFixedSections(project.id, activeWorkspaceId);
    setSectionsState(prev => {
      const newSections = fixedSections.map(s => mapDbSection(s)).filter(s => !prev.some(x => x.id === s.id));
      return [...prev, ...newSections];
    });
    return project.id;
  }, [activeWorkspaceId]);

  const renameProject = useCallback(async (id: string, name: string) => {
    await supabase.from('projects').update({ name }).eq('id', id);
    setProjectsState(prev => prev.map(p => p.id === id ? { ...p, name } : p));
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    await supabase.from('tasks').delete().eq('project_id', id);
    await supabase.from('sections').delete().eq('project_id', id);
    await supabase.from('projects').delete().eq('id', id);
    setProjectsState(prev => prev.filter(p => p.id !== id));
    setSectionsState(prev => prev.filter(s => s.projectId !== id));
    setTasksState(prev => prev.filter(t => t.projectId !== id));
  }, []);

  const changeProjectColor = useCallback(async (id: string, color: string) => {
    await supabase.from('projects').update({ color }).eq('id', id);
    setProjectsState(prev => prev.map(p => p.id === id ? { ...p, color } : p));
  }, []);

  const reorderProjects = useCallback(async (reordered: Project[]) => {
    setProjectsState(reordered);
    await Promise.all(reordered.map((p, i) =>
      supabase.from('projects').update({ position: i }).eq('id', p.id)
    ));
  }, []);

  const duplicateProject = useCallback(async (projectId: string, mode: 'sections' | 'tasks' | 'both'): Promise<string> => {
    const project = projectsState.find(p => p.id === projectId);
    if (!project) throw new Error('Projeto não encontrado');

    const { data: newProj, error: projErr } = await supabase.from('projects')
      .insert({ name: `${project.name} (cópia)`, color: project.color, workspace_id: activeWorkspaceId })
      .select().single();
    if (projErr) throw projErr;

    const newProjectId = newProj.id;
    setProjectsState(prev => prev.some(x => x.id === newProjectId) ? prev : [...prev, mapDbProject(newProj)]);

    if (mode === 'sections' || mode === 'both') {
      const projSections = sectionsState.filter(s => s.projectId === projectId);
      const sectionIdMap: Record<string, string> = {};

      for (const sec of projSections) {
        const { data: newSec, error: secErr } = await supabase.from('sections')
          .insert({ name: sec.title, project_id: newProjectId, position: projSections.indexOf(sec), workspace_id: activeWorkspaceId })
          .select().single();
        if (secErr) throw secErr;
        sectionIdMap[sec.id] = newSec.id;
        setSectionsState(prev => prev.some(x => x.id === newSec.id) ? prev : [...prev, mapDbSection(newSec)]);
      }

      if (mode === 'both') {
        const projTasks = tasksState.filter(t => t.projectId === projectId && !t.parentTaskId);
        for (const task of projTasks) {
          const newSectionId = sectionIdMap[task.section];
          if (!newSectionId) continue;
          const { data: newTask, error: taskErr } = await supabase.from('tasks').insert({
            title: task.name, section_id: newSectionId, project_id: newProjectId,
            status: task.status, priority: task.priority || 'low',
            description: task.description || null, due_date: task.dueDate || null,
            position: projTasks.indexOf(task), created_by: session?.user?.id || null,
            workspace_id: activeWorkspaceId,
          }).select().single();
          if (taskErr) continue;
          const mappedTask = { ...mapDbTask(newTask), members: [], subtasks: [] };
          setTasksState(prev => prev.some(x => x.id === newTask.id) ? prev : [...prev, mappedTask]);

          for (const sub of (task.subtasks || [])) {
            const { data: newSub } = await supabase.from('tasks').insert({
              title: sub.name, parent_task_id: newTask.id, section_id: newSectionId,
              project_id: newProjectId, status: sub.status, priority: sub.priority || 'low',
              description: sub.description || null, due_date: sub.dueDate || null,
              position: (task.subtasks || []).indexOf(sub), workspace_id: activeWorkspaceId,
            }).select().single();
            if (!newSub) continue;
            for (const sub2 of (sub.subtasks || [])) {
              await supabase.from('tasks').insert({
                title: sub2.name, parent_task_id: newSub.id, section_id: newSectionId,
                project_id: newProjectId, status: sub2.status, priority: sub2.priority || 'low',
                description: sub2.description || null, due_date: sub2.dueDate || null,
                position: (sub.subtasks || []).indexOf(sub2), workspace_id: activeWorkspaceId,
              });
            }
          }
        }
      }
    }

    toast.success(`Projeto "${project.name}" duplicado com sucesso!`);
    return newProjectId;
  }, [projectsState, sectionsState, tasksState, session]);

  const addProjectMember = useCallback(async (projectId: string, userId: string) => {
    const { error } = await supabase.from('project_members').insert({ project_id: projectId, user_id: userId });
    if (error) { toast.error('Erro ao adicionar membro ao projeto'); throw error; }
    setProjectMembersState(prev => [...prev, { projectId, userId }]);
    toast.success('Membro adicionado ao projeto!');
  }, []);

  const removeProjectMember = useCallback(async (projectId: string, userId: string) => {
    const { error } = await supabase.from('project_members').delete().eq('project_id', projectId).eq('user_id', userId);
    if (error) { toast.error('Erro ao remover membro do projeto'); throw error; }
    setProjectMembersState(prev => prev.filter(pm => !(pm.projectId === projectId && pm.userId === userId)));
    toast.success('Membro removido do projeto!');
  }, []);

  const getProjectMembers = useCallback((projectId: string): WorkspaceMember[] => {
    const memberUserIds = new Set(projectMembersState.filter(pm => pm.projectId === projectId).map(pm => pm.userId));
    return workspaceMembersState.filter(wm => memberUserIds.has(wm.userId));
  }, [projectMembersState, workspaceMembersState]);

  return {
    createProject, renameProject, deleteProject, changeProjectColor,
    reorderProjects, duplicateProject,
    addProjectMember, removeProjectMember, getProjectMembers,
  };
}
