import { useState, useMemo } from 'react';
import { FileText, Pin, Plus, PinOff, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ProjectDocument } from '@/types/document';
import { ContextMenu, ContextMenuItem } from './ContextMenu';
import { DocumentEditor } from './DocumentEditor';

interface ProjectDocsListProps {
  projectId: string;
  documents: ProjectDocument[];
  onCreateDocument: (projectId: string, workspaceId: string) => Promise<ProjectDocument>;
  onUpdateDocument: (doc: Partial<ProjectDocument> & { id: string }) => Promise<void>;
  onDeleteDocument: (id: string) => Promise<void>;
  workspaceId: string;
}

export function ProjectDocsList({
  projectId,
  documents,
  onCreateDocument,
  onUpdateDocument,
  onDeleteDocument,
  workspaceId,
}: ProjectDocsListProps) {
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const projectDocs = useMemo(() => {
    const docs = documents.filter(d => d.projectId === projectId);
    const pinned = docs.filter(d => d.pinned).sort((a, b) => a.position - b.position);
    const unpinned = docs.filter(d => !d.pinned).sort((a, b) => a.position - b.position);
    return [...pinned, ...unpinned];
  }, [documents, projectId]);

  const selectedDoc = useMemo(() => {
    if (!selectedDocId) return null;
    return documents.find(d => d.id === selectedDocId) || null;
  }, [documents, selectedDocId]);

  const handleCreate = async () => {
    try {
      const doc = await onCreateDocument(projectId, workspaceId);
      setSelectedDocId(doc.id);
    } catch (err) {
      console.error('Erro ao criar documento:', err);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, docId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ id: docId, x: e.clientX, y: e.clientY });
  };

  const handleRename = (docId: string) => {
    const doc = projectDocs.find(d => d.id === docId);
    if (!doc) return;
    setRenamingId(docId);
    setRenameValue(doc.title);
    setContextMenu(null);
  };

  const confirmRename = () => {
    if (renamingId && renameValue.trim()) {
      onUpdateDocument({ id: renamingId, title: renameValue.trim() });
    }
    setRenamingId(null);
  };

  const handleTogglePin = (docId: string) => {
    const doc = projectDocs.find(d => d.id === docId);
    if (!doc) return;
    onUpdateDocument({ id: docId, pinned: !doc.pinned });
    setContextMenu(null);
  };

  const handleDelete = (docId: string) => {
    onDeleteDocument(docId);
    if (selectedDocId === docId) setSelectedDocId(null);
    setContextMenu(null);
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return format(date, "d MMM", { locale: ptBR });
    } catch {
      return '';
    }
  };

  const getContextMenuItems = (docId: string): ContextMenuItem[] => {
    const doc = projectDocs.find(d => d.id === docId);
    return [
      {
        label: 'Renomear',
        icon: <Pencil className="w-3.5 h-3.5" />,
        onClick: () => handleRename(docId),
      },
      {
        label: doc?.pinned ? 'Desafixar' : 'Fixar no topo',
        icon: doc?.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />,
        onClick: () => handleTogglePin(docId),
      },
      {
        label: 'Excluir',
        icon: <Trash2 className="w-3.5 h-3.5" />,
        danger: true,
        onClick: () => handleDelete(docId),
      },
    ];
  };

  // If a document is selected, show the editor
  if (selectedDoc) {
    return (
      <DocumentEditor
        document={selectedDoc}
        onUpdateDocument={onUpdateDocument}
        onBack={() => setSelectedDocId(null)}
      />
    );
  }

  return (
    <div className="flex-1 overflow-y-auto sidebar-scroll" style={{ padding: '16px 32px 32px 32px' }}>
      {/* Header with create button */}
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: 0.5, textTransform: 'uppercase' }}>
          Documentos
        </h3>
        <button
          onClick={handleCreate}
          className="flex items-center gap-1.5"
          style={{
            padding: '6px 12px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--accent-blue)',
            background: 'var(--accent-subtle)',
            transition: 'all 150ms ease-out',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-blue)'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent-subtle)'; e.currentTarget.style.color = 'var(--accent-blue)'; }}
        >
          <Plus className="w-3.5 h-3.5" />
          Novo Documento
        </button>
      </div>

      {/* Empty state */}
      {projectDocs.length === 0 && (
        <div className="flex flex-col items-center justify-center" style={{ padding: '48px 24px', gap: 12 }}>
          <FileText className="w-10 h-10" style={{ color: 'var(--text-placeholder)', opacity: 0.5 }} />
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)', textAlign: 'center', maxWidth: 320, lineHeight: 1.6 }}>
            Nenhum documento. Crie um para guardar senhas, orientações e informações fixas do projeto.
          </p>
        </div>
      )}

      {/* Document list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {projectDocs.map(doc => {
          const isRenaming = renamingId === doc.id;

          if (isRenaming) {
            return (
              <div
                key={doc.id}
                className="flex items-center"
                style={{
                  height: 44,
                  padding: '0 12px',
                  borderRadius: 8,
                  background: 'var(--bg-elevated)',
                }}
              >
                <FileText className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-tertiary)', marginRight: 10 }} />
                <input
                  autoFocus
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') confirmRename();
                    if (e.key === 'Escape') setRenamingId(null);
                  }}
                  onBlur={confirmRename}
                  className="flex-1 h-7 px-2 text-[13px] rounded border focus:outline-none"
                  style={{
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    borderColor: 'var(--border-focus)',
                  }}
                />
              </div>
            );
          }

          return (
            <button
              key={doc.id}
              onClick={() => setSelectedDocId(doc.id)}
              onContextMenu={e => handleContextMenu(e, doc.id)}
              className="w-full flex items-center gap-2.5 select-none group"
              style={{
                height: 44,
                padding: '0 12px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 400,
                color: 'var(--text-secondary)',
                background: 'transparent',
                transition: 'all 150ms ease-out',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <FileText className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-tertiary)', transition: 'color 150ms ease-out' }} />
              {doc.pinned && (
                <Pin className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--accent-blue)', opacity: 0.7 }} />
              )}
              <span className="flex-1 text-left truncate">{doc.title}</span>
              <span
                className="text-[11px] flex-shrink-0"
                style={{ color: 'var(--text-placeholder)', fontWeight: 400 }}
              >
                {formatDate(doc.updatedAt)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          items={getContextMenuItems(contextMenu.id)}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
