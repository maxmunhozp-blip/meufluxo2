import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { X, Trash2, Plus, GripVertical, ChevronRight, Check, Paperclip, Download, FileText, Image as ImageIcon, Circle, CircleDot, CircleCheckBig, Pencil, Bold, Highlighter, CalendarIcon, Sparkles, ImagePlus, BadgeCheck } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
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
  isPro?: boolean;
  onUpgrade?: () => void;
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
  onCreateServiceTag?: (name: string, icon: string) => Promise<void>;
  onRenameServiceTag?: (id: string, name: string) => Promise<void>;
  onChangeServiceTagIcon?: (id: string, icon: string) => Promise<void>;
  onDeleteServiceTag?: (id: string) => Promise<void>;
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

// Inline assignee picker
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
          <span style={{ color: 'var(--text-primary)' }}>{value}</span>
        ) : (
          <span style={{ color: 'var(--text-tertiary)' }}>Nenhum</span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-9 z-50 w-56 rounded-lg border overflow-hidden"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', boxShadow: 'var(--shadow-md)' }}
        >
          <div className="p-2">
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full h-8 px-2 text-[13px] bg-transparent rounded border focus:outline-none"
              style={{ color: 'var(--text-primary)', borderColor: 'var(--border-subtle)' }}
            />
          </div>
          <div className="max-h-40 overflow-y-auto">
            {value && (
              <button
                onClick={() => {
                  const matchedProfile = profiles.find(p => (p.fullName || '') === value);
                  if (matchedProfile) onRemoveProfile?.(matchedProfile.id);
                  onChange('');
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] hover:bg-nd-hover transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                <X className="w-3.5 h-3.5" />
                <span>Remover</span>
              </button>
            )}
            {filtered.length === 0 && (
              <p className="px-3 py-2 text-[12px]" style={{ color: 'var(--text-tertiary)' }}>Nenhum membro</p>
            )}
            {filtered.map(p => (
              <button
                key={p.id}
                onClick={() => { onChange(p.fullName || ''); onSelectProfile?.(p.id); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] hover:bg-nd-hover transition-colors"
                style={{ color: 'var(--text-primary)' }}
              >
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                  style={{ background: 'var(--accent-subtle)', color: 'var(--accent-blue)' }}>
                  {(p.fullName || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <span className="truncate flex-1">{p.fullName || 'Sem nome'}</span>
                {value === p.fullName && <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--accent-blue)' }} />}
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
      style={{ ...style, transition: `${style.transition || 'transform 200ms ease'}, background 120ms ease-out` }}
      className="group h-8 flex items-center gap-1 px-1 rounded-md cursor-pointer"
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
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
        <GripVertical className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
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
          style={{ color: 'var(--text-primary)', borderColor: 'var(--accent-blue)' }}
        />
      ) : (
        <span className={`flex-1 text-[13px] truncate ${
          subtask.status === 'done' ? 'opacity-50' : ''
        }`} style={{ color: subtask.status === 'done' ? 'var(--text-tertiary)' : 'var(--text-primary)', transition: 'color 200ms ease-out, opacity 200ms ease-out' }}>
          {subtask.name}
        </span>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: 'var(--text-secondary)' }}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// Metadata row
function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center" style={{ height: 32 }}>
      <span className="flex-shrink-0" style={{ width: 100, fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 400 }}>{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

// Inline service tag picker with CRUD
function ServiceTagPicker({
  value, tags, onChange, onCreateTag, onRenameTag, onDeleteTag,
}: {
  value?: string; tags: ServiceTag[]; onChange: (id: string | undefined) => void;
  onCreateTag?: (name: string, icon: string) => Promise<void>;
  onRenameTag?: (id: string, name: string) => Promise<void>;
  onDeleteTag?: (id: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const addRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLInputElement>(null);
  const selectedTag = tags.find(t => t.id === value);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) { setOpen(false); setAdding(false); setEditingId(null); }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleAdd = async () => {
    if (!newName.trim() || !onCreateTag) return;
    await onCreateTag(newName.trim(), 'tag');
    setNewName(''); setAdding(false);
  };

  const handleRename = async (id: string) => {
    if (editValue.trim() && onRenameTag) await onRenameTag(id, editValue.trim());
    setEditingId(null);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!onDeleteTag) return;
    await onDeleteTag(id);
    if (value === id) onChange(undefined);
  };

  return (
    <div ref={containerRef} className="relative">
      <button type="button" onClick={() => setOpen(!open)} className="h-8 w-full text-left text-[13px] bg-transparent focus:outline-none flex items-center cursor-pointer">
        {selectedTag ? (
          <span style={{ color: 'var(--text-primary)' }}>{selectedTag.name}</span>
        ) : (
          <span style={{ color: 'var(--text-tertiary)' }}>Nenhum</span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-9 z-50 w-64 rounded-lg border overflow-hidden"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', boxShadow: 'var(--shadow-md)' }}>
          <div className="max-h-56 overflow-y-auto py-1">
            <button onClick={() => { onChange(undefined); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[13px] hover:bg-nd-hover transition-colors"
              style={{ color: !value ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
              {!value && <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--accent-blue)' }} />}
              {value && <span className="w-3.5 flex-shrink-0" />}
              <span>Nenhum</span>
            </button>

            {tags.map(tag => {
              const TagIcon = getTagIcon(tag.icon);
              const isEditing = editingId === tag.id;
              return (
                <div key={tag.id} className="group flex items-center gap-1 px-3 py-1.5 hover:bg-nd-hover transition-colors">
                  {value === tag.id ? (
                    <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--accent-blue)' }} />
                  ) : (
                    <TagIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
                  )}
                  {isEditing ? (
                    <input ref={editRef} value={editValue} onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleRename(tag.id); if (e.key === 'Escape') setEditingId(null); }}
                      onBlur={() => handleRename(tag.id)} autoFocus
                      className="flex-1 h-6 px-1 text-[13px] bg-transparent rounded border focus:outline-none min-w-0"
                      style={{ color: 'var(--text-primary)', borderColor: 'var(--accent-blue)' }}
                      onClick={e => e.stopPropagation()} />
                  ) : (
                    <button onClick={() => { onChange(tag.id); setOpen(false); }}
                      className="flex-1 text-left text-[13px] truncate min-w-0"
                      style={{ color: 'var(--text-primary)' }}>{tag.name}</button>
                  )}
                  {onRenameTag && !isEditing && (
                    <button onClick={(e) => { e.stopPropagation(); setEditingId(tag.id); setEditValue(tag.name); }}
                      className="w-5 h-5 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: 'var(--text-secondary)' }}><Pencil className="w-3 h-3" /></button>
                  )}
                  {onDeleteTag && !isEditing && (
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(tag.id, tag.name); }}
                      className="w-5 h-5 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: 'var(--text-secondary)' }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'hsl(var(--status-overdue))'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}>
                      <Trash2 className="w-3 h-3" /></button>
                  )}
                </div>
              );
            })}
          </div>

          {onCreateTag && (
            <div style={{ borderTop: '1px solid var(--border-subtle)' }} className="p-2">
              {adding ? (
                <div className="flex items-center gap-2">
                  <input ref={addRef} value={newName} onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setAdding(false); setNewName(''); } }}
                    onBlur={() => { if (newName.trim()) handleAdd(); else setAdding(false); }}
                    autoFocus placeholder="Nome do tipo..."
                    className="flex-1 h-7 px-2 text-[13px] bg-transparent rounded border focus:outline-none"
                    style={{ color: 'var(--text-primary)', borderColor: 'var(--border-subtle)' }} />
                </div>
              ) : (
                <button onClick={() => { setAdding(true); setTimeout(() => addRef.current?.focus(), 0); }}
                  className="flex items-center gap-1 text-[12px] transition-colors w-full px-1 py-1"
                  style={{ color: 'var(--text-tertiary)' }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; }}>
                  <Plus className="w-3.5 h-3.5" /> Adicionar tipo
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Rich description editor
function RichDescription({ value, onChange, placeholder, onUploadImage, isPro = false }: { value: string; onChange: (html: string) => void; placeholder: string; onUploadImage?: (file: File) => Promise<string | null>; isPro?: boolean }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [formats, setFormats] = useState({ bold: false, italic: false, underline: false, strikethrough: false, highlight: false });
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [detectedUrls, setDetectedUrls] = useState<string[]>([]);

  useEffect(() => {
    if (!isFocused && editorRef.current) {
      const current = editorRef.current.innerHTML;
      if (current !== value) editorRef.current.innerHTML = value || '';
    }
  }, [value, isFocused]);

  const checkFormats = () => {
    const sel = window.getSelection();
    const isInHighlight = (() => {
      if (!sel || sel.rangeCount === 0) return false;
      let node: Node | null = sel.anchorNode;
      while (node && node !== editorRef.current) {
        if (node instanceof HTMLElement && node.classList.contains('highlight-marker')) return true;
        node = node.parentNode;
      }
      return false;
    })();
    setFormats({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strikethrough: document.queryCommandState('strikeThrough'),
      highlight: isInHighlight,
    });
  };

  const extractUrls = useCallback(() => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText || '';
    const urlRegex = /https?:\/\/[^\s<>]+/g;
    const found = text.match(urlRegex) || [];
    setDetectedUrls(prev => {
      if (prev.length === found.length && prev.every((u, i) => u === found[i])) return prev;
      return found;
    });
  }, []);

  const handleInput = () => { if (!editorRef.current) return; onChange(editorRef.current.innerHTML); checkFormats(); extractUrls(); };
  const execCmd = (cmd: string, val?: string) => (e: React.MouseEvent) => { e.preventDefault(); editorRef.current?.focus(); document.execCommand(cmd, false, val); checkFormats(); };


  const toggleHighlight = (e: React.MouseEvent) => {
    e.preventDefault(); editorRef.current?.focus();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    if (formats.highlight) {
      // Remove highlight: find parent .highlight-marker and unwrap it
      let node: Node | null = sel.anchorNode;
      while (node && node !== editorRef.current) {
        if (node instanceof HTMLElement && node.classList.contains('highlight-marker')) {
          const parent = node.parentNode;
          while (node.firstChild) parent?.insertBefore(node.firstChild, node);
          parent?.removeChild(node);
          handleInput();
          break;
        }
        node = node.parentNode;
      }
    } else {
      if (!sel.isCollapsed) {
        // Wrap selection in highlight span using insertHTML for better compatibility
        const range = sel.getRangeAt(0);
        const content = range.extractContents();
        const span = document.createElement('span');
        span.className = 'highlight-marker';
        span.appendChild(content);
        range.insertNode(span);
        // Move cursor after the span
        range.setStartAfter(span);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        handleInput();
      }
    }
    setTimeout(checkFormats, 0);
  };

  const insertList = (ordered: boolean) => (e: React.MouseEvent) => { e.preventDefault(); editorRef.current?.focus(); document.execCommand(ordered ? 'insertOrderedList' : 'insertUnorderedList'); handleInput(); };
  const insertCheckbox = (e: React.MouseEvent) => { e.preventDefault(); editorRef.current?.focus(); document.execCommand('insertHTML', false, '<div><input type="checkbox" style="margin-right:6px;vertical-align:middle;" /> </div>'); handleInput(); };
  const insertHR = (e: React.MouseEvent) => { e.preventDefault(); editorRef.current?.focus(); document.execCommand('insertHTML', false, '<hr style="border:none;border-top:1px solid var(--border-subtle);margin:8px 0;" />'); handleInput(); };
  const insertHeading = (e: React.MouseEvent) => { e.preventDefault(); editorRef.current?.focus(); document.execCommand('formatBlock', false, 'h3'); handleInput(); };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'h') {
      e.preventDefault();
      if (formats.highlight) {
        document.execCommand('backColor', false, 'transparent');
      } else {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          const span = document.createElement('span');
          span.className = 'highlight-marker';
          range.surroundContents(span);
          sel.removeAllRanges();
          sel.addRange(range);
          handleInput();
        }
      }
      setTimeout(checkFormats, 0);
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'X') { e.preventDefault(); document.execCommand('strikeThrough'); checkFormats(); return; }
    setTimeout(checkFormats, 0);
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items || !onUploadImage) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) { const url = await onUploadImage(file); if (url && editorRef.current) { document.execCommand('insertHTML', false, `<img src="${url}" class="desc-inline-img" />`); handleInput(); } }
        return;
      }
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length === 0 || !onUploadImage) return;
    e.preventDefault();
    for (const file of files) { const url = await onUploadImage(file); if (url && editorRef.current) { document.execCommand('insertHTML', false, `<img src="${url}" class="desc-inline-img" />`); handleInput(); } }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file || !onUploadImage) return; e.target.value = '';
    const url = await onUploadImage(file);
    if (url && editorRef.current) { editorRef.current.focus(); document.execCommand('insertHTML', false, `<img src="${url}" class="desc-inline-img" />`); handleInput(); }
  };

  const handleEditorClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG') setLightboxImg((target as HTMLImageElement).src);
    if (target.tagName === 'A') { e.preventDefault(); window.open((target as HTMLAnchorElement).href, '_blank'); }
  };

  const isEmpty = !value || value === '<br>' || value.replace(/<[^>]*>/g, '').trim() === '';

  const toolbarButtons = [
    { icon: Bold, active: formats.bold, action: execCmd('bold'), title: 'Negrito (Ctrl+B)' },
    { icon: Highlighter, active: formats.highlight, action: toggleHighlight, title: 'Destaque (Ctrl+Shift+H)' },
    ...(onUploadImage ? [{ icon: ImagePlus, active: false, action: (e: React.MouseEvent) => { e.preventDefault(); fileInputRef.current?.click(); }, title: 'Anexo' }] : []),
  ];

  const containerRef = useRef<HTMLDivElement>(null);

  const handleBlur = useCallback((e: React.FocusEvent) => {
    // Don't hide toolbar if focus moved to a toolbar button within the same container
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    if (relatedTarget && containerRef.current?.contains(relatedTarget)) return;
    setIsFocused(false);
  }, []);

  return (
    <div ref={containerRef} className="relative group">
      {isFocused && (
        <div className="flex items-center gap-0.5 mb-2 flex-wrap" style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '4px 6px' }}>
          {toolbarButtons.map((btn, i) => {
            if (!btn) return <div key={`sep-${i}`} className="w-px h-4 mx-1" style={{ background: 'var(--border-subtle)' }} />;
            const Icon = btn.icon;
            return (
              <button key={btn.title} onMouseDown={btn.action}
                className="w-7 h-7 flex items-center justify-center rounded-md transition-colors"
                style={{ color: btn.active ? 'var(--text-primary)' : 'var(--text-tertiary)', background: btn.active ? 'var(--bg-active)' : 'transparent' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = btn.active ? 'var(--bg-active)' : 'transparent'; e.currentTarget.style.color = btn.active ? 'var(--text-primary)' : 'var(--text-tertiary)'; }}
                title={btn.title}>
                <Icon className="w-3.5 h-3.5" />
              </button>
            );
          })}
        </div>
      )}

      {onUploadImage && <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />}

      <div ref={editorRef} contentEditable suppressContentEditableWarning onInput={handleInput}
        onFocus={() => { setIsFocused(true); checkFormats(); extractUrls(); }} onBlur={handleBlur}
        onKeyDown={handleKeyDown} onKeyUp={checkFormats} onMouseUp={checkFormats}
        onPaste={handlePaste} onDrop={handleDrop} onDragOver={e => e.preventDefault()} onClick={handleEditorClick}
        className="w-full min-h-[36px] bg-transparent border-none focus:outline-none"
        style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, padding: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }} />
      {isEmpty && !isFocused && (
        <div className="absolute top-0 left-0 pointer-events-none" style={{ fontSize: 14, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>{placeholder}</div>
      )}

      {isPro && detectedUrls.length > 0 && (
        <div className="mt-3 space-y-2">
          {detectedUrls.map((url, i) => (<LinkPreviewInline key={`${url}-${i}`} url={url} />))}
        </div>
      )}

      {lightboxImg && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: 'var(--overlay-bg)' }} onClick={() => setLightboxImg(null)}>
          <img src={lightboxImg} alt="" className="max-w-[90vw] max-h-[90vh] rounded-lg" />
        </div>
      )}
    </div>
  );
}

// Inline link preview
function LinkPreviewInline({ url }: { url: string }) {
  const [meta, setMeta] = useState<{ title?: string; description?: string; image?: string; domain?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const isYoutube = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/.test(url);
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  const ytId = ytMatch?.[1];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data } = await supabase.functions.invoke('fetch-og', { body: { url } });
        if (!cancelled && data) { setMeta({ title: data.title, description: data.description, image: data.image, domain: new URL(url).hostname.replace('www.', '') }); }
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [url]);

  if (isYoutube && ytId) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden transition-colors"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', maxWidth: 400 }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-blue)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}>
        <div className="relative" style={{ aspectRatio: '16/9' }}>
          <img src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--overlay-bg)' }}>
              <div className="w-0 h-0 ml-1" style={{ borderTop: '8px solid transparent', borderBottom: '8px solid transparent', borderLeft: '14px solid var(--text-primary)' }} />
            </div>
          </div>
        </div>
        <div className="px-3 py-2">
          <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{meta?.title || 'YouTube'}</p>
          <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>youtube.com</p>
        </div>
      </a>
    );
  }

  if (loading || !meta?.title) return null;

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 p-3 rounded-lg transition-colors"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', maxWidth: 400 }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-blue)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}>
      {meta.image && <img src={meta.image} alt="" className="w-[60px] h-[60px] rounded object-cover flex-shrink-0" />}
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{meta.title}</p>
        {meta.description && <p className="text-[12px] mt-0.5 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{meta.description}</p>}
        <p className="text-[11px] mt-1" style={{ color: 'var(--text-tertiary)' }}>{meta.domain}</p>
      </div>
    </a>
  );
}

// Attachments section — Apple-style thumbnail grid + file list
function AttachmentsSection({ attachments, uploadingFile, onUpload, onDelete }: {
  attachments: Attachment[];
  uploadingFile: boolean;
  onUpload: () => void;
  onDelete: (id: string) => void;
}) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const images = attachments.filter(a => a.contentType?.startsWith('image/'));
  const files = attachments.filter(a => !a.contentType?.startsWith('image/'));

  const getUrl = (att: Attachment) =>
    att.url || supabase.storage.from('task-attachments').getPublicUrl(att.filePath).data.publicUrl;

  const formatSize = (size: number) =>
    size < 1024 * 1024 ? `${Math.round(size / 1024)} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`;

  return (
    <div className="space-y-3 mb-4">
      {/* Image thumbnails — grid */}
      {images.length > 0 && (
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))' }}>
          {images.map(att => {
            const url = getUrl(att);
            return (
              <div key={att.id} className="group relative rounded-lg overflow-hidden cursor-pointer"
                style={{ aspectRatio: '1', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
                onClick={() => setLightboxUrl(url)}>
                <img src={url} alt={att.fileName} className="w-full h-full object-cover" loading="lazy" />
                {/* Hover overlay with actions */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-end justify-between p-1"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)' }}>
                  <a href={url} target="_blank" rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="w-5 h-5 flex items-center justify-center rounded"
                    style={{ color: 'rgba(255,255,255,0.9)' }}>
                    <Download className="w-3 h-3" />
                  </a>
                  <button onClick={e => { e.stopPropagation(); onDelete(att.id); }}
                    className="w-5 h-5 flex items-center justify-center rounded"
                    style={{ color: 'rgba(255,255,255,0.9)' }}>
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* File attachments — compact list */}
      {files.length > 0 && (
        <div className="space-y-0.5">
          {files.map(att => (
            <div key={att.id} className="flex items-center gap-2 group py-1.5 px-2 rounded-md transition-colors"
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              <FileText className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
              <span className="text-[13px] truncate flex-1" style={{ color: 'var(--text-primary)' }}>{att.fileName}</span>
              <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>{formatSize(att.fileSize)}</span>
              <a href={getUrl(att)} target="_blank" rel="noopener noreferrer"
                className="w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: 'var(--text-secondary)' }}>
                <Download className="w-3 h-3" />
              </a>
              <button onClick={() => onDelete(att.id)}
                className="w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'hsl(var(--status-overdue))'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}>
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add button */}
      <button onClick={onUpload}
        className="flex items-center gap-1 text-[12px] transition-colors px-2 py-1.5"
        style={{ color: 'var(--text-tertiary)' }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; }}>
        <Plus className="w-3 h-3" /> {uploadingFile ? 'Enviando...' : 'Adicionar anexo'}
      </button>

      {/* Lightbox */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center cursor-pointer"
          style={{ background: 'rgba(0,0,0,0.8)' }}
          onClick={() => setLightboxUrl(null)}>
          <img src={lightboxUrl} alt="" className="max-w-[90vw] max-h-[90vh] rounded-lg" style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }} />
        </div>
      )}
    </div>
  );
}

// Inline date picker
function DatePickerInline({ value, onChange, placeholder, clearLabel, showRelative }: {
  value?: string; onChange: (val: string | undefined) => void; placeholder: string; clearLabel?: string; showRelative?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selectedDate = value ? (() => { const [y, m, d] = value.split('-').map(Number); return new Date(y, m - 1, d); })() : undefined;

  const handleSelect = (date: Date | undefined) => {
    if (!date) { onChange(undefined); setOpen(false); return; }
    const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, '0'); const d = String(date.getDate()).padStart(2, '0');
    onChange(`${y}-${m}-${d}`); setOpen(false);
  };

  const renderLabel = () => {
    if (!value) return <span className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>{placeholder}</span>;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [y, m, d] = value.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const weekDays = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
    const diffDays = Math.ceil((dt.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (showRelative) {
      if (diffDays < 0) { const label = Math.abs(diffDays) === 1 ? 'Ontem' : `${Math.abs(diffDays)}d atrás`; return <span className="text-[13px] font-medium" style={{ color: 'hsl(var(--status-overdue))' }}>{label}</span>; }
      if (diffDays === 0) return <span className="text-[13px] font-medium" style={{ color: 'var(--warning)' }}>Hoje</span>;
      if (diffDays === 1) return <span className="text-[13px] font-medium" style={{ color: 'var(--warning)' }}>Amanhã</span>;
    } else {
      if (diffDays === 0) return <span className="text-[13px] font-medium" style={{ color: 'var(--accent-blue)' }}>Hoje</span>;
    }
    const formatted = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')} (${weekDays[dt.getDay()]})`;
    return <span className="text-[13px]" style={{ color: 'var(--text-primary)' }}>{formatted}</span>;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="h-8 w-full text-left bg-transparent focus:outline-none cursor-pointer flex items-center">{renderLabel()}</button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" side="bottom" sideOffset={4}
        style={{ background: 'hsl(var(--bg-surface-hsl))', borderColor: 'var(--border-subtle)', zIndex: 60 }}>
        <Calendar mode="single" selected={selectedDate} onSelect={handleSelect} initialFocus className={cn("p-3 pointer-events-auto")} locale={ptBR} />
        {value && (
          <div className="px-3 pb-3 flex justify-between">
            <button onClick={() => { onChange(undefined); setOpen(false); }}
              className="text-[12px] transition-colors" style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'hsl(var(--status-overdue))'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}>{clearLabel || 'Limpar'}</button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}


export function TaskDetailPanel({ task, sections, profiles, comments: allComments, attachments, serviceTags = [], currentUserId, parentTaskName, isPro = true, onUpgrade, onClose, onUpdateTask, onAddMember, onRemoveMember, onAddComment, onDeleteComment, onAddSubtask, onUpdateSubtask, onDeleteSubtask, onReorderSubtasks, onNavigateToParent, onSelectSubtask, onUploadAttachment, onDeleteAttachment, onCreateServiceTag, onRenameServiceTag, onChangeServiceTagIcon, onDeleteServiceTag }: TaskDetailPanelProps) {
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

  useEffect(() => { setLocalTask(task); setCommentText(''); setAddingSubtask(false); setNewSubtaskName(''); }, [task.id]);
  useEffect(() => { setLocalTask(prev => ({ ...prev, subtasks: task.subtasks, members: task.members })); }, [task.subtasks, task.members]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestTaskRef = useRef<Task>(localTask);

  const pushUpdate = useCallback((updated: Task) => { setLocalTask(updated); latestTaskRef.current = updated; onUpdateTask(updated); }, [onUpdateTask]);
  const pushUpdateDebounced = useCallback((updated: Task) => {
    setLocalTask(updated); latestTaskRef.current = updated;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { onUpdateTask(latestTaskRef.current); debounceRef.current = null; }, 500);
  }, [onUpdateTask]);

  useEffect(() => { return () => { if (debounceRef.current) { clearTimeout(debounceRef.current); onUpdateTask(latestTaskRef.current); } }; }, [onUpdateTask]);
  useEffect(() => { const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler); }, [onClose]);

  const autoResize = (el: HTMLTextAreaElement | null) => { if (!el) return; el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; };
  useEffect(() => { autoResize(titleRef.current); }, [localTask.name]);
  useEffect(() => { autoResize(descRef.current); }, [localTask.description]);

  const cycleStatus = () => {
    const next: TaskStatus = localTask.status === 'pending' ? 'in_progress' : localTask.status === 'in_progress' ? 'done' : 'pending';
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

  const updateSubtaskStatus = (subId: string, status: TaskStatus) => { setLocalTask(prev => ({ ...prev, subtasks: (prev.subtasks || []).map(s => s.id === subId ? { ...s, status } : s) })); onUpdateSubtask(subId, { status }); };
  const updateSubtaskName = (subId: string, name: string) => { setLocalTask(prev => ({ ...prev, subtasks: (prev.subtasks || []).map(s => s.id === subId ? { ...s, name } : s) })); onUpdateSubtask(subId, { name }); };
  const deleteSubtask = (subId: string) => { setLocalTask(prev => ({ ...prev, subtasks: (prev.subtasks || []).filter(s => s.id !== subId) })); onDeleteSubtask(localTask.id, subId); };
  const addSubtask = () => { if (!newSubtaskName.trim()) return; onAddSubtask(localTask.id, newSubtaskName.trim()); setNewSubtaskName(''); setAddingSubtask(false); };

  const taskComments = allComments.filter(c => c.taskId === localTask.id);
  const taskAttachments = attachments.filter(a => a.taskId === localTask.id);
  const projectSections = sections.filter(s => s.projectId === localTask.projectId);

  const handleAddComment = () => { if (!commentText.trim()) return; onAddComment(localTask.id, commentText.trim()); setCommentText(''); };

  return (
    <div
      className="fixed right-0 top-0 h-screen z-50 flex flex-col animate-slide-in-right w-full md:w-full inset-0 md:inset-auto md:relative md:right-auto md:top-auto"
      style={{ background: 'var(--bg-surface)', borderLeft: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-lg)' }}>
      {/* Top bar */}
      <div className="h-11 flex items-center justify-between px-4 md:px-5 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        {(() => {
          const si = statusIcons[localTask.status]; const Icon = si.icon;
          return (
            <button onClick={cycleStatus} title={si.label} className="w-7 h-7 flex items-center justify-center rounded-md transition-colors" style={{ color: si.color }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              <Icon className="w-[18px] h-[18px]" />
            </button>
          );
        })()}
        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md transition-colors" style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}>
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Breadcrumb */}
      {localTask.parentTaskId && parentTaskName && (
        <div className="px-4 md:px-5 pt-3 pb-1 flex items-center gap-1 text-[12px]">
          <button onClick={onNavigateToParent} className="truncate max-w-[200px] transition-colors" style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent-blue)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}>{parentTaskName}</button>
          <ChevronRight className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
          <span style={{ color: 'var(--text-primary)' }} className="truncate">{localTask.name || 'Subtarefa'}</span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 md:px-5 pt-5 pb-20">
          {/* Title */}
          <textarea ref={titleRef} value={localTask.name}
            onChange={(e) => { pushUpdateDebounced({ ...localTask, name: e.target.value }); autoResize(e.target); }}
            placeholder="Nome da tarefa..." rows={1}
            className="w-full bg-transparent border-none focus:outline-none resize-none overflow-hidden mb-2"
            style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4, padding: 0 }} />

          {/* Completion badge — quiet proof of accomplishment */}
          {localTask.status === 'done' && (() => {
            const completedDate = localTask.completedAt ? new Date(localTask.completedAt) : null;
            if (!completedDate) return null;
            const day = String(completedDate.getDate()).padStart(2, '0');
            const month = String(completedDate.getMonth() + 1).padStart(2, '0');
            const year = completedDate.getFullYear();
            const weekdays = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
            const weekday = weekdays[completedDate.getDay()];
            return (
              <div className="flex items-center gap-1.5 mb-3 select-none" style={{ opacity: 0.85 }}>
                <BadgeCheck className="w-[14px] h-[14px] flex-shrink-0" style={{ color: 'hsl(var(--status-done))' }} />
                <span style={{ fontSize: 12, fontWeight: 500, color: 'hsl(var(--status-done))', letterSpacing: '0.01em' }}>
                  Concluída em {day}/{month}/{year}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 400 }}>
                  · {weekday}
                </span>
              </div>
            );
          })()}

          {/* Description */}
          <div className="mb-5">
            <RichDescription value={localTask.description || ''} onChange={(html) => pushUpdateDebounced({ ...localTask, description: html })}
              placeholder="Adicione detalhes, links ou imagens..." isPro={isPro}
              onUploadImage={isPro ? async (file: File) => {
                const ext = file.name.split('.').pop(); const path = `${currentUserId}/${crypto.randomUUID()}.${ext}`;
                const { error } = await supabase.storage.from('task-attachments').upload(path, file);
                if (error) return null; const { data: urlData } = supabase.storage.from('task-attachments').getPublicUrl(path); return urlData.publicUrl;
              } : undefined} />
          </div>

          {/* Subtasks */}
          {(subtasks.length > 0 || addingSubtask) && (
            <div className="mb-5">
              {totalSubCount > 0 && (
                <div className="flex items-center justify-between mb-2">
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 400 }}>Subtarefas</span>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{doneSubCount}/{totalSubCount}</span>
                </div>
              )}
              <DndContext sensors={subtaskSensors} collisionDetection={closestCenter} onDragEnd={handleSubtaskDragEnd}>
                <SortableContext items={subtasks.map(s => s.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-0">
                    {subtasks.map((sub) => (
                      <SortableSubtaskRow key={sub.id} subtask={sub}
                        onStatusChange={(s) => updateSubtaskStatus(sub.id, s)}
                        onNameChange={(name) => updateSubtaskName(sub.id, name)}
                        onDelete={() => deleteSubtask(sub.id)} onSelect={onSelectSubtask} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}

          {addingSubtask ? (
            <div className="flex items-center gap-2 mb-5 px-1">
              <div className="w-4 h-4" />
              <input ref={newSubRef} value={newSubtaskName} onChange={(e) => setNewSubtaskName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addSubtask(); if (e.key === 'Escape') { setAddingSubtask(false); setNewSubtaskName(''); } }}
                onBlur={() => { if (newSubtaskName.trim()) addSubtask(); else setAddingSubtask(false); }}
                autoFocus placeholder="Nome da subtarefa..."
                className="flex-1 h-7 text-[13px] bg-transparent border-none focus:outline-none" style={{ color: 'var(--text-primary)' }} />
            </div>
          ) : (
            <button onClick={() => { setAddingSubtask(true); setTimeout(() => newSubRef.current?.focus(), 0); }}
              className="mb-5 text-[13px] flex items-center gap-1 transition-colors" style={{ color: 'var(--text-tertiary)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; }}>
              <Plus className="w-3.5 h-3.5" /> Adicionar subtarefa
            </button>
          )}

          {/* Separator */}
          <div style={{ height: 1, background: 'var(--border-subtle)', marginBottom: 16 }} />

          {/* Metadata */}
          <div className="mb-5">
            <MetaRow label="Responsável">
              <AssigneePicker value={localTask.assignee || ''} profiles={profiles}
                onChange={(name) => pushUpdateDebounced({ ...localTask, assignee: name })}
                onSelectProfile={(userId) => { const alreadyMember = (localTask.members || []).some(m => m.userId === userId); if (!alreadyMember) onAddMember(localTask.id, userId); }}
                onRemoveProfile={(userId) => { onRemoveMember(localTask.id, userId); }} />
            </MetaRow>
            <MetaRow label="Fazer em">
              <DatePickerInline value={localTask.scheduledDate} onChange={(val) => pushUpdate({ ...localTask, scheduledDate: val })} placeholder="Quando vai fazer?" clearLabel="Limpar" />
            </MetaRow>
            <MetaRow label="Entregar até">
              <DatePickerInline value={localTask.dueDate} onChange={(val) => pushUpdate({ ...localTask, dueDate: val })} placeholder="Sem prazo" clearLabel="Limpar" showRelative />
            </MetaRow>
            <MetaRow label="Seção">
              <select value={localTask.section} onChange={(e) => pushUpdate({ ...localTask, section: e.target.value })}
                className="h-8 w-full bg-transparent text-[13px] border-none focus:outline-none appearance-none cursor-pointer [color-scheme:dark]"
                style={{ color: 'var(--text-primary)' }}>
                {projectSections.map(s => (<option key={s.id} value={s.id} style={{ background: 'var(--bg-surface)' }}>{s.title}</option>))}
              </select>
            </MetaRow>
            <MetaRow label="Tipo de trabalho">
              <ServiceTagPicker value={localTask.serviceTagId} tags={serviceTags}
                onChange={(id) => pushUpdate({ ...localTask, serviceTagId: id })}
                onCreateTag={onCreateServiceTag} onRenameTag={onRenameServiceTag} onDeleteTag={onDeleteServiceTag} />
            </MetaRow>
            <MetaRow label="Repetir">
              {isPro ? (
                <RecurrencePicker recurrenceType={localTask.recurrenceType || null} recurrenceConfig={localTask.recurrenceConfig}
                  onChange={(type, config) => pushUpdate({ ...localTask, recurrenceType: type, recurrenceConfig: config })} />
              ) : (
                <button onClick={onUpgrade} className="h-8 px-2 text-[12px] rounded flex items-center gap-1.5 transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}>
                  <span>Não repete</span>
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide" style={{ border: '1px solid var(--warning-bg)', background: 'var(--warning-bg)', color: 'var(--warning)' }}>
                    <Sparkles className="w-2.5 h-2.5" /> PRO
                  </span>
                </button>
              )}
            </MetaRow>
          </div>

          {/* Tabs: Anexos | Atividade */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
            <div className="flex items-center gap-4 mb-3">
              <button onClick={() => setActiveTab(activeTab === 'attachments' ? null : 'attachments')}
                className="text-[12px] transition-colors flex items-center gap-1"
                style={{ color: activeTab === 'attachments' ? 'var(--text-primary)' : 'var(--text-tertiary)', fontWeight: activeTab === 'attachments' ? 500 : 400 }}
                onMouseEnter={e => { if (activeTab !== 'attachments') e.currentTarget.style.color = 'var(--text-secondary)'; }}
                onMouseLeave={e => { if (activeTab !== 'attachments') e.currentTarget.style.color = 'var(--text-tertiary)'; }}>
                <Paperclip className="w-3 h-3" /> Anexos{taskAttachments.length > 0 ? ` (${taskAttachments.length})` : ''}
              </button>
              <button onClick={() => setActiveTab(activeTab === 'activity' ? null : 'activity')}
                className="text-[12px] transition-colors flex items-center gap-1"
                style={{ color: activeTab === 'activity' ? 'var(--text-primary)' : 'var(--text-tertiary)', fontWeight: activeTab === 'activity' ? 500 : 400 }}
                onMouseEnter={e => { if (activeTab !== 'activity') e.currentTarget.style.color = 'var(--text-secondary)'; }}
                onMouseLeave={e => { if (activeTab !== 'activity') e.currentTarget.style.color = 'var(--text-tertiary)'; }}>
                Atividade{taskComments.length > 0 ? ` (${taskComments.length})` : ''}
              </button>
            </div>

            {/* Attachments */}
            {activeTab === 'attachments' && (
              <AttachmentsSection
                attachments={taskAttachments}
                uploadingFile={uploadingFile}
                onUpload={() => fileInputRef.current?.click()}
                onDelete={onDeleteAttachment}
              />
            )}
            <input ref={fileInputRef} type="file" className="hidden" onChange={async (e) => {
              const file = e.target.files?.[0]; if (!file) return; e.target.value = '';
              setUploadingFile(true); await onUploadAttachment(localTask.id, file); setUploadingFile(false);
            }} />

            {/* Comments */}
            {activeTab === 'activity' && (
              <div className="space-y-3 mb-4">
                {taskComments.map(c => {
                  const profile = profiles.find(p => p.id === c.authorId);
                  return (
                    <div key={c.id} className="group">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                          style={{ background: 'var(--accent-subtle)', color: 'var(--accent-blue)' }}>
                          {(profile?.fullName || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <span className="text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>{profile?.fullName || 'Usuário'}</span>
                        <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{formatCommentDate(c.date)}</span>
                        {c.authorId === currentUserId && (
                          <button onClick={() => onDeleteComment(c.id)}
                            className="ml-auto w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-secondary)' }}
                            onMouseEnter={e => { e.currentTarget.style.color = 'hsl(var(--status-overdue))'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}>
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <p className="text-[13px] pl-7" style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>{c.text}</p>
                    </div>
                  );
                })}

                <div className="flex gap-2 items-start">
                  <textarea ref={commentRef} value={commentText} onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                    placeholder="Adicionar comentário..."
                    className="flex-1 text-[13px] bg-transparent border rounded-lg px-3 py-2 focus:outline-none resize-none min-h-[36px]"
                    style={{ color: 'var(--text-primary)', borderColor: 'var(--border-subtle)' }}
                    rows={1} />
                  {commentText.trim() && (
                    <button onClick={handleAddComment} className="h-9 px-3 rounded-lg text-[12px] font-medium"
                      style={{ background: 'var(--accent-blue)', color: 'var(--btn-text)' }}>Enviar</button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
