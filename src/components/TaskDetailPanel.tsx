import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Trash2, Plus, GripVertical, ChevronRight, Check, Paperclip, Download, FileText, Image as ImageIcon, Circle, CircleDot, CircleCheckBig } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task, TaskStatus, Priority, Subtask, Comment, Section, Attachment, RecurrenceType, RecurrenceConfig, ServiceTag } from '@/types/task';
import { getTagIcon } from './ServiceTagsManager';
import { StatusCheckbox } from './StatusCheckbox';
import { MemberPicker } from './MemberPicker';
import { Profile } from '@/hooks/useSupabaseData';
import { RecurrencePicker } from './RecurrencePicker';

interface TaskDetailPanelProps {
  task: Task;
  sections: Section[];
  profiles: Profile[];
  comments: Comment[];
  attachments: Attachment[];
  serviceTags?: ServiceTag[];
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

function formatDateDisplay(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

// Inline assignee picker — Apple minimal
function AssigneePicker({ value, profiles, onChange, onSelectProfile, onRemoveProfile }: { value: string; profiles: Profile[]; onChange: (name: string) => void; onSelectProfile?: (userId: string) => void; onRemoveProfile?: (userId: string) => void }) {
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
        className="h-8 w-full text-left text-[13px] bg-transparent focus:outline-none flex items-center cursor-pointer"
      >
        {value ? (
          <span style={{ color: '#E8E8F0' }}>{value}</span>
        ) : (
          <span style={{ color: '#555570' }}>Nenhum</span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-9 z-50 w-56 rounded-lg border overflow-hidden"
          style={{ background: 'hsl(var(--bg-surface))', borderColor: 'rgba(255,255,255,0.06)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
        >
          <div className="p-2">
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full h-8 px-2 text-[13px] bg-transparent rounded border focus:outline-none placeholder:text-nd-text-muted"
              style={{ color: '#E8E8F0', borderColor: 'rgba(255,255,255,0.06)' }}
            />
          </div>
          <div className="max-h-40 overflow-y-auto">
            {value && (
              <button
                onClick={() => {
                  // Find the profile matching current assignee to remove from task_members
                  const matchedProfile = profiles.find(p => (p.fullName || '') === value);
                  if (matchedProfile) onRemoveProfile?.(matchedProfile.id);
                  onChange('');
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] hover:bg-nd-hover transition-colors"
                style={{ color: '#8888A0' }}
              >
                <X className="w-3.5 h-3.5" />
                <span>Remover</span>
              </button>
            )}
            {filtered.length === 0 && (
              <p className="px-3 py-2 text-[12px]" style={{ color: '#555570' }}>Nenhum membro</p>
            )}
            {filtered.map(p => (
              <button
                key={p.id}
                onClick={() => { onChange(p.fullName || ''); onSelectProfile?.(p.id); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] hover:bg-nd-hover transition-colors"
                style={{ color: '#E8E8F0' }}
              >
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                  style={{ background: 'rgba(108,156,252,0.15)', color: '#6C9CFC' }}>
                  {(p.fullName || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <span className="truncate flex-1">{p.fullName || 'Sem nome'}</span>
                {value === p.fullName && <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#6C9CFC' }} />}
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
        <GripVertical className="w-3.5 h-3.5" style={{ color: '#8888A0' }} />
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
          className="flex-1 h-6 px-1 text-[13px] bg-transparent rounded border focus:outline-none min-w-0"
          style={{ color: '#E8E8F0', borderColor: '#6C9CFC' }}
        />
      ) : (
        <span className={`flex-1 text-[13px] truncate ${
          subtask.status === 'done' ? 'line-through opacity-50' : ''
        }`} style={{ color: subtask.status === 'done' ? '#555570' : '#E8E8F0', transition: 'color 200ms ease-out, opacity 200ms ease-out' }}>
          {subtask.name}
        </span>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: '#8888A0' }}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// Metadata row — Apple-style inline
function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center" style={{ height: 32 }}>
      <span className="flex-shrink-0" style={{ width: 100, fontSize: 12, color: '#555570', fontWeight: 400 }}>{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

export function TaskDetailPanel({ task, sections, profiles, comments: allComments, attachments, serviceTags = [], currentUserId, parentTaskName, onClose, onUpdateTask, onAddMember, onRemoveMember, onAddComment, onDeleteComment, onAddSubtask, onUpdateSubtask, onDeleteSubtask, onReorderSubtasks, onNavigateToParent, onSelectSubtask, onUploadAttachment, onDeleteAttachment }: TaskDetailPanelProps) {
  const [localTask, setLocalTask] = useState<Task>(task);
  const [commentText, setCommentText] = useState('');
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [newSubtaskName, setNewSubtaskName] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [activeTab, setActiveTab] = useState<'attachments' | 'activity' | null>(null);
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

  useEffect(() => {
    setLocalTask(prev => ({ ...prev, subtasks: task.subtasks, members: task.members }));
  }, [task.subtasks, task.members]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestTaskRef = useRef<Task>(localTask);

  const pushUpdate = useCallback((updated: Task) => {
    setLocalTask(updated);
    latestTaskRef.current = updated;
    onUpdateTask(updated);
  }, [onUpdateTask]);

  const pushUpdateDebounced = useCallback((updated: Task) => {
    setLocalTask(updated);
    latestTaskRef.current = updated;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onUpdateTask(latestTaskRef.current);
      debounceRef.current = null;
    }, 500);
  }, [onUpdateTask]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        onUpdateTask(latestTaskRef.current);
      }
    };
  }, [onUpdateTask]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
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
    setLocalTask(prev => ({ ...prev, subtasks: reordered }));
    onReorderSubtasks(localTask.id, reordered.map(s => s.id));
  };

  const doneSubCount = subtasks.filter(s => s.status === 'done').length;
  const totalSubCount = subtasks.length;

  const updateSubtaskStatus = (subId: string, status: TaskStatus) => {
    setLocalTask(prev => ({ ...prev, subtasks: (prev.subtasks || []).map(s => s.id === subId ? { ...s, status } : s) }));
    onUpdateSubtask(subId, { status });
  };

  const updateSubtaskName = (subId: string, name: string) => {
    setLocalTask(prev => ({ ...prev, subtasks: (prev.subtasks || []).map(s => s.id === subId ? { ...s, name } : s) }));
    onUpdateSubtask(subId, { name });
  };

  const deleteSubtask = (subId: string) => {
    setLocalTask(prev => ({ ...prev, subtasks: (prev.subtasks || []).filter(s => s.id !== subId) }));
    onDeleteSubtask(localTask.id, subId);
  };

  const addSubtask = () => {
    if (!newSubtaskName.trim()) return;
    onAddSubtask(localTask.id, newSubtaskName.trim());
    setNewSubtaskName('');
    setAddingSubtask(false);
  };

  const taskComments = allComments.filter(c => c.taskId === localTask.id);
  const taskAttachments = attachments.filter(a => a.taskId === localTask.id);
  const projectSections = sections.filter(s => s.projectId === localTask.projectId);

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    onAddComment(localTask.id, commentText.trim());
    setCommentText('');
  };

  return (
    <div
      className="fixed right-0 top-0 h-screen z-50 flex flex-col animate-slide-in-right
        w-full md:w-full inset-0 md:inset-auto md:relative md:right-auto md:top-auto"
      style={{
        background: 'hsl(var(--bg-surface))',
        borderLeft: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '-4px 0 12px rgba(0,0,0,0.3)',
      }}
    >
      {/* Top bar — minimal */}
      <div className="h-11 flex items-center justify-between px-4 md:px-5 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {(() => {
          const si = statusIcons[localTask.status];
          const Icon = si.icon;
          return (
            <button onClick={cycleStatus} title={si.label}
              className="w-7 h-7 flex items-center justify-center rounded-md transition-colors"
              style={{ color: si.color }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <Icon className="w-[18px] h-[18px]" />
            </button>
          );
        })()}
        <button onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-md transition-colors"
          style={{ color: '#8888A0' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#E8E8F0'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8888A0'; }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Breadcrumb for subtasks */}
      {localTask.parentTaskId && parentTaskName && (
        <div className="px-4 md:px-5 pt-3 pb-1 flex items-center gap-1 text-[12px]">
          <button onClick={onNavigateToParent} className="truncate max-w-[200px] transition-colors"
            style={{ color: '#8888A0' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#6C9CFC'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#8888A0'; }}
          >{parentTaskName}</button>
          <ChevronRight className="w-3 h-3 flex-shrink-0" style={{ color: '#555570' }} />
          <span style={{ color: '#E8E8F0' }} className="truncate">{localTask.name || 'Subtarefa'}</span>
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 md:px-5 pt-5 pb-20">
          {/* 1. Title */}
          <textarea
            ref={titleRef}
            value={localTask.name}
            onChange={(e) => { pushUpdateDebounced({ ...localTask, name: e.target.value }); autoResize(e.target); }}
            placeholder="Nome da tarefa..."
            rows={1}
            className="w-full bg-transparent border-none focus:outline-none resize-none overflow-hidden mb-2"
            style={{ fontSize: 18, fontWeight: 600, color: '#E8E8F0', lineHeight: 1.4, padding: 0 }}
          />

          {/* 2. Description */}
          <div className="mb-5">
            <textarea
              ref={descRef}
              value={localTask.description || ''}
              onChange={(e) => { pushUpdateDebounced({ ...localTask, description: e.target.value }); autoResize(e.target); }}
              placeholder="Adicionar notas..."
              className="w-full min-h-[36px] bg-transparent border-none focus:outline-none resize-none"
              style={{ fontSize: 14, color: '#8888A0', lineHeight: 1.6, padding: 0 }}
            />
          </div>

          {/* 3. Subtasks */}
          {(subtasks.length > 0 || addingSubtask) && (
            <div className="mb-5">
              {totalSubCount > 0 && (
                <div className="flex items-center justify-between mb-2">
                  <span style={{ fontSize: 12, color: '#555570', fontWeight: 400 }}>Subtarefas</span>
                  <span style={{ fontSize: 11, color: '#555570' }}>{doneSubCount}/{totalSubCount}</span>
                </div>
              )}

              <DndContext sensors={subtaskSensors} collisionDetection={closestCenter} onDragEnd={handleSubtaskDragEnd}>
                <SortableContext items={subtasks.map(s => s.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-0">
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
            </div>
          )}

          {addingSubtask ? (
            <div className="flex items-center gap-2 mb-5 px-1">
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
                className="flex-1 h-7 text-[13px] bg-transparent border-none focus:outline-none"
                style={{ color: '#E8E8F0' }}
              />
            </div>
          ) : (
            <button
              onClick={() => { setAddingSubtask(true); setTimeout(() => newSubRef.current?.focus(), 0); }}
              className="mb-5 text-[13px] flex items-center gap-1 transition-colors"
              style={{ color: '#555570' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#8888A0'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#555570'; }}
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar subtarefa
            </button>
          )}

          {/* 4. Separator */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 16 }} />

          {/* 5. Metadata — 2-column, transparent, text-only */}
          <div className="mb-5">
            <MetaRow label="Responsável">
              <AssigneePicker
                value={localTask.assignee || ''}
                profiles={profiles}
                onChange={(name) => pushUpdateDebounced({ ...localTask, assignee: name })}
                onSelectProfile={(userId) => {
                  const alreadyMember = (localTask.members || []).some(m => m.userId === userId);
                  if (!alreadyMember) onAddMember(localTask.id, userId);
                }}
                onRemoveProfile={(userId) => {
                  onRemoveMember(localTask.id, userId);
                }}
              />
            </MetaRow>

            {/* "Fazer em" + "Entregar até" — compact date display */}
            <MetaRow label="Fazer em">
              <div className="flex items-center gap-2 relative">
                <input
                  type="date"
                  value={localTask.scheduledDate || ''}
                  onChange={(e) => pushUpdate({ ...localTask, scheduledDate: e.target.value || undefined })}
                  className="absolute inset-0 opacity-0 cursor-pointer [color-scheme:dark]"
                />
                {(() => {
                  if (!localTask.scheduledDate) {
                    return <span className="text-[13px] cursor-pointer" style={{ color: '#555570' }}>Quando vai fazer?</span>;
                  }
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const [y, m, d] = localTask.scheduledDate.split('-').map(Number);
                  const sd = new Date(y, m - 1, d);
                  const isToday = sd.getTime() === today.getTime();
                  if (isToday) {
                    return <span className="text-[13px] font-medium" style={{ color: '#6C9CFC' }}>Hoje</span>;
                  }
                  const weekDays = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
                  const formatted = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')} (${weekDays[sd.getDay()]})`;
                  return <span className="text-[13px]" style={{ color: '#E8E8F0' }}>{formatted}</span>;
                })()}
              </div>
            </MetaRow>

            <MetaRow label="Entregar até">
              <div className="flex items-center gap-2 relative">
                <input
                  type="date"
                  value={localTask.dueDate || ''}
                  onChange={(e) => pushUpdate({ ...localTask, dueDate: e.target.value })}
                  className="absolute inset-0 opacity-0 cursor-pointer [color-scheme:dark]"
                />
                {(() => {
                  if (!localTask.dueDate) {
                    return <span className="text-[13px] cursor-pointer" style={{ color: '#555570' }}>Sem prazo</span>;
                  }
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const [y, m, d] = localTask.dueDate.split('-').map(Number);
                  const due = new Date(y, m - 1, d);
                  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  const weekDays = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
                  if (diffDays < 0) {
                    const label = Math.abs(diffDays) === 1 ? 'Ontem' : `${Math.abs(diffDays)}d atrás`;
                    return <span className="text-[13px] font-medium" style={{ color: 'hsl(var(--status-overdue))' }}>{label}</span>;
                  }
                  if (diffDays === 0) {
                    return <span className="text-[13px] font-medium" style={{ color: '#FFB86C' }}>Hoje</span>;
                  }
                  if (diffDays === 1) {
                    return <span className="text-[13px] font-medium" style={{ color: '#FFB86C' }}>Amanhã</span>;
                  }
                  const formatted = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')} (${weekDays[due.getDay()]})`;
                  return <span className="text-[13px]" style={{ color: '#E8E8F0' }}>{formatted}</span>;
                })()}
              </div>
            </MetaRow>

            <MetaRow label="Seção">
              <select
                value={localTask.section}
                onChange={(e) => pushUpdate({ ...localTask, section: e.target.value })}
                className="h-8 w-full bg-transparent text-[13px] border-none focus:outline-none appearance-none cursor-pointer [color-scheme:dark]"
                style={{ color: '#E8E8F0' }}
              >
                {projectSections.map(s => (
                  <option key={s.id} value={s.id} style={{ background: '#1A1A28' }}>{s.title}</option>
                ))}
              </select>
            </MetaRow>

            <MetaRow label="Serviço">
              <select
                value={localTask.serviceTagId || ''}
                onChange={(e) => pushUpdate({ ...localTask, serviceTagId: e.target.value || undefined })}
                className="h-8 w-full bg-transparent text-[13px] border-none focus:outline-none appearance-none cursor-pointer [color-scheme:dark]"
                style={{ color: localTask.serviceTagId ? '#E8E8F0' : '#555570' }}
              >
                <option value="" style={{ background: '#1A1A28' }}>Nenhum</option>
                {serviceTags.map(tag => (
                  <option key={tag.id} value={tag.id} style={{ background: '#1A1A28' }}>{tag.name}</option>
                ))}
              </select>
            </MetaRow>

            <MetaRow label="Repetir">
              <RecurrencePicker
                recurrenceType={localTask.recurrenceType || null}
                recurrenceConfig={localTask.recurrenceConfig}
                onChange={(type, config) => pushUpdate({ ...localTask, recurrenceType: type, recurrenceConfig: config })}
              />
            </MetaRow>
          </div>

          {/* 6. Collapsible tabs: Anexos | Atividade */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
            <div className="flex items-center gap-4 mb-3">
              <button
                onClick={() => setActiveTab(activeTab === 'attachments' ? null : 'attachments')}
                className="text-[12px] transition-colors flex items-center gap-1"
                style={{
                  color: activeTab === 'attachments' ? '#E8E8F0' : '#555570',
                  fontWeight: activeTab === 'attachments' ? 500 : 400,
                }}
                onMouseEnter={e => { if (activeTab !== 'attachments') e.currentTarget.style.color = '#8888A0'; }}
                onMouseLeave={e => { if (activeTab !== 'attachments') e.currentTarget.style.color = '#555570'; }}
              >
                <Paperclip className="w-3 h-3" />
                Anexos{taskAttachments.length > 0 ? ` (${taskAttachments.length})` : ''}
              </button>
              <button
                onClick={() => setActiveTab(activeTab === 'activity' ? null : 'activity')}
                className="text-[12px] transition-colors"
                style={{
                  color: activeTab === 'activity' ? '#E8E8F0' : '#555570',
                  fontWeight: activeTab === 'activity' ? 500 : 400,
                }}
                onMouseEnter={e => { if (activeTab !== 'activity') e.currentTarget.style.color = '#8888A0'; }}
                onMouseLeave={e => { if (activeTab !== 'activity') e.currentTarget.style.color = '#555570'; }}
              >
                Atividade{taskComments.length > 0 ? ` (${taskComments.length})` : ''}
              </button>
            </div>

            {/* Attachments tab */}
            {activeTab === 'attachments' && (
              <div className="animate-fade-in">
                <div className="flex items-center justify-end mb-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile}
                    className="text-[12px] flex items-center gap-1 transition-colors"
                    style={{ color: '#8888A0' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#E8E8F0'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#8888A0'; }}
                  >
                    <Paperclip className="w-3 h-3" />
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
                {taskAttachments.length === 0 ? (
                  <p className="text-[12px]" style={{ color: '#555570' }}>Nenhum anexo</p>
                ) : (
                  <div className="space-y-1">
                    {taskAttachments.map(att => {
                      const isImage = att.contentType?.startsWith('image/');
                      const sizeKb = Math.round(att.fileSize / 1024);
                      const sizeLabel = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;
                      return (
                        <div key={att.id} className="group flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-nd-hover transition-colors">
                          {isImage ? <ImageIcon className="w-4 h-4 flex-shrink-0" style={{ color: '#8888A0' }} /> : <FileText className="w-4 h-4 flex-shrink-0" style={{ color: '#8888A0' }} />}
                          <div className="flex-1 min-w-0">
                            <a href={att.url} target="_blank" rel="noopener noreferrer"
                              className="text-[13px] truncate block transition-colors"
                              style={{ color: '#E8E8F0' }}
                              onMouseEnter={e => { e.currentTarget.style.color = '#6C9CFC'; }}
                              onMouseLeave={e => { e.currentTarget.style.color = '#E8E8F0'; }}
                            >{att.fileName}</a>
                            <span className="text-[11px]" style={{ color: '#555570' }}>{sizeLabel}</span>
                          </div>
                          <a href={att.url} download={att.fileName} target="_blank" rel="noopener noreferrer"
                            className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#8888A0' }}>
                            <Download className="w-3.5 h-3.5" />
                          </a>
                          {att.userId === currentUserId && (
                            <button onClick={() => onDeleteAttachment(att.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#8888A0' }}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Activity tab */}
            {activeTab === 'activity' && (
              <div className="animate-fade-in">
                <div className="space-y-0">
                  {taskComments.map((comment, idx) => (
                    <div key={comment.id}
                      className={`group py-3 ${idx < taskComments.length - 1 ? '' : ''}`}
                      style={{ borderBottom: idx < taskComments.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium" style={{ color: '#E8E8F0' }}>{comment.author}</span>
                        <span className="text-[12px]" style={{ color: '#555570' }}>{formatCommentDate(comment.date)}</span>
                        {comment.authorId === currentUserId && (
                          <button onClick={() => onDeleteComment(comment.id)}
                            className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#8888A0' }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-[14px] mt-1" style={{ color: '#E8E8F0', lineHeight: 1.6 }}>{comment.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky comment input */}
      <div className="flex-shrink-0 px-4 md:px-5 py-3" style={{ background: 'hsl(var(--bg-surface))', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
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
            className="w-full min-h-[36px] py-2 pl-3 pr-20 text-[14px] bg-transparent rounded-lg border focus:outline-none resize-none"
            style={{ color: '#E8E8F0', borderColor: 'rgba(255,255,255,0.06)', lineHeight: 1.5 }}
            onFocus={e => { e.currentTarget.style.borderColor = '#6C9CFC'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
          />
          {commentText.trim() && (
            <button onClick={handleAddComment}
              className="absolute right-3 bottom-2 px-3 py-1 text-[12px] font-medium rounded transition-opacity hover:opacity-90"
              style={{ background: '#6C9CFC', color: '#0F0F17' }}>
              Enviar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
