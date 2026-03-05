import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { NoteItem } from './NotesList';
import { NoteEditor } from './NoteEditor';
import { ProBadge } from './ProBadge';
import { Project } from '@/types/task';
import { Plus, Pin, ChevronDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface GlobalNotesViewProps {
  workspaceId: string;
  userId: string;
  projects: Project[];
  isPro?: boolean;
  onUpgrade?: () => void;
}

type FilterMode = 'all' | 'quick' | string;

export function GlobalNotesView({ workspaceId, userId, projects, isPro = false, onUpgrade }: GlobalNotesViewProps) {
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

  const quickNotesCount = useMemo(() => notes.filter(n => !n.project_id).length, [notes]);
  const canCreateQuickNote = isPro || quickNotesCount < 10;

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
        isPro={isPro}
        onUpgrade={onUpgrade}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 flex items-center" style={{ paddingTop: 28, paddingBottom: 10, borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-base)' }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--text-primary)' }}>Notas</h1>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1 px-4 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        {(['all', 'quick'] as const).map(f => (
          <button
            key={f}
            onClick={() => { setFilter(f); setShowProjectDropdown(false); }}
            className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
            style={{
              color: filter === f ? 'var(--text-primary)' : 'var(--text-tertiary)',
              background: filter === f ? 'var(--bg-elevated)' : 'transparent',
            }}
            onMouseEnter={e => { if (filter !== f) e.currentTarget.style.background = 'var(--bg-elevated)'; }}
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
              color: selectedProjectForFilter ? 'var(--text-primary)' : 'var(--text-tertiary)',
              background: selectedProjectForFilter ? 'var(--bg-elevated)' : 'transparent',
            }}
          >
            {selectedProjectForFilter ? selectedProjectForFilter.name : 'Por projeto'}
            <ChevronDown className="w-3 h-3" />
          </button>
          {showProjectDropdown && (
            <div className="absolute top-full left-0 mt-1 rounded-lg py-1 shadow-lg z-50" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', minWidth: 180 }}>
              {projects.map(p => (
                <button
                  key={p.id}
                  onClick={() => { setFilter(p.id); setShowProjectDropdown(false); }}
                  className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors"
                  style={{ color: filter === p.id ? 'var(--accent-blue)' : 'var(--text-secondary)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-overlay)'; }}
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
          onClick={() => {
            if (!canCreateQuickNote) { onUpgrade?.(); return; }
            setActiveNoteId(null);
            setIsEditing(true);
          }}
          className="w-full flex items-center gap-2 px-4 py-3 rounded-lg transition-colors"
          style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-surface)'; }}
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">Nova nota rápida</span>
          {!canCreateQuickNote && <ProBadge onClick={(e) => { e.stopPropagation(); onUpgrade?.(); }} />}
        </button>

        {!isPro && (
          <p className="text-[11px] px-1" style={{ color: 'var(--text-tertiary)' }}>
            {quickNotesCount}/10 notas rápidas · {canCreateQuickNote ? `${10 - quickNotesCount} restantes` : 'Limite atingido'}
          </p>
        )}

        {sorted.map(note => {
          const noteProject = note.project_id ? projects.find(p => p.id === note.project_id) : null;
          return (
            <button
              key={note.id}
              onClick={() => { setActiveNoteId(note.id); setIsEditing(true); }}
              className="w-full text-left px-4 py-3 rounded-lg transition-colors"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-surface)'; }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  {note.pinned && <Pin className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--text-secondary)' }} />}
                  <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {note.title || 'Sem título'}
                  </span>
                </div>
                {noteProject && (
                  <span className="text-[11px] flex-shrink-0 ml-2" style={{ color: 'var(--text-secondary)' }}>
                    {noteProject.name}
                  </span>
                )}
              </div>
              <div className="text-[11px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
                {noteProject ? noteProject.name : 'Nota rápida'} · Atualizado {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true, locale: ptBR })}
              </div>
            </button>
          );
        })}

        {sorted.length === 0 && (
          <div className="text-center py-12" style={{ color: 'var(--text-tertiary)' }}>
            <p className="text-sm">Nenhuma nota encontrada</p>
          </div>
        )}
      </div>
    </div>
  );
}
