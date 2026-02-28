import { useEffect, useRef } from 'react';
import { NoteEditor } from './NoteEditor';
import { Project } from '@/types/task';

interface QuickNoteModalProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  userId: string;
  projects: Project[];
  onSaved: () => void;
}

export function QuickNoteModal({ open, onClose, workspaceId, userId, projects, onSaved }: QuickNoteModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[150] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className="rounded-xl shadow-2xl overflow-hidden"
        style={{
          width: '90vw',
          maxWidth: 640,
          height: '70vh',
          maxHeight: 600,
          background: '#0F0F17',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <NoteEditor
          noteId={null}
          projectId={null}
          workspaceId={workspaceId}
          userId={userId}
          onBack={onClose}
          onSaved={onSaved}
          onDelete={onClose}
          projects={projects}
          isModal
        />
      </div>
    </div>
  );
}
