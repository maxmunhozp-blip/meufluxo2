import { supabase } from '@/integrations/supabase/client';

interface Section {
  id: string;
  name: string;
  project_id: string;
  workspace_id: string;
  position: number;
  section_type: string | null;
}

const DEFAULT_SECTIONS = [
  { name: 'Recorrente', section_type: 'recurrent', position: 0 },
  { name: 'Em andamento', section_type: 'active', position: 1 },
  { name: 'Entrada', section_type: 'inbox', position: 2 },
];

/**
 * Creates the 3 default sections for a new project.
 * Only called on project creation — does NOT retroactively modify existing projects.
 */
export async function ensureDefaultSections(
  projectId: string,
  workspaceId: string
): Promise<Section[]> {
  const rows = DEFAULT_SECTIONS.map(s => ({
    name: s.name,
    section_type: s.section_type,
    position: s.position,
    project_id: projectId,
    workspace_id: workspaceId,
  }));

  const { data, error } = await (supabase as any)
    .from('sections')
    .insert(rows)
    .select();

  if (error) {
    console.error('Error creating default sections:', error);
    throw error;
  }

  return (data as Section[]) || [];
}

/**
 * Ensures an "Entrada" (inbox) section exists for a project.
 * Used when moving tasks between projects — finds or creates an inbox section.
 */
export async function ensureInboxSection(
  projectId: string,
  workspaceId: string
): Promise<Section> {
  // Check for existing inbox section (by type or name)
  const { data: existing } = await (supabase as any)
    .from('sections')
    .select('*')
    .eq('project_id', projectId)
    .or('section_type.eq.inbox,name.eq.Entrada')
    .limit(1)
    .maybeSingle();

  if (existing) return existing as Section;

  // Fallback: create one at the end
  const { data: sections } = await supabase
    .from('sections')
    .select('position')
    .eq('project_id', projectId)
    .order('position', { ascending: false })
    .limit(1);

  const nextPos = (sections?.[0]?.position ?? -1) + 1;

  const { data, error } = await (supabase as any)
    .from('sections')
    .insert({
      name: 'Entrada',
      section_type: 'inbox',
      position: nextPos,
      project_id: projectId,
      workspace_id: workspaceId,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Section;
}
