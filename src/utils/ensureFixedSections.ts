import { supabase } from '@/integrations/supabase/client';

interface Section {
  id: string;
  name: string;
  project_id: string;
  workspace_id: string;
  position: number;
  section_type: string;
  is_fixed: boolean;
}

const FIXED_SECTIONS = [
  { name: 'Entrada', section_type: 'inbox', position: 0 },
  { name: 'Recorrente', section_type: 'recurring', position: 1 },
  { name: 'Pontual', section_type: 'one_time', position: 2 },
  { name: 'Concluído', section_type: 'completed', position: 3 },
] as const;

/**
 * Ensures the 4 fixed sections exist in the given project.
 * Idempotent — safe to call multiple times.
 * Checks by section_type, never by name.
 */
export async function ensureFixedSections(
  projectId: string,
  workspaceId: string
): Promise<Section[]> {
  // 1. Fetch existing fixed sections
  const { data: existingFixed, error: fetchError } = await supabase
    .from('sections')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_fixed', true);

  if (fetchError) {
    console.error('Error fetching fixed sections:', fetchError);
    throw fetchError;
  }

  const existingByType = new Map((existingFixed || []).map(s => [s.section_type, s]));
  const result: Section[] = [];

  // 2. Create missing fixed sections
  for (const def of FIXED_SECTIONS) {
    const existing = existingByType.get(def.section_type);
    if (existing) {
      // Fix position if wrong
      if (existing.position !== def.position) {
        await supabase.from('sections').update({ position: def.position }).eq('id', existing.id);
        existing.position = def.position;
      }
      result.push(existing as Section);
    } else {
      const { data: newSection, error: insertError } = await supabase
        .from('sections')
        .insert({
          name: def.name,
          section_type: def.section_type,
          is_fixed: true,
          position: def.position,
          project_id: projectId,
          workspace_id: workspaceId,
        })
        .select()
        .single();

      if (insertError) {
        console.error(`Error creating fixed section ${def.name}:`, insertError);
        throw insertError;
      }
      result.push(newSection as Section);
    }
  }

  // 3. Push custom sections to position >= 4
  const { data: customSections } = await supabase
    .from('sections')
    .select('id, position')
    .eq('project_id', projectId)
    .eq('is_fixed', false)
    .order('position');

  if (customSections && customSections.length > 0) {
    for (let i = 0; i < customSections.length; i++) {
      const newPos = FIXED_SECTIONS.length + i;
      if (customSections[i].position !== newPos) {
        await supabase.from('sections').update({ position: newPos }).eq('id', customSections[i].id);
      }
    }
  }

  return result;
}
