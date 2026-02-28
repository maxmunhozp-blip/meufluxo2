import { supabase } from '@/integrations/supabase/client';

interface Section {
  id: string;
  name: string;
  project_id: string;
  workspace_id: string;
  position: number;
}

/**
 * Ensures an "Entrada" section exists in the given project.
 * If it doesn't exist, creates it at position 0 (top of the list).
 * 
 * This follows the GTD "Inbox" pattern — a default capture location
 * where items go before being organized into their final destination.
 */
export async function ensureEntradaSection(
  projectId: string,
  workspaceId: string
): Promise<Section> {
  // 1. Check if "Entrada" section already exists
  const { data: existingSection, error: fetchError } = await supabase
    .from('sections')
    .select('*')
    .eq('project_id', projectId)
    .eq('name', 'Entrada')
    .maybeSingle();

  if (fetchError) {
    console.error('Error checking for Entrada section:', fetchError);
    throw fetchError;
  }

  // 2. If exists, return it
  if (existingSection) {
    return existingSection as Section;
  }

  // 3. Increment all existing section positions by 1 to make room at position 0
  const { data: sections } = await supabase
    .from('sections')
    .select('position')
    .eq('project_id', projectId);

  if (sections && sections.length > 0) {
    await supabase.rpc('increment_section_positions', {
      p_project_id: projectId
    });
  }

  // 4. Create "Entrada" section at position 0
  const { data: newSection, error: insertError } = await supabase
    .from('sections')
    .insert({
      name: 'Entrada',
      project_id: projectId,
      workspace_id: workspaceId,
      position: 0
    })
    .select()
    .single();

  if (insertError) {
    console.error('Error creating Entrada section:', insertError);
    throw insertError;
  }

  console.log('Created Entrada section:', newSection);
  return newSection as Section;
}
