import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ServiceTag, Section, Task } from '@/types/task';
import { SharedState } from './types';

export function useServiceTagOps(deps: SharedState) {
  const { activeWorkspaceId, serviceTagsState, sectionsState, tasksState, setServiceTagsState, setTasksState } = deps;

  const createServiceTag = useCallback(async (name: string, icon: string) => {
    if (!activeWorkspaceId) return;
    const position = serviceTagsState.length;
    const { data, error } = await supabase.from('service_tags').insert({
      name, icon, workspace_id: activeWorkspaceId, position,
    }).select().single();
    if (error) { toast.error('Erro ao criar tag'); return; }
    setServiceTagsState(prev => [...prev, { id: data.id, name: data.name, icon: data.icon, workspaceId: data.workspace_id, position: data.position }]);
  }, [activeWorkspaceId, serviceTagsState]);

  const renameServiceTag = useCallback(async (id: string, name: string) => {
    await supabase.from('service_tags').update({ name }).eq('id', id);
    setServiceTagsState(prev => prev.map(t => t.id === id ? { ...t, name } : t));
  }, []);

  const changeServiceTagIcon = useCallback(async (id: string, icon: string) => {
    await supabase.from('service_tags').update({ icon }).eq('id', id);
    setServiceTagsState(prev => prev.map(t => t.id === id ? { ...t, icon } : t));
  }, []);

  const deleteServiceTag = useCallback(async (id: string) => {
    await supabase.from('tasks').update({ service_tag_id: null }).eq('service_tag_id', id);
    await supabase.from('service_tags').delete().eq('id', id);
    setServiceTagsState(prev => prev.filter(t => t.id !== id));
    setTasksState(prev => prev.map(t => t.serviceTagId === id ? { ...t, serviceTagId: undefined } : t));
  }, []);

  const autoTagTask = useCallback(async (taskId: string, taskName: string, sectionId: string) => {
    try {
      if (serviceTagsState.length === 0) return;
      const existing = tasksState.find(t => t.id === taskId)
        || tasksState.flatMap(t => t.subtasks || []).find(s => s.id === taskId);
      if (existing?.serviceTagId) return;

      const section = sectionsState.find(s => s.id === sectionId);
      const sectionName = section?.title || '';

      const { data, error } = await supabase.functions.invoke('auto-service-tag', {
        body: {
          taskName, sectionName,
          serviceTags: serviceTagsState.map(t => ({ id: t.id, name: t.name })),
        },
      });
      if (error || !data?.serviceTagId) return;

      await supabase.from('tasks').update({ service_tag_id: data.serviceTagId }).eq('id', taskId);
      setTasksState(prev => prev.map(t => {
        if (t.id === taskId) return { ...t, serviceTagId: data.serviceTagId };
        if (t.subtasks?.some(s => s.id === taskId)) {
          return { ...t, subtasks: t.subtasks.map(s => s.id === taskId ? { ...s, serviceTagId: data.serviceTagId } : s) };
        }
        return t;
      }));
    } catch (e) {
      console.warn('Auto-tag failed:', e);
    }
  }, [serviceTagsState, sectionsState, tasksState]);

  return { createServiceTag, renameServiceTag, changeServiceTagIcon, deleteServiceTag, autoTagTask };
}
