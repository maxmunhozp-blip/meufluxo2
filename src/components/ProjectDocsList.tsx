import { useState, useMemo, useEffect, useCallback } from 'react';
import { FileText, Pin, Plus, PinOff, Pencil, Trash2, GripVertical } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ProjectDocument } from '@/types/document';
import { ContextMenu, ContextMenuItem } from './ContextMenu';
import { DocumentEditor } from './DocumentEditor';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { supabase } from '@/integrations/supabase/client';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ── Sortable doc row ──
function SortableDocRow({
  doc,
  isRenaming,
  renameValue,
  onRenameChange,
  onConfirmRename,
  onCancelRename,
  onSelect,
  onContextMenu,
  formatDate,
}: {
  doc: ProjectDocument;
  isRenaming: boolean;
  renameValue: string;
  onRenameChange: (val: string) => void;
  onConfirmRename: () => void;
  onCancelRename: () => void;
  onSelect: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  formatDate: (d: string) => string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: doc.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (isRenaming) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="flex items-center"
        {...attributes}
      >
        <div
          className="flex items-center w-full"
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
            onChange={e => onRenameChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') onConfirmRename();
              if (e.key === 'Escape') onCancelRename();
            }}
            onBlur={onConfirmRename}
            className="flex-1 h-7 px-2 text-[13px] rounded border focus:outline-none"
            style={{
              background: 'var(--bg-input)',
              color: 'var(--text-primary)',
              borderColor: 'var(--border-focus)',
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="flex items-center group"
    >
      <div
        {...listeners}
        className="flex-shrink-0 flex items-center justify-center cursor-grab active:cursor-grabbing"
        style={{ width: 20, height: 44, color: 'var(--text-placeholder)', opacity: 0, transition: 'opacity 150ms' }}
        onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = '0'; }}
      >
        <GripVertical className="w-3.5 h-3.5" />
      </div>
      <button
        onClick={onSelect}
        onContextMenu={onContextMenu}
        className="flex-1 flex items-center gap-2.5 select-none"
        style={{
          height: 44,
          padding: '0 12px 0 0',
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
    </div>
  );
}

// ── Main component ──
interface ProjectDocsListProps {
  projectId: string;
  documents: ProjectDocument[];
  onCreateDocument: (projectId: string, workspaceId: string) => Promise<ProjectDocument>;
  onUpdateDocument: (doc: Partial<ProjectDocument> & { id: string }) => Promise<void>;
  onDeleteDocument: (id: string) => Promise<void>;
  onReorderDocuments: (updates: { id: string; position: number }[]) => Promise<void>;
  workspaceId: string;
}

export function ProjectDocsList({
  projectId,
  documents,
  onCreateDocument,
  onUpdateDocument,
  onDeleteDocument,
  onReorderDocuments,
  workspaceId,
}: ProjectDocsListProps) {
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isNewDoc, setIsNewDoc] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const { toast } = useToast();

  // Reset selection when project changes
  useEffect(() => {
    setSelectedDocId(null);
    setIsNewDoc(false);
  }, [projectId]);

  const pinnedDocs = useMemo(() =>
    documents.filter(d => d.projectId === projectId && d.pinned).sort((a, b) => a.position - b.position),
    [documents, projectId]
  );

  const unpinnedDocs = useMemo(() =>
    documents.filter(d => d.projectId === projectId && !d.pinned).sort((a, b) => a.position - b.position),
    [documents, projectId]
  );

  const allProjectDocs = useMemo(() => [...pinnedDocs, ...unpinnedDocs], [pinnedDocs, unpinnedDocs]);

  const selectedDoc = useMemo(() => {
    if (!selectedDocId) return null;
    return documents.find(d => d.id === selectedDocId) || null;
  }, [documents, selectedDocId]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleCreate = async () => {
    try {
      const doc = await onCreateDocument(projectId, workspaceId);
      setSelectedDocId(doc.id);
      setIsNewDoc(true);
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
    const doc = allProjectDocs.find(d => d.id === docId);
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
    const doc = allProjectDocs.find(d => d.id === docId);
    if (!doc) return;
    onUpdateDocument({ id: docId, pinned: !doc.pinned });
    setContextMenu(null);
  };

  const handleDelete = useCallback((docId: string) => {
    const doc = allProjectDocs.find(d => d.id === docId);
    if (!doc) return;
    setContextMenu(null);

    // Optimistic delete
    onDeleteDocument(docId);
    if (selectedDocId === docId) { setSelectedDocId(null); setIsNewDoc(false); }

    toast({
      title: 'Documento excluído',
      duration: 5000,
      action: (
        <ToastAction altText="Desfazer" onClick={async () => {
          try {
            // Re-insert the document
            await supabase.from('project_documents').insert({
              id: doc.id,
              project_id: doc.projectId,
              workspace_id: doc.workspaceId,
              created_by: doc.createdBy,
              title: doc.title,
              content: doc.content,
              pinned: doc.pinned,
              position: doc.position,
              created_at: doc.createdAt,
              updated_at: doc.updatedAt,
            });
          } catch {
            // silent
          }
        }}>
          Desfazer
        </ToastAction>
      ),
    });
  }, [allProjectDocs, onDeleteDocument, selectedDocId, toast]);

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "d MMM", { locale: ptBR });
    } catch {
      return '';
    }
  };

  const getContextMenuItems = (docId: string): ContextMenuItem[] => {
    const doc = allProjectDocs.find(d => d.id === docId);
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

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Determine which group
    const isPinnedGroup = pinnedDocs.some(d => d.id === activeId);
    const group = isPinnedGroup ? [...pinnedDocs] : [...unpinnedDocs];

    const oldIndex = group.findIndex(d => d.id === activeId);
    const newIndex = group.findIndex(d => d.id === overId);
    if (oldIndex === -1 || newIndex === -1) return;

    // Reorder
    const [moved] = group.splice(oldIndex, 1);
    group.splice(newIndex, 0, moved);

    const updates = group.map((d, i) => ({ id: d.id, position: i }));
    onReorderDocuments(updates);
  }, [pinnedDocs, unpinnedDocs, onReorderDocuments]);

  // If a document is selected, show the editor
  if (selectedDoc) {
    return (
      <DocumentEditor
        key={selectedDoc.id}
        document={selectedDoc}
        onUpdateDocument={onUpdateDocument}
        onBack={() => { setSelectedDocId(null); setIsNewDoc(false); }}
        isNew={isNewDoc}
      />
    );
  }

  const pinnedIds = pinnedDocs.map(d => d.id);
  const unpinnedIds = unpinnedDocs.map(d => d.id);

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
      {allProjectDocs.length === 0 && (
        <div className="flex flex-col items-center justify-center" style={{ padding: '48px 24px', gap: 12 }}>
          <FileText className="w-10 h-10" style={{ color: 'var(--text-placeholder)', opacity: 0.5 }} />
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)', textAlign: 'center', maxWidth: 320, lineHeight: 1.6 }}>
            Nenhum documento. Crie um para guardar senhas, orientações e informações fixas do projeto.
          </p>
        </div>
      )}

      {/* Document lists with DnD */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        {/* Pinned group */}
        {pinnedDocs.length > 0 && (
          <div style={{ marginBottom: unpinnedDocs.length > 0 ? 8 : 0 }}>
            <SortableContext items={pinnedIds} strategy={verticalListSortingStrategy}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {pinnedDocs.map(doc => (
                  <SortableDocRow
                    key={doc.id}
                    doc={doc}
                    isRenaming={renamingId === doc.id}
                    renameValue={renameValue}
                    onRenameChange={setRenameValue}
                    onConfirmRename={confirmRename}
                    onCancelRename={() => setRenamingId(null)}
                    onSelect={() => { setSelectedDocId(doc.id); setIsNewDoc(false); }}
                    onContextMenu={e => handleContextMenu(e, doc.id)}
                    formatDate={formatDate}
                  />
                ))}
              </div>
            </SortableContext>
            {unpinnedDocs.length > 0 && (
              <div style={{ height: 1, background: 'var(--border-subtle)', margin: '6px 0' }} />
            )}
          </div>
        )}

        {/* Unpinned group */}
        {unpinnedDocs.length > 0 && (
          <SortableContext items={unpinnedIds} strategy={verticalListSortingStrategy}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {unpinnedDocs.map(doc => (
                <SortableDocRow
                  key={doc.id}
                  doc={doc}
                  isRenaming={renamingId === doc.id}
                  renameValue={renameValue}
                  onRenameChange={setRenameValue}
                  onConfirmRename={confirmRename}
                  onCancelRename={() => setRenamingId(null)}
                  onSelect={() => { setSelectedDocId(doc.id); setIsNewDoc(false); }}
                  onContextMenu={e => handleContextMenu(e, doc.id)}
                  formatDate={formatDate}
                />
              ))}
            </div>
          </SortableContext>
        )}
      </DndContext>

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
