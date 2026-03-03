import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SharedState, mapDbSection } from './types';

export function useSectionOps(deps: SharedState) {
  const { activeWorkspaceId, sectionsState, setSectionsState, setTasksState } = deps;

  const createSection = useCallback(async (title: string, projectId: string, displayMonth?: string): Promise<string> => {
    if (!activeWorkspaceId) throw new Error('Nenhum workspace ativo');
    // Custom sections always go after fixed ones
    const maxPos = sectionsState.filter(s => s.projectId === projectId).reduce((max, s) => {
      const p = (s as any).position ?? 0;
      return p > max ? p : max;
    }, -1);
    const position = maxPos + 1;
    const { data, error } = await supabase.from('sections').insert({
      name: title, project_id: projectId, position, workspace_id: activeWorkspaceId,
      section_type: 'custom', is_fixed: false,
      ...(displayMonth ? { display_month: displayMonth } : {}),
    }).select().single();
    if (error) throw error;
    const section = mapDbSection(data);
    setSectionsState(prev => prev.some(x => x.id === section.id) ? prev : [...prev, section]);
    return section.id;
  }, [sectionsState, activeWorkspaceId]);

  const renameSection = useCallback(async (id: string, title: string) => {
    // Fixed sections cannot be renamed
    const section = sectionsState.find(s => s.id === id);
    if (section?.isFixed) return;
    await supabase.from('sections').update({ name: title }).eq('id', id);
    setSectionsState(prev => prev.map(s => s.id === id ? { ...s, title } : s));
  }, [sectionsState]);

  const deleteSection = useCallback(async (id: string) => {
    // Fixed sections cannot be deleted
    const section = sectionsState.find(s => s.id === id);
    if (section?.isFixed) return;
    await supabase.from('tasks').delete().eq('section_id', id);
    await supabase.from('sections').delete().eq('id', id);
    setSectionsState(prev => prev.filter(s => s.id !== id));
    setTasksState(prev => prev.filter(t => t.section !== id));
  }, [sectionsState]);

  const deleteSectionFromDb = useCallback(async (id: string) => {
    // Fixed sections cannot be deleted
    const section = sectionsState.find(s => s.id === id);
    if (section?.isFixed) return;
    await supabase.from('tasks').delete().eq('section_id', id);
    await supabase.from('sections').delete().eq('id', id);
  }, [sectionsState]);

  return { createSection, renameSection, deleteSection, deleteSectionFromDb };
}
