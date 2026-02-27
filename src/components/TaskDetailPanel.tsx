import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Trash2, Plus, GripVertical, ChevronRight, Check, Paperclip, Download, FileText, Image as ImageIcon, Circle, CircleDot, CircleCheckBig } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task, TaskStatus, Priority, Subtask, Comment, Section, Attachment } from '@/types/task';
import { StatusCheckbox } from './StatusCheckbox';
import { MemberPicker } from './MemberPicker';
import { Profile } from '@/hooks/useSupabaseData';

interface TaskDetailPanelProps {
  task: Task;
  sections: Section[];
  profiles: Profile[];
  comments: Comment[];
  attachments: Attachment[];
  currentUserId?: string;
  parentTaskName?: string;
  onClose: () => void;
  onUpdateTask: (task: Task) => void;
  onAddMember: (taskId: string, userId: string) => void;
  onRemoveMember: (taskId: string, userId: string) => void;
  onAddComment: (taskId: string, text: string) => void;
  onDeleteComment: (commentId: string) => void;
  onAddSubtask: (parentTaskId: string, name: string) => Promise<void>;
  onUpdateSubtask: (subtaskId: string, updates: { name?: string; status?: TaskStatus }) => Promise<void>;
  onDeleteSubtask: (parentTaskId: string, subtaskId: string) => Promise<void>;
  onReorderSubtasks: (parentTaskId: string, subtaskIds: string[]) => Promise<void>;
  onNavigateToParent?: () => void;
  onSelectSubtask?: (subtask: Subtask) => void;
  onUploadAttachment: (taskId: string, file: File) => Promise<void>;
  onDeleteAttachment: (attachmentId: string) => Promise<void>;
}

// Research-backed: text status badges ("Pendente") are redundant with the
// status checkbox already present and add extraneous cognitive load for
// neurodivergent users (Microsoft Inclusive Design 2024; W3C COGA).
// We use a minimal icon-only indicator with semantic color — clickable to cycle.

const statusIcons: Record<TaskStatus, { icon: typeof Circle; color: string; label: string }> = {
  pending: { icon: Circle, color: 'hsl(var(--text-muted))', label: 'Pendente' },
  in_progress: { icon: CircleDot, color: 'hsl(var(--status-progress))', label: 'Em andamento' },
  done: { icon: CircleCheckBig, color: 'hsl(var(--status-done))', label: 'Concluída' },
};

function formatCommentDate(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDate();
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${day} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function AssigneePicker({ value, profiles, onChange, onSelectProfile }: { value: string; profiles: Profile[]; onChange: (name: string) => void; onSelectProfile?: (userId: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setSearch(''); setTimeout(() => inputRef.current?.focus(), 0); }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filtered = profiles.filter(p =>
    !search || (p.fullName || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="h-8 w-full px-2 text-left text-[16px] md:text-[14px] bg-nd-input rounded border border-transparent hover:border-nd-border-input focus:border-nd-border-input focus:outline-none transition-colors flex items-center gap-2"
      >
        {value ? (
          <span className="text-nd-text truncate">{value}</span>
        ) : (
          <span className="text-nd-text-muted">Adicionar responsável...</span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-9 z-50 w-56 rounded-lg border border-nd-border shadow-lg overflow-hidden"
          style={{ background: 'hsl(var(--bg-surface))' }}
        >
          <div className="p-2">
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full h-8 px-2 text-[13px] text-nd-text bg-nd-input rounded border border-transparent focus:border-nd-border-input focus:outline-none placeholder:text-nd-text-muted"
            />
          </div>
          <div className="max-h-40 overflow-y-auto">
            {value && (
              <button
                onClick={() => { onChange(''); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-nd-text-muted hover:bg-nd-hover transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span>Remover responsável</span>
              </button>
            )}
            {filtered.length === 0 && (
              <p className="px-3 py-2 text-[12px] text-nd-text-muted">Nenhum membro encontrado</p>
            )}
            {filtered.map(p => (
              <button
                key={p.id}
                onClick={() => { onChange(p.fullName || ''); onSelectProfile?.(p.id); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-nd-text hover:bg-nd-hover transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                  {(p.fullName || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <span className="truncate flex-1">{p.fullName || 'Sem nome'}</span>
                {value === p.fullName && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SortableSubtaskRow({ subtask, onStatusChange, onNameChange, onDelete, onSelect }: {
  subtask: Subtask;
  onStatusChange: (s: TaskStatus) => void;
  onNameChange: (name: string) => void;
  onDelete: () => void;
  onSelect?: (subtask: Subtask) => void;
}) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(subtask.name);
  const renameRef = useRef<HTMLInputElement>(null);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: subtask.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms ease',
    opacity: isDragging ? 0.5 : 1,
  };

  const confirmRename = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== subtask.name) onNameChange(trimmed);
    setIsRenaming(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group h-8 flex items-center gap-1 px-1 rounded-md hover:bg-nd-hover cursor-pointer"
      onClick={() => {
        if (isRenaming) return;
        if (clickTimer.current) clearTimeout(clickTimer.current);
        clickTimer.current = setTimeout(() => { onSelect?.(subtask); clickTimer.current = null; }, 250);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (clickTimer.current) { clearTimeout(clickTimer.current); clickTimer.current = null; }
        setRenameValue(subtask.name);
        setIsRenaming(true);
        setTimeout(() => renameRef.current?.focus(), 0);
      }}
    >
      <div {...attributes} {...listeners} className="w-4 h-4 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <GripVertical className="w-3.5 h-3.5 text-nd-text-muted" />
      </div>
      <div onClick={(e) => e.stopPropagation()}>
        <StatusCheckbox status={subtask.status} onChange={onStatusChange} size={16} />
      </div>
      {isRenaming ? (
        <input
          ref={renameRef}
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') confirmRename();
            if (e.key === 'Escape') setIsRenaming(false);
          }}
          onBlur={confirmRename}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          className="flex-1 h-6 px-1 text-[13px] text-nd-text bg-nd-input rounded border border-primary focus:outline-none min-w-0"
        />
      ) : (
        <span className={`flex-1 text-[13px] truncate ${
          subtask.status === 'done' ? 'text-nd-text-completed opacity-70 transition-[color,opacity] duration-200 ease-out' : 'text-nd-text transition-[color,opacity] duration-200 ease-out'
        }`}>
          {subtask.name}
        </span>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 text-nd-text-muted hover:text-nd-overdue transition-opacity"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function TaskDetailPanel({ task, sections, profiles, comments: allComments, attachments, currentUserId, parentTaskName, onClose, onUpdateTask, onAddMember, onRemoveMember, onAddComment, onDeleteComment, onAddSubtask, onUpdateSubtask, onDeleteSubtask, onReorderSubtasks, onNavigateToParent, onSelectSubtask, onUploadAttachment, onDeleteAttachment }: TaskDetailPanelProps) {
  const [localTask, setLocalTask] = useState<Task>(task);
  const [commentText, setCommentText] = useState('');
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [newSubtaskName, setNewSubtaskName] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const newSubRef = useRef<HTMLInputElement>(null);
  const commentRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalTask(task);
    setCommentText('');
    setAddingSubtask(false);
    setNewSubtaskName('');
  }, [task.id]);

  // Sync subtasks and members from parent when they change
  useEffect(() => {
    setLocalTask(prev => ({ ...prev, subtasks: task.subtasks, members: task.members }));
  }, [task.subtasks, task.members]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestTaskRef = useRef<Task>(localTask);

  // Immediate push (for selects, checkboxes, etc.)
  const pushUpdate = useCallback((updated: Task) => {
    setLocalTask(updated);
    latestTaskRef.current = updated;
    onUpdateTask(updated);
  }, [onUpdateTask]);

  // Debounced push (for text inputs: title, description, assignee)
  const pushUpdateDebounced = useCallback((updated: Task) => {
    setLocalTask(updated);
    latestTaskRef.current = updated;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onUpdateTask(latestTaskRef.current);
      debounceRef.current = null;
    }, 500);
  }, [onUpdateTask]);

  // Flush debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        onUpdateTask(latestTaskRef.current);
      }
    };
  }, [onUpdateTask]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const autoResize = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  };

  useEffect(() => { autoResize(titleRef.current); }, [localTask.name]);
  useEffect(() => { autoResize(descRef.current); }, [localTask.description]);

  const cycleStatus = () => {
    const next: TaskStatus =
      localTask.status === 'pending' ? 'in_progress' :
      localTask.status === 'in_progress' ? 'done' : 'pending';
    pushUpdate({ ...localTask, status: next });
  };

  const subtasks = localTask.subtasks || [];

  const subtaskSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleSubtaskDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = subtasks.findIndex(s => s.id === active.id);
    const newIdx = subtasks.findIndex(s => s.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(subtasks, oldIdx, newIdx);
    // Update local state immediately for smooth UI
    setLocalTask(prev => ({ ...prev, subtasks: reordered }));
    onReorderSubtasks(localTask.id, reordered.map(s => s.id));
  };

  const doneSubCount = subtasks.filter(s => s.status === 'done').length;
  const totalSubCount = subtasks.length;

  const updateSubtaskStatus = (subId: string, status: TaskStatus) => {
    // Optimistic local update
    setLocalTask(prev => ({
      ...prev,
      subtasks: (prev.subtasks || []).map(s => s.id === subId ? { ...s, status } : s),
    }));
    onUpdateSubtask(subId, { status });
  };

  const updateSubtaskName = (subId: string, name: string) => {
    setLocalTask(prev => ({
      ...prev,
      subtasks: (prev.subtasks || []).map(s => s.id === subId ? { ...s, name } : s),
    }));
    onUpdateSubtask(subId, { name });
  };

  const deleteSubtask = (subId: string) => {
    setLocalTask(prev => ({
      ...prev,
      subtasks: (prev.subtasks || []).filter(s => s.id !== subId),
    }));
    onDeleteSubtask(localTask.id, subId);
  };

  const addSubtask = () => {
    if (!newSubtaskName.trim()) return;
    onAddSubtask(localTask.id, newSubtaskName.trim());
    setNewSubtaskName('');
    setAddingSubtask(false);
  };

  const taskComments = allComments.filter(c => c.taskId === localTask.id);

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    onAddComment(localTask.id, commentText.trim());
    setCommentText('');
  };

  const handleDeleteComment = (commentId: string) => {
    onDeleteComment(commentId);
  };

  const projectSections = sections.filter(s => s.projectId === localTask.projectId);

  return (
    <div
      className="fixed right-0 top-0 h-screen z-50 border-l border-nd-border flex flex-col animate-slide-in-right
        w-full md:w-full inset-0 md:inset-auto md:relative md:right-auto md:top-auto"
      style={{
        background: 'hsl(var(--bg-surface))',
        boxShadow: '-4px 0 12px rgba(0,0,0,0.3)',
      }}
    >
      {/* Top bar */}
      <div className="h-12 flex items-center justify-between px-4 md:px-6 border-b border-nd-border flex-shrink-0">
        {(() => {
          const si = statusIcons[localTask.status];
          const Icon = si.icon;
          return (
            <button
              onClick={cycleStatus}
              title={si.label}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-nd-hover transition-colors"
            >
              <Icon className="w-[18px] h-[18px]" style={{ color: si.color, transition: 'color 150ms ease-out' }} />
            </button>
          );
        })()}
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-md text-nd-text-secondary hover:text-nd-text hover:bg-nd-hover transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Breadcrumb for subtasks */}
      {localTask.parentTaskId && parentTaskName && (
        <div className="px-4 md:px-6 pt-3 pb-1 flex items-center gap-1 text-[12px]">
          <button
            onClick={onNavigateToParent}
            className="text-nd-text-secondary hover:text-primary transition-colors truncate max-w-[200px]"
          >
            {parentTaskName}
          </button>
          <ChevronRight className="w-3 h-3 text-nd-text-muted flex-shrink-0" />
          <span className="text-nd-text truncate">{localTask.name || 'Subtarefa'}</span>
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 md:px-6 pt-6 pb-20">
          {/* Title */}
          <textarea
            ref={titleRef}
            value={localTask.name}
            onChange={(e) => { pushUpdateDebounced({ ...localTask, name: e.target.value }); autoResize(e.target); }}
            placeholder="Nome da tarefa..."
            rows={1}
            className="w-full text-[20px] font-semibold text-nd-text leading-[1.4] bg-transparent border border-transparent rounded-md px-1 py-0.5 resize-none overflow-hidden focus:border-nd-border-input focus:outline-none mb-3 placeholder:text-nd-text-muted text-[16px] md:text-[20px]"
          />

          {/* Description — immediate context for the task, right below title
              Research: Fernandez 2025 — actionable context belongs near the title */}
          <div className="mb-5">
            <textarea
              ref={descRef}
              value={localTask.description || ''}
              onChange={(e) => { pushUpdateDebounced({ ...localTask, description: e.target.value }); autoResize(e.target); }}
              placeholder="Adicione uma descrição..."
              className="w-full min-h-[48px] p-2 text-[16px] md:text-[14px] text-nd-text leading-[1.6] bg-transparent rounded-md border border-transparent focus:border-nd-border-input focus:bg-nd-input focus:outline-none resize-none placeholder:text-nd-text-muted"
            />
          </div>

          {/* Subtasks — primary actions */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] font-semibold text-nd-text-secondary">Subtarefas</span>
              {totalSubCount > 0 && (
                <span className="text-[12px] font-medium text-nd-text-secondary">{doneSubCount}/{totalSubCount}</span>
              )}
            </div>

            <DndContext sensors={subtaskSensors} collisionDetection={closestCenter} onDragEnd={handleSubtaskDragEnd}>
              <SortableContext items={subtasks.map(s => s.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-0.5 bg-nd-bg-subtask rounded-md p-1">
                  {subtasks.map((sub) => (
                    <SortableSubtaskRow
                      key={sub.id}
                      subtask={sub}
                      onStatusChange={(s) => updateSubtaskStatus(sub.id, s)}
                      onNameChange={(name) => updateSubtaskName(sub.id, name)}
                      onDelete={() => deleteSubtask(sub.id)}
                      onSelect={onSelectSubtask}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {addingSubtask ? (
              <div className="flex items-center gap-2 mt-1 px-1">
                <div className="w-4 h-4" />
                <input
                  ref={newSubRef}
                  value={newSubtaskName}
                  onChange={(e) => setNewSubtaskName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addSubtask();
                    if (e.key === 'Escape') { setAddingSubtask(false); setNewSubtaskName(''); }
                  }}
                  onBlur={() => { if (newSubtaskName.trim()) addSubtask(); else setAddingSubtask(false); }}
                  autoFocus
                  placeholder="Nome da subtarefa..."
                  className="flex-1 h-8 text-[13px] text-nd-text bg-transparent border-none focus:outline-none placeholder:text-nd-text-muted"
                />
              </div>
            ) : (
              <button
                onClick={() => { setAddingSubtask(true); setTimeout(() => newSubRef.current?.focus(), 0); }}
                className="mt-1 text-[13px] text-nd-text-secondary hover:text-primary transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar subtarefa
              </button>
            )}
          </div>

          <div className="h-px bg-nd-border mb-6" />

          {/* Metadata grid — all organizational context grouped together
              Research: progressive disclosure — group secondary info compactly */}
          <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: 'minmax(100px, 120px) 1fr' }}>
            <label className="text-[12px] font-medium text-nd-text-secondary pt-1.5">Responsável</label>
            <AssigneePicker
              value={localTask.assignee || ''}
              profiles={profiles}
              onChange={(name) => pushUpdateDebounced({ ...localTask, assignee: name })}
              onSelectProfile={(userId) => {
                const alreadyMember = (localTask.members || []).some(m => m.userId === userId);
                if (!alreadyMember) onAddMember(localTask.id, userId);
              }}
            />

            <label htmlFor="task-date-input" className="text-[12px] font-medium text-nd-text-secondary pt-1.5">Data</label>
            <input
              id="task-date-input"
              type="date"
              value={localTask.dueDate || ''}
              onChange={(e) => pushUpdate({ ...localTask, dueDate: e.target.value })}
              className="h-8 px-2 text-[16px] md:text-[14px] text-nd-text bg-nd-input rounded border border-transparent focus:border-nd-border-input focus:outline-none [color-scheme:dark]"
            />

            <label htmlFor="task-priority-input" className="text-[12px] font-medium text-nd-text-secondary pt-1.5">Prioridade</label>
            <select
              id="task-priority-input"
              value={localTask.priority || 'low'}
              onChange={(e) => pushUpdate({ ...localTask, priority: e.target.value as Priority })}
              className="h-8 w-full px-2 text-[16px] md:text-[14px] text-nd-text bg-nd-input rounded border border-transparent focus:border-nd-border-input focus:outline-none appearance-none cursor-pointer [color-scheme:dark]"
            >
              <option value="high">🔴 Alta</option>
              <option value="medium">🟡 Média</option>
              <option value="low">Baixa</option>
            </select>

            <label htmlFor="task-section-input" className="text-[12px] font-medium text-nd-text-secondary pt-1.5">Seção</label>
            <select
              id="task-section-input"
              value={localTask.section}
              onChange={(e) => pushUpdate({ ...localTask, section: e.target.value })}
              className="h-8 w-full px-2 text-[16px] md:text-[14px] text-nd-text bg-nd-input rounded border border-transparent focus:border-nd-border-input focus:outline-none appearance-none cursor-pointer [color-scheme:dark] truncate"
            >
              {projectSections.map(s => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          </div>

          {/* Members — part of metadata context, no separator needed */}
          <MemberPicker
            members={localTask.members || []}
            profiles={profiles}
            onAdd={(userId) => onAddMember(localTask.id, userId)}
            onRemove={(userId) => onRemoveMember(localTask.id, userId)}
          />

          <div className="h-px bg-nd-border my-6" />

          {/* Attachments */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] font-semibold text-nd-text-secondary">Anexos</span>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile}
                className="text-[12px] text-nd-text-secondary hover:text-primary transition-colors flex items-center gap-1"
              >
                <Paperclip className="w-3.5 h-3.5" />
                {uploadingFile ? 'Enviando...' : 'Anexar'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={async (e) => {
                  const files = e.target.files;
                  if (!files?.length) return;
                  setUploadingFile(true);
                  try {
                    for (const file of Array.from(files)) {
                      await onUploadAttachment(localTask.id, file);
                    }
                  } finally {
                    setUploadingFile(false);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }
                }}
              />
            </div>
            {(() => {
              const taskAttachments = attachments.filter(a => a.taskId === localTask.id);
              if (taskAttachments.length === 0) return (
                <p className="text-[12px] text-nd-text-muted">Nenhum anexo</p>
              );
              return (
                <div className="space-y-1">
                  {taskAttachments.map(att => {
                    const isImage = att.contentType?.startsWith('image/');
                    const sizeKb = Math.round(att.fileSize / 1024);
                    const sizeLabel = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;
                    return (
                      <div key={att.id} className="group flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-nd-hover transition-colors">
                        {isImage ? <ImageIcon className="w-4 h-4 text-nd-text-secondary flex-shrink-0" /> : <FileText className="w-4 h-4 text-nd-text-secondary flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <a
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[13px] text-nd-text hover:text-primary transition-colors truncate block"
                          >
                            {att.fileName}
                          </a>
                          <span className="text-[11px] text-nd-text-muted">{sizeLabel}</span>
                        </div>
                        <a
                          href={att.url}
                          download={att.fileName}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="opacity-0 group-hover:opacity-100 text-nd-text-muted hover:text-primary transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        {att.userId === currentUserId && (
                          <button
                            onClick={() => onDeleteAttachment(att.id)}
                            className="opacity-0 group-hover:opacity-100 text-nd-text-muted hover:text-nd-overdue transition-opacity"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          <div className="h-px bg-nd-border my-6" />

          {/* Comments */}
          <div>
            <span className="text-[12px] font-semibold text-nd-text-secondary block mb-3">Atualizações</span>
            <div className="space-y-0">
              {taskComments.map((comment, idx) => (
                <div
                  key={comment.id}
                  className={`group py-3 ${idx < taskComments.length - 1 ? 'border-b border-nd-border' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-nd-text">{comment.author}</span>
                    <span className="text-[12px] text-nd-text-secondary">{formatCommentDate(comment.date)}</span>
                    {comment.authorId === currentUserId && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="ml-auto opacity-0 group-hover:opacity-100 text-nd-text-muted hover:text-nd-overdue transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-[14px] text-nd-text leading-[1.6] mt-1.5">{comment.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky comment input */}
      <div className="flex-shrink-0 px-4 md:px-6 py-3 border-t border-nd-border" style={{ background: 'hsl(var(--bg-surface))' }}>
        <div className="relative">
          <textarea
            ref={commentRef}
            value={commentText}
            onChange={(e) => { setCommentText(e.target.value); autoResize(e.target); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); }
            }}
            placeholder="Escreva uma atualização..."
            rows={1}
            className="w-full min-h-[40px] py-2.5 pl-3 pr-20 text-[16px] md:text-[14px] text-nd-text leading-[1.5] bg-nd-input rounded-lg border border-nd-border focus:border-primary focus:outline-none resize-none placeholder:text-nd-text-muted"
          />
          {commentText.trim() && (
            <button
              onClick={handleAddComment}
              className="absolute right-3 bottom-2.5 px-3 py-1.5 text-[13px] font-medium bg-primary text-primary-foreground rounded transition-opacity hover:opacity-90"
            >
              Enviar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
