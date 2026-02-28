import { useState, useRef, useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverEvent, DragStartEvent, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { GripVertical, MessageSquare, Play, Repeat, Plus } from 'lucide-react';
import { Task, TaskStatus, Subtask, Section } from '@/types/task';
import { StatusCheckbox } from './StatusCheckbox';
import { ContextMenu } from './ContextMenu';
import { SortableSubtaskRow } from './SortableSubtaskRow';
import { DropIndicatorLine } from './DropIndicatorLine';

interface SortableTaskRowProps {
  task: Task;
  isSelected: boolean;
  isFocused: boolean;
  selectedSubtaskId?: string;
  isDragSource?: boolean;
  dropIndicator?: 'top' | 'bottom' | null;
  projectColor?: string;
  onSelect: (task: Task) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onSubtaskStatusChange?: (taskId: string, subtaskId: string, status: TaskStatus) => void;
  onSelectSubtask?: (subtask: Subtask) => void;
  onDeleteTask?: (taskId: string) => void;
  onDuplicateTask?: (taskId: string) => void;
  onReorderSubtasks?: (taskId: string, subtaskIds: string[]) => void;
  onRenameTask?: (taskId: string, name: string) => void;
  onRenameSubtask?: (subtaskId: string, name: string) => void;
  sections?: Section[];
  onMoveToSection?: (taskId: string, sectionId: string) => void;
  onAddSubtask?: (parentTaskId: string, name: string) => Promise<void>;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.getTime() === yesterday.getTime()) return 'ontem';
  if (date.getTime() === today.getTime()) return 'hoje';
  const day = date.getDate();
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${day} ${months[date.getMonth()]}`;
}

function isOverdue(dateStr?: string, status?: TaskStatus): boolean {
  if (!dateStr || status === 'done') return false;
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

// Overlay component for dragged subtask (lightweight ghost)
function SubtaskDragOverlay({ subtask }: { subtask: Subtask }) {
  const subDone = subtask.status === 'done';
  return (
    <div
      className="h-9 border border-primary/30 rounded-md pl-6 md:pl-8 pr-4 md:pr-6 flex items-center gap-2 shadow-lg"
      style={{ background: 'hsl(var(--bg-surface))', opacity: 0.95 }}
    >
      <StatusCheckbox status={subtask.status} onChange={() => {}} />
      <span className={`text-[13px] truncate flex-1 transition-[color,opacity] duration-200 ease-out ${subDone ? 'text-nd-text-completed opacity-70' : 'text-nd-text'}`}>
        {subtask.name}
      </span>
    </div>
  );
}

function SubtaskDndWrapper({ subtasks, taskId, selectedSubtaskId, onSelectSubtask, onSubtaskStatusChange, onReorderSubtasks, onRenameSubtask }: {
  subtasks: Subtask[];
  taskId: string;
  selectedSubtaskId?: string;
  onSelectSubtask?: (subtask: Subtask) => void;
  onSubtaskStatusChange?: (taskId: string, subtaskId: string, status: TaskStatus) => void;
  onReorderSubtasks?: (taskId: string, subtaskIds: string[]) => void;
  onRenameSubtask?: (subtaskId: string, name: string) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const subtaskIds = subtasks.map(s => s.id);
  const [activeSubtaskId, setActiveSubtaskId] = useState<string | null>(null);
  const [overSubtaskId, setOverSubtaskId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'top' | 'bottom' | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveSubtaskId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      setOverSubtaskId(null);
      setDropPosition(null);
      return;
    }
    const activeIdx = subtaskIds.indexOf(active.id as string);
    const overIdx = subtaskIds.indexOf(over.id as string);
    setOverSubtaskId(over.id as string);
    setDropPosition(activeIdx < overIdx ? 'bottom' : 'top');
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveSubtaskId(null);
    setOverSubtaskId(null);
    setDropPosition(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = subtaskIds.indexOf(active.id as string);
    const newIdx = subtaskIds.indexOf(over.id as string);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(subtaskIds, oldIdx, newIdx);
    onReorderSubtasks?.(taskId, reordered);
  };

  const activeSubtask = activeSubtaskId ? subtasks.find(s => s.id === activeSubtaskId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={subtaskIds} strategy={verticalListSortingStrategy}>
        {subtasks.map((sub) => (
          <SortableSubtaskRow
            key={sub.id}
            subtask={sub}
            parentTaskId={taskId}
            isSelected={selectedSubtaskId === sub.id}
            isDragging={activeSubtaskId === sub.id}
            dropIndicator={overSubtaskId === sub.id ? dropPosition : null}
            onSelect={onSelectSubtask}
            onStatusChange={onSubtaskStatusChange}
            onRename={onRenameSubtask}
          />
        ))}
      </SortableContext>
      <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
        {activeSubtask ? <SubtaskDragOverlay subtask={activeSubtask} /> : null}
      </DragOverlay>
    </DndContext>
  );
}


// Inline subtask creation input
function InlineSubtaskInput({ taskId, onAddSubtask }: { taskId: string; onAddSubtask?: (parentTaskId: string, name: string) => Promise<void> }) {
  const [isActive, setIsActive] = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const open = () => {
    setIsActive(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const submit = async () => {
    const trimmed = value.trim();
    if (!trimmed || !onAddSubtask) return;
    setValue('');
    await onAddSubtask(taskId, trimmed);
    // keep open for batch creation, re-focus
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  if (!isActive) {
    return (
      <button
        onClick={open}
        className="h-7 w-full pl-6 md:pl-8 pr-4 flex items-center gap-1.5 transition-colors group/add"
        style={{ color: '#555570' }}
        onMouseEnter={e => { e.currentTarget.style.color = '#8888A0'; }}
        onMouseLeave={e => { e.currentTarget.style.color = '#555570'; }}
      >
        <Plus className="w-3 h-3" />
        <span className="text-[12px]">Adicionar subtarefa...</span>
      </button>
    );
  }

  return (
    <div className="pl-6 md:pl-8 pr-4 py-1">
      <input
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); submit(); }
          if (e.key === 'Escape') { setIsActive(false); setValue(''); }
        }}
        onBlur={() => { if (!value.trim()) setIsActive(false); }}
        placeholder="Nome da subtarefa..."
        className="w-full h-8 px-2.5 text-[13px] rounded-md border focus:outline-none"
        style={{
          background: '#1E1E30',
          borderColor: '#333350',
          color: '#E8E8F0',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = '#6C9CFC'; }}
        onBlurCapture={e => { e.currentTarget.style.borderColor = '#333350'; }}
      />
    </div>
  );
}

export function SortableTaskRow({ task, isSelected, isFocused, selectedSubtaskId, isDragSource, dropIndicator, projectColor, onSelect, onStatusChange, onSubtaskStatusChange, onSelectSubtask, onDeleteTask, onDuplicateTask, onReorderSubtasks, onRenameTask, onRenameSubtask, sections, onMoveToSection, onAddSubtask }: SortableTaskRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(task.name);
  const renameRef = useRef<HTMLInputElement>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const {
    attributes,
    listeners,
    setNodeRef,
  } = useSortable({ id: task.id, data: { type: 'task', task } });

  const isDone = task.status === 'done';
  const overdue = isOverdue(task.dueDate, task.status);
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const startRename = () => {
    setRenameValue(task.name);
    setIsRenaming(true);
    setTimeout(() => renameRef.current?.focus(), 0);
  };

  const confirmRename = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== task.name) {
      onRenameTask?.(task.id, trimmed);
    }
    setIsRenaming(false);
  };

  return (
    <div ref={setNodeRef} data-task-id={task.id} className="relative">
      {dropIndicator && <DropIndicatorLine position={dropIndicator} />}
      <div className="flex">
        <div
          className={`flex-1 min-w-0 group min-h-[44px] border-b cursor-pointer transition-all duration-150 relative ${
            isDragSource ? 'opacity-40' : ''
          }`}
          style={{
            opacity: isDragSource ? 0.4 : isDone ? 0.6 : undefined,
            background: isSelected ? 'rgba(255,255,255,0.06)' : undefined,
          }}
          onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
          onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
          
          onClick={() => {
            if (isRenaming) return;
            if (clickTimer.current) clearTimeout(clickTimer.current);
            clickTimer.current = setTimeout(() => { onSelect(task); clickTimer.current = null; }, 250);
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            if (clickTimer.current) { clearTimeout(clickTimer.current); clickTimer.current = null; }
            startRename();
          }}
          onContextMenu={handleContextMenu}
        >
          {/* Drag handle */}
          <div
            {...attributes}
            {...listeners}
            className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity z-10 hidden md:block"
          >
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </div>

          <div className="h-full px-4 md:px-6 flex items-center">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {hasSubtasks ? (
                <button
                  onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                  className="w-5 h-5 flex items-center justify-center rounded transition-colors duration-100 flex-shrink-0"
                  style={{ background: 'transparent' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <Play
                    className={`w-3 h-3 text-muted-foreground fill-muted-foreground transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}
                  />
                </button>
              ) : (
                <span className="w-5 flex-shrink-0" />
              )}
              <StatusCheckbox
                status={task.status}
                onChange={(s) => onStatusChange(task.id, s)}
              />
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
                  className="flex-1 h-6 px-1 text-[14px] text-foreground bg-input rounded border border-primary focus:outline-none min-w-0"
                />
              ) : (
                <span className={`text-[14px] truncate flex-1 min-w-0 transition-[color,opacity] duration-200 ease-out ${isDone ? 'text-muted-foreground opacity-70' : 'text-foreground'}`}>
                  {task.name}
                </span>
              )}
              {task.recurrenceType && (
                <span title="Tarefa recorrente"><Repeat className="w-3 h-3 text-primary/60 flex-shrink-0" /></span>
              )}
              {task.members && task.members.length > 0 && (
                <div className="flex items-center -space-x-1.5 flex-shrink-0">
                  {task.members.slice(0, 3).map((m) => (
                    <div
                      key={m.userId}
                      title={m.fullName || ''}
                      className="w-5 h-5 rounded-full border border-background flex items-center justify-center text-[9px] font-medium bg-primary/20 text-primary overflow-hidden"
                    >
                      {m.avatarUrl ? (
                        <img src={m.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        (m.fullName || '?').charAt(0).toUpperCase()
                      )}
                    </div>
                  ))}
                  {task.members.length > 3 && (
                    <div className="w-5 h-5 rounded-full border border-background flex items-center justify-center text-[9px] font-medium bg-muted text-muted-foreground">
                      +{task.members.length - 3}
                    </div>
                  )}
                </div>
              )}
              {task.comments && task.comments.length > 0 && (
                <span className="flex items-center gap-1 flex-shrink-0">
                  <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[12px] text-muted-foreground">{task.comments.length}</span>
                </span>
              )}

              {/* Assignee — only if set */}
              {task.assignee && (
                <span className="text-[12px] truncate hidden md:block text-muted-foreground flex-shrink-0 max-w-[100px]">
                  {task.assignee}
                </span>
              )}

              {/* Due date — only if set */}
              {task.dueDate && (
                <span className={`text-[12px] hidden md:block flex-shrink-0 ${
                  isDone ? 'text-muted-foreground' : overdue ? 'font-medium' : 'text-muted-foreground'
                }`} style={overdue && !isDone ? { color: 'hsl(var(--status-overdue))' } : undefined}>
                  {formatDate(task.dueDate)}
                </span>
              )}

              {/* Rollover badge */}
              {task.rolloverCount && task.rolloverCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive flex-shrink-0" title={`Adiada ${task.rolloverCount}x`}>
                  ↻{task.rolloverCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {expanded && hasSubtasks && (
        <div className="relative ml-6 md:ml-8 border-l-2 border-nd-border-subtle mb-1 bg-nd-bg-subtask rounded-br-md">
          <SubtaskDndWrapper
            subtasks={task.subtasks!}
            taskId={task.id}
            selectedSubtaskId={selectedSubtaskId}
            onSelectSubtask={onSelectSubtask}
            onSubtaskStatusChange={onSubtaskStatusChange}
            onReorderSubtasks={onReorderSubtasks}
            onRenameSubtask={onRenameSubtask}
          />
          <InlineSubtaskInput taskId={task.id} onAddSubtask={onAddSubtask} />
        </div>
      )}
      {expanded && !hasSubtasks && (
        <div className="relative ml-6 md:ml-8 border-l-2 border-nd-border-subtle mb-1 bg-nd-bg-subtask rounded-br-md">
          <InlineSubtaskInput taskId={task.id} onAddSubtask={onAddSubtask} />
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          position={contextMenu}
          onClose={() => setContextMenu(null)}
          items={[
            {
              label: 'Duplicar tarefa',
              onClick: () => onDuplicateTask?.(task.id),
            },
            ...(sections && sections.filter(s => s.id !== task.section).length > 0 ? [{
              label: 'Mover para seção',
              children: sections.filter(s => s.id !== task.section).map(s => ({
                label: s.title,
                onClick: () => onMoveToSection?.(task.id, s.id),
              })),
            }] : []),
            {
              label: 'Excluir tarefa',
              danger: true,
              onClick: () => {
                if (window.confirm(`Excluir "${task.name || 'tarefa sem nome'}"?`)) {
                  onDeleteTask?.(task.id);
                }
              },
            },
          ]}
        />
      )}
    </div>
  );
}
