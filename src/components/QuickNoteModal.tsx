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
  isPro?: boolean;
  onUpgrade?: () => void;
}

export function QuickNoteModal({ open, onClose, workspaceId, userId, projects, onSaved, isPro = false, onUpgrade }: QuickNoteModalProps) {
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
      style={{ background: 'var(--overlay-bg)' }}
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className="rounded-xl overflow-hidden"
        style={{
          width: '90vw',
          maxWidth: 640,
          height: '70vh',
          maxHeight: 600,
          background: 'var(--bg-base)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-lg)',
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
          isPro={isPro}
          onUpgrade={onUpgrade}
        />
      </div>
    </div>
  );
}
