import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { NoteItem } from './NotesList';
import { NoteEditor } from './NoteEditor';
import { Project } from '@/types/task';
import { Plus, Pin, ChevronDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface GlobalNotesViewProps {
  workspaceId: string;
  userId: string;
  projects: Project[];
}

type FilterMode = 'all' | 'quick' | string; // string = project id

export function GlobalNotesView({ workspaceId, userId, projects }: GlobalNotesViewProps) {
  const [notes, setNotes] = useState<(NoteItem & { project_id: string | null })[]>([]);
  const [filter, setFilter] = useState<FilterMode>('all');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const loadNotes = useCallback(async () => {
    const { data } = await supabase
      .from('notes')
      .select('id, title, pinned, updated_at, project_id')
      .eq('workspace_id', workspaceId)
      .order('pinned', { ascending: false })
      .order('updated_at', { ascending: false });
    if (data) {
      setNotes(data.map(n => ({
        id: n.id,
        title: n.title,
        pinned: n.pinned,
        updated_at: n.updated_at,
        project_id: n.project_id,
      })));
    }
  }, [workspaceId]);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  const filtered = useMemo(() => {
    if (filter === 'all') return notes;
    if (filter === 'quick') return notes.filter(n => !n.project_id);
    return notes.filter(n => n.project_id === filter);
  }, [notes, filter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [filtered]);

  const selectedProjectForFilter = filter !== 'all' && filter !== 'quick' ? projects.find(p => p.id === filter) : null;

  if (isEditing) {
    return (
      <NoteEditor
        noteId={activeNoteId}
        projectId={null}
        workspaceId={workspaceId}
        userId={userId}
        onBack={() => { setIsEditing(false); setActiveNoteId(null); }}
        onSaved={loadNotes}
        onDelete={() => { loadNotes(); setIsEditing(false); setActiveNoteId(null); }}
        projects={projects}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="h-14 px-6 flex items-center border-b" style={{ borderColor: 'rgba(255,255,255,0.04)', background: 'hsl(var(--bg-app))' }}>
        <h1 className="text-[18px] font-bold" style={{ color: '#E8E8F0' }}>Notas</h1>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1 px-4 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        {(['all', 'quick'] as const).map(f => (
          <button
            key={f}
            onClick={() => { setFilter(f); setShowProjectDropdown(false); }}
            className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
            style={{
              color: filter === f ? '#E8E8F0' : '#555570',
              background: filter === f ? 'rgba(255,255,255,0.06)' : 'transparent',
            }}
            onMouseEnter={e => { if (filter !== f) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
            onMouseLeave={e => { if (filter !== f) e.currentTarget.style.background = 'transparent'; }}
          >
            {f === 'all' ? 'Todas' : 'Rápidas'}
          </button>
        ))}
        <div className="relative">
          <button
            onClick={() => setShowProjectDropdown(!showProjectDropdown)}
            className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1"
            style={{
              color: selectedProjectForFilter ? '#E8E8F0' : '#555570',
              background: selectedProjectForFilter ? 'rgba(255,255,255,0.06)' : 'transparent',
            }}
          >
            {selectedProjectForFilter ? selectedProjectForFilter.name : 'Por projeto'}
            <ChevronDown className="w-3 h-3" />
          </button>
          {showProjectDropdown && (
            <div className="absolute top-full left-0 mt-1 rounded-lg py-1 shadow-lg z-50" style={{ background: '#1A1A28', border: '1px solid #333350', minWidth: 180 }}>
              {projects.map(p => (
                <button
                  key={p.id}
                  onClick={() => { setFilter(p.id); setShowProjectDropdown(false); }}
                  className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors"
                  style={{ color: filter === p.id ? '#6C9CFC' : '#8888A0' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <button
          onClick={() => { setActiveNoteId(null); setIsEditing(true); }}
          className="w-full flex items-center gap-2 px-4 py-3 rounded-lg transition-colors"
          style={{ background: '#1A1A28', color: '#E8E8F0' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#1E1E30'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#1A1A28'; }}
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">Nova nota rápida</span>
        </button>

        {sorted.map(note => {
          const noteProject = note.project_id ? projects.find(p => p.id === note.project_id) : null;
          return (
            <button
              key={note.id}
              onClick={() => { setActiveNoteId(note.id); setIsEditing(true); }}
              className="w-full text-left px-4 py-3 rounded-lg transition-colors"
              style={{ background: '#1A1A28' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#1E1E30'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#1A1A28'; }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  {note.pinned && <Pin className="w-3 h-3 flex-shrink-0" style={{ color: '#8888A0' }} />}
                  <span className="text-sm font-medium truncate" style={{ color: '#E8E8F0' }}>
                    {note.title || 'Sem título'}
                  </span>
                </div>
                {noteProject && (
                  <span className="text-[11px] flex-shrink-0 ml-2" style={{ color: '#8888A0' }}>
                    {noteProject.name}
                  </span>
                )}
              </div>
              <div className="text-[11px] mt-1" style={{ color: '#555570' }}>
                {noteProject ? noteProject.name : 'Nota rápida'} · Atualizado {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true, locale: ptBR })}
              </div>
            </button>
          );
        })}

        {sorted.length === 0 && (
          <div className="text-center py-12" style={{ color: '#555570' }}>
            <p className="text-sm">Nenhuma nota encontrada</p>
          </div>
        )}
      </div>
    </div>
  );
}
