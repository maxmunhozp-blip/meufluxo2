import { useState } from 'react';
import { Plus, Pin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface NoteItem {
  id: string;
  title: string;
  pinned: boolean;
  updated_at: string;
}

interface NotesListProps {
  notes: NoteItem[];
  onSelectNote: (noteId: string) => void;
  onNewNote: () => void;
}

export function NotesList({ notes, onSelectNote, onNewNote }: NotesListProps) {
  const sorted = [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      <button
        onClick={onNewNote}
        className="w-full flex items-center gap-2 px-4 py-3 rounded-lg transition-colors"
        style={{ background: '#1A1A28', color: '#E8E8F0' }}
        onMouseEnter={e => { e.currentTarget.style.background = '#1E1E30'; }}
        onMouseLeave={e => { e.currentTarget.style.background = '#1A1A28'; }}
      >
        <Plus className="w-4 h-4" />
        <span className="text-sm font-medium">Nova nota</span>
      </button>

      {sorted.map(note => (
        <button
          key={note.id}
          onClick={() => onSelectNote(note.id)}
          className="w-full text-left px-4 py-3 rounded-lg transition-colors"
          style={{ background: '#1A1A28' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#1E1E30'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#1A1A28'; }}
        >
          <div className="flex items-center gap-1.5">
            {note.pinned && <Pin className="w-3 h-3 flex-shrink-0" style={{ color: '#8888A0' }} />}
            <span className="text-sm font-medium truncate" style={{ color: '#E8E8F0' }}>
              {note.title || 'Sem título'}
            </span>
          </div>
          <div className="text-[11px] mt-1" style={{ color: '#555570' }}>
            Atualizado {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true, locale: ptBR })}
          </div>
        </button>
      ))}

      {notes.length === 0 && (
        <div className="text-center py-12" style={{ color: '#555570' }}>
          <p className="text-sm">Nenhuma nota ainda</p>
          <p className="text-xs mt-1">Clique em "Nova nota" para começar</p>
        </div>
      )}
    </div>
  );
}
