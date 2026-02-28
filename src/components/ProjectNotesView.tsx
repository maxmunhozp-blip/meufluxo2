import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { NotesList, NoteItem } from './NotesList';
import { NoteEditor } from './NoteEditor';
import { Project } from '@/types/task';

interface ProjectNotesViewProps {
  projectId: string;
  workspaceId: string;
  userId: string;
  projects?: Project[];
  isPro?: boolean;
  onUpgrade?: () => void;
}

export function ProjectNotesView({ projectId, workspaceId, userId, projects = [], isPro = false, onUpgrade }: ProjectNotesViewProps) {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const loadNotes = useCallback(async () => {
    const { data } = await supabase
      .from('notes')
      .select('id, title, pinned, updated_at')
      .eq('project_id', projectId)
      .order('pinned', { ascending: false })
      .order('updated_at', { ascending: false });
    if (data) {
      setNotes(data.map(n => ({
        id: n.id,
        title: n.title,
        pinned: n.pinned,
        updated_at: n.updated_at,
      })));
    }
  }, [projectId]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const canCreateNote = isPro || notes.length < 5;

  if (isEditing) {
    return (
      <NoteEditor
        noteId={activeNoteId}
        projectId={projectId}
        workspaceId={workspaceId}
        userId={userId}
        onBack={() => { setIsEditing(false); setActiveNoteId(null); }}
        onSaved={loadNotes}
        onDelete={() => { loadNotes(); setIsEditing(false); setActiveNoteId(null); }}
        projects={projects}
        isPro={isPro}
        onUpgrade={onUpgrade}
      />
    );
  }

  return (
    <NotesList
      notes={notes}
      onSelectNote={(id) => { setActiveNoteId(id); setIsEditing(true); }}
      onNewNote={() => {
        if (!canCreateNote) { onUpgrade?.(); return; }
        setActiveNoteId(null);
        setIsEditing(true);
      }}
      maxNotes={isPro ? undefined : 5}
      onUpgrade={onUpgrade}
    />
  );
}
