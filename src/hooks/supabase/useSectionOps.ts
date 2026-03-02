import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SharedState, mapDbSection } from './types';

export function useSectionOps(deps: SharedState) {
  const { activeWorkspaceId, sectionsState, setSectionsState, setTasksState } = deps;

  const createSection = useCallback(async (title: string, projectId: string, displayMonth?: string): Promise<string> => {
    if (!activeWorkspaceId) throw new Error('Nenhum workspace ativo');
    const position = sectionsState.filter(s => s.projectId === projectId).length;
    const { data, error } = await supabase.from('sections').insert({
      name: title, project_id: projectId, position, workspace_id: activeWorkspaceId,
      ...(displayMonth ? { display_month: displayMonth } : {}),
    }).select().single();
    if (error) throw error;
    const section = mapDbSection(data);
    setSectionsState(prev => prev.some(x => x.id === section.id) ? prev : [...prev, section]);
    return section.id;
  }, [sectionsState, activeWorkspaceId]);

  const renameSection = useCallback(async (id: string, title: string) => {
    await supabase.from('sections').update({ name: title }).eq('id', id);
    setSectionsState(prev => prev.map(s => s.id === id ? { ...s, title } : s));
  }, []);

  const deleteSection = useCallback(async (id: string) => {
    await supabase.from('tasks').delete().eq('section_id', id);
    await supabase.from('sections').delete().eq('id', id);
    setSectionsState(prev => prev.filter(s => s.id !== id));
    setTasksState(prev => prev.filter(t => t.section !== id));
  }, []);

  const deleteSectionFromDb = useCallback(async (id: string) => {
    await supabase.from('tasks').delete().eq('section_id', id);
    await supabase.from('sections').delete().eq('id', id);
  }, []);

  return { createSection, renameSection, deleteSection, deleteSectionFromDb };
}
