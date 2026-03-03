import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Task, TaskStatus, Subtask, Priority, TaskMember } from '@/types/task';
import { SharedState, mapDbTask } from './types';

export function useTaskOps(deps: SharedState) {
  const {
    session, activeWorkspaceId, tasksState, profilesState,
    setTasksState, setShowUpgradeModal, planLimits,
  } = deps;

  const createTask = useCallback(async (taskData: Partial<Task> & { name: string; section: string; projectId: string }): Promise<string> => {
    if (!planLimits.canCreateTaskInProject(taskData.projectId)) {
      setShowUpgradeModal(true);
      throw new Error('Limite de tarefas no projeto atingido');
    }
    if (!activeWorkspaceId) throw new Error('Nenhum workspace ativo');
    const position = tasksState.filter(t => t.section === taskData.section && t.projectId === taskData.projectId).length;
    const { data, error } = await supabase.from('tasks').insert({
      title: taskData.name, section_id: taskData.section, project_id: taskData.projectId,
      status: taskData.status || 'pending', priority: taskData.priority || 'low',
      description: taskData.description || null, due_date: taskData.dueDate || null,
      scheduled_date: taskData.scheduledDate || null, assignee: taskData.assignee || null,
      day_period: taskData.dayPeriod || 'morning', service_tag_id: taskData.serviceTagId || null,
      display_month: taskData.displayMonth || null, position,
      created_by: session?.user?.id || null, workspace_id: activeWorkspaceId,
    }).select().single();
    if (error) throw error;
    const task = { ...mapDbTask(data), members: [], subtasks: [] };
    setTasksState(prev => prev.some(x => x.id === task.id) ? prev : [task, ...prev]);
    return task.id;
  }, [tasksState, session, activeWorkspaceId]);

  const updateTask = useCallback(async (task: Task) => {
    const updates: Record<string, any> = {
      title: task.name, status: task.status, priority: task.priority || 'low',
      description: task.description || null, due_date: task.dueDate || null,
      scheduled_date: task.scheduledDate || null, assignee: task.assignee || null,
      section_id: task.section, day_period: task.dayPeriod ?? undefined,
      recurrence_type: task.recurrenceType || null, recurrence_config: (task.recurrenceConfig as any) || null,
      service_tag_id: task.serviceTagId || null, parent_task_id: task.parentTaskId || null,
    };
    if (task.manuallyMoved !== undefined) updates.manually_moved = task.manuallyMoved;
    if (task.displayMonth) updates.display_month = task.displayMonth;
    if (task.position !== undefined) updates.position = task.position;
    await supabase.from('tasks').update(updates).eq('id', task.id);

    if (task.parentTaskId) {
      setTasksState(prev => prev.map(t => {
        if (t.id !== task.parentTaskId) return t;
        return { ...t, subtasks: (t.subtasks || []).map(s => s.id === task.id ? { ...s, ...task } : s) };
      }));
    } else {
      setTasksState(prev => {
        const wasSubtask = prev.some(t => (t.subtasks || []).some(s => s.id === task.id));
        if (wasSubtask) {
          return [...prev.map(t => ({ ...t, subtasks: (t.subtasks || []).filter(s => s.id !== task.id) })), task];
        }
        return prev.map(t => t.id === task.id ? task : t);
      });
    }
  }, []);

  const batchUpdatePositions = useCallback(async (updates: { id: string; position: number }[]) => {
    if (updates.length === 0) return;
    const posMap = new Map(updates.map(u => [u.id, u.position]));
    setTasksState(prev => {
      const updateSubtasks = (subs: Subtask[]): Subtask[] =>
        subs.map(s => ({
          ...s, position: posMap.has(s.id) ? posMap.get(s.id)! : (s as any).position,
          subtasks: s.subtasks ? updateSubtasks(s.subtasks) : undefined,
        }));
      return prev.map(t => ({
        ...t, position: posMap.has(t.id) ? posMap.get(t.id)! : t.position,
        subtasks: t.subtasks ? updateSubtasks(t.subtasks) : t.subtasks,
      }));
    });
    await Promise.all(updates.map(u => supabase.from('tasks').update({ position: u.position }).eq('id', u.id)));
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    await supabase.from('task_members').delete().eq('task_id', id);
    await supabase.from('tasks').delete().eq('id', id);
    setTasksState(prev => prev.filter(t => t.id !== id).map(t => ({
      ...t, subtasks: (t.subtasks || []).filter(s => s.id !== id),
    })));
  }, []);

  const restoreTask = useCallback(async (snapshot: Task) => {
    if (!activeWorkspaceId) return;
    const { error } = await supabase.from('tasks').insert({
      id: snapshot.id, title: snapshot.name, section_id: snapshot.section,
      project_id: snapshot.projectId, status: snapshot.status, priority: snapshot.priority || 'low',
      description: snapshot.description || null, due_date: snapshot.dueDate || null,
      scheduled_date: snapshot.scheduledDate || null, assignee: snapshot.assignee || null,
      day_period: snapshot.dayPeriod || 'morning', service_tag_id: snapshot.serviceTagId || null,
      display_month: snapshot.displayMonth || undefined,
      recurrence_type: snapshot.recurrenceType || null,
      recurrence_config: (snapshot.recurrenceConfig as any) || null,
      parent_task_id: snapshot.parentTaskId || null,
      workspace_id: activeWorkspaceId, created_by: session?.user?.id || null,
    });
    if (error) { console.error('[restoreTask] Insert error:', error.message); return; }
    if (snapshot.members && snapshot.members.length > 0) {
      for (const m of snapshot.members) {
        await supabase.from('task_members').insert({ task_id: snapshot.id, user_id: m.userId });
      }
    }
    if (snapshot.parentTaskId) {
      setTasksState(prev => prev.map(t => {
        if (t.id !== snapshot.parentTaskId) return t;
        const alreadyExists = (t.subtasks || []).some(s => s.id === snapshot.id);
        if (alreadyExists) return t;
        return { ...t, subtasks: [...(t.subtasks || []), snapshot as any] };
      }));
    } else {
      setTasksState(prev => prev.some(t => t.id === snapshot.id) ? prev : [snapshot, ...prev]);
    }
  }, [activeWorkspaceId, session]);

  const updateTaskStatus = useCallback(async (id: string, status: TaskStatus) => {
    await supabase.from('tasks').update({ status }).eq('id', id);
    const completedAt = status === 'done' ? new Date().toISOString() : undefined;
    setTasksState(prev => prev.map(t => {
      if (t.id === id) return { ...t, status, completedAt };
      return {
        ...t, subtasks: (t.subtasks || []).map(s => {
          if (s.id === id) return { ...s, status };
          return { ...s, subtasks: (s.subtasks || []).map(ss => ss.id === id ? { ...ss, status } : ss) };
        }),
      };
    }));
  }, []);

  const duplicateTask = useCallback(async (taskId: string): Promise<string> => {
    const task = tasksState.find(t => t.id === taskId);
    if (!task) throw new Error('Tarefa não encontrada');
    const { data, error } = await supabase.from('tasks').insert({
      title: `${task.name} (cópia)`, section_id: task.section, project_id: task.projectId,
      status: task.status, priority: task.priority || 'low',
      description: task.description || null, due_date: task.dueDate || null,
      scheduled_date: task.scheduledDate || null, assignee: task.assignee || null,
      day_period: task.dayPeriod || 'morning', service_tag_id: task.serviceTagId || null,
      position: task.position + 1, created_by: session?.user?.id || null,
      workspace_id: activeWorkspaceId,
    }).select().single();
    if (error) throw error;
    const newTask = { ...mapDbTask(data), members: [], subtasks: [] };
    setTasksState(prev => prev.some(x => x.id === newTask.id) ? prev : [...prev, newTask]);

    for (const sub of (task.subtasks || [])) {
      const { data: newSub } = await supabase.from('tasks').insert({
        title: sub.name, parent_task_id: data.id, section_id: task.section,
        project_id: task.projectId, status: sub.status, priority: sub.priority || 'low',
        description: sub.description || null, due_date: sub.dueDate || null,
        position: (task.subtasks || []).indexOf(sub), workspace_id: activeWorkspaceId,
      }).select().single();
      if (!newSub) continue;
      for (const sub2 of (sub.subtasks || [])) {
        await supabase.from('tasks').insert({
          title: sub2.name, parent_task_id: newSub.id, section_id: task.section,
          project_id: task.projectId, status: sub2.status, priority: sub2.priority || 'low',
          description: sub2.description || null, due_date: sub2.dueDate || null,
          position: (sub.subtasks || []).indexOf(sub2), workspace_id: activeWorkspaceId,
        });
      }
    }
    toast.success(`Tarefa duplicada com sucesso!`);
    return data.id;
  }, [tasksState, session]);

  // Task member operations
  const addTaskMember = useCallback(async (taskId: string, userId: string) => {
    const { data, error } = await supabase.from('task_members').insert({ task_id: taskId, user_id: userId }).select().single();
    if (error) throw error;
    const profile = profilesState.find(p => p.id === userId);
    const member: TaskMember = { id: data.id, userId: data.user_id, fullName: profile?.fullName || null, avatarUrl: profile?.avatarUrl || null };
    setTasksState(prev => prev.map(t => {
      if (t.id === taskId) return { ...t, members: [...(t.members || []).filter(x => x.userId !== userId), member] };
      const updatedSubs = (t.subtasks || []).map(s =>
        s.id === taskId ? { ...s, members: [...(s.members || []).filter(x => x.userId !== userId), member] } : s
      );
      return { ...t, subtasks: updatedSubs };
    }));
  }, [profilesState]);

  const removeTaskMember = useCallback(async (taskId: string, userId: string) => {
    await supabase.from('task_members').delete().eq('task_id', taskId).eq('user_id', userId);
    setTasksState(prev => prev.map(t => {
      if (t.id === taskId) return { ...t, members: (t.members || []).filter(m => m.userId !== userId) };
      const updatedSubs = (t.subtasks || []).map(s =>
        s.id === taskId ? { ...s, members: (s.members || []).filter(m => m.userId !== userId) } : s
      );
      return { ...t, subtasks: updatedSubs };
    }));
  }, []);

  // Subtask operations
  const addSubtask = useCallback(async (parentTaskId: string, name: string) => {
    let section = '';
    let projectId = '';
    let existingSubtasks: Subtask[] = [];

    const topLevel = tasksState.find(t => t.id === parentTaskId);
    if (topLevel) {
      section = topLevel.section; projectId = topLevel.projectId; existingSubtasks = topLevel.subtasks || [];
    } else {
      for (const t of tasksState) {
        const sub = (t.subtasks || []).find(s => s.id === parentTaskId);
        if (sub) { section = sub.section; projectId = sub.projectId; existingSubtasks = sub.subtasks || []; break; }
      }
    }
    if (!section || !projectId) { console.error('[addSubtask] Could not find parent task:', parentTaskId); return; }

    const position = existingSubtasks.length;
    let parentDepth = 0;
    if (topLevel) {
      parentDepth = topLevel.depth ?? 0;
    } else {
      for (const t of tasksState) {
        const sub = (t.subtasks || []).find(s => s.id === parentTaskId);
        if (sub) { parentDepth = sub.depth ?? 1; break; }
      }
    }
    const newDepth = parentDepth + 1;
    if (newDepth > 3) { toast.error('Profundidade máxima atingida (4 níveis)'); return; }
    try {
      const { data, error } = await supabase.from('tasks').insert({
        title: name, parent_task_id: parentTaskId, section_id: section,
        project_id: projectId, status: 'pending', priority: 'low', position, workspace_id: activeWorkspaceId,
        depth: newDepth,
      }).select().single();
      if (error) { console.error('[addSubtask] Insert error:', error.message); return; }
      const sub: Subtask = {
        id: data.id, name: data.title, status: data.status as TaskStatus,
        priority: data.priority as Priority | undefined,
        description: data.description || undefined, dueDate: data.due_date || undefined,
        section: data.section_id, projectId: data.project_id, parentTaskId: data.parent_task_id,
      };
      setTasksState(prev => prev.map(t => {
        if (t.id === parentTaskId) return { ...t, subtasks: [...(t.subtasks || []).filter(s => s.id !== sub.id), sub] };
        return { ...t, subtasks: (t.subtasks || []).map(s => s.id === parentTaskId ? { ...s, subtasks: [...(s.subtasks || []).filter(ss => ss.id !== sub.id), sub] } : s) };
      }));
    } catch (err) { console.error('[addSubtask] Unexpected error:', err); }
  }, [tasksState, activeWorkspaceId]);

  const updateSubtask = useCallback(async (subtaskId: string, updates: { name?: string; status?: TaskStatus }) => {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.title = updates.name;
    if (updates.status !== undefined) { dbUpdates.status = updates.status; dbUpdates.completed_at = updates.status === 'done' ? new Date().toISOString() : null; }
    await supabase.from('tasks').update(dbUpdates).eq('id', subtaskId);
    setTasksState(prev => prev.map(t => ({
      ...t, subtasks: (t.subtasks || []).map(s => {
        if (s.id === subtaskId) return { ...s, ...(updates.name !== undefined ? { name: updates.name } : {}), ...(updates.status !== undefined ? { status: updates.status } : {}) };
        return { ...s, subtasks: (s.subtasks || []).map(ss => ss.id === subtaskId ? { ...ss, ...(updates.name !== undefined ? { name: updates.name } : {}), ...(updates.status !== undefined ? { status: updates.status } : {}) } : ss) };
      }),
    })));
  }, []);

  const scheduleSubtask = useCallback(async (subtaskId: string, scheduledDate: string | null) => {
    await supabase.from('tasks').update({ scheduled_date: scheduledDate }).eq('id', subtaskId);
    setTasksState(prev => prev.map(t => ({
      ...t, subtasks: (t.subtasks || []).map(s => {
        if (s.id === subtaskId) return { ...s, scheduledDate: scheduledDate || undefined };
        return { ...s, subtasks: (s.subtasks || []).map(ss => ss.id === subtaskId ? { ...ss, scheduledDate: scheduledDate || undefined } : ss) };
      }),
    })));
  }, []);

  const deleteSubtask = useCallback(async (parentTaskId: string, subtaskId: string) => {
    await supabase.from('tasks').delete().eq('id', subtaskId);
    setTasksState(prev => prev.map(t => {
      if (t.id === parentTaskId) return { ...t, subtasks: (t.subtasks || []).filter(s => s.id !== subtaskId) };
      return { ...t, subtasks: (t.subtasks || []).map(s => s.id === parentTaskId ? { ...s, subtasks: (s.subtasks || []).filter(ss => ss.id !== subtaskId) } : s) };
    }));
  }, []);

  const reorderSubtasks = useCallback(async (parentTaskId: string, subtaskIds: string[]) => {
    setTasksState(prev => prev.map(t => {
      if (t.id === parentTaskId) {
        const subs = t.subtasks || [];
        const reordered = subtaskIds.map(id => subs.find(s => s.id === id)).filter(Boolean) as Subtask[];
        return { ...t, subtasks: reordered };
      }
      return { ...t, subtasks: (t.subtasks || []).map(s => {
        if (s.id === parentTaskId) {
          const subs = s.subtasks || [];
          const reordered = subtaskIds.map(id => subs.find(ss => ss.id === id)).filter(Boolean) as Subtask[];
          return { ...s, subtasks: reordered };
        }
        return s;
      }) };
    }));
    await Promise.all(subtaskIds.map((id, idx) => supabase.from('tasks').update({ position: idx }).eq('id', id)));
  }, []);

  const moveTaskToSection = useCallback(async (taskId: string, targetSectionId: string) => {
    await supabase.from('tasks').update({ section_id: targetSectionId }).eq('id', taskId);
    // Move subtasks too
    await supabase.from('tasks').update({ section_id: targetSectionId }).eq('parent_task_id', taskId);
    setTasksState(prev => prev.map(t => {
      if (t.id === taskId) return { ...t, section: targetSectionId };
      if (t.parentTaskId === taskId) return { ...t, section: targetSectionId };
      return t;
    }));
  }, []);

  return {
    createTask, updateTask, batchUpdatePositions,
    deleteTask, restoreTask, duplicateTask, updateTaskStatus,
    addTaskMember, removeTaskMember,
    addSubtask, updateSubtask, scheduleSubtask, deleteSubtask, reorderSubtasks,
    moveTaskToSection,
  };
}
